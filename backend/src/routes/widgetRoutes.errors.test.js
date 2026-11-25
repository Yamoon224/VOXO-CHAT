// Non-régression du gestionnaire d'erreurs local de widgetRoutes.
// Il lisait `error.status`, qui vaut 'fail'/'error' sur une AppError et non un
// code HTTP : toute erreur métier partait en 500 avec un message technique
// anglais au lieu du message français prévu.
jest.mock('../middleware/tenantMiddleware', () => ({
  extractTenantFromRequest: (req, _res, next) => {
    req.tenant = {
      id: req.headers['x-tenant-id'],
      name: 'Acme',
      isActive: true,
      settings: { chatbot: { options: { features: { attachments: true } } } },
    };
    next();
  },
}));
jest.mock('../controllers/chatController', () => ({
  sendMessage: jest.fn(),
  getConversationHistory: jest.fn(),
  endConversation: jest.fn(),
  submitMessageFeedback: jest.fn(),
}));
jest.mock('../services/openaiService', () => ({
  isAvailable: () => true,
  testConnection: jest.fn(),
  generateInitialSuggestions: jest.fn(),
}));
jest.mock('../services/widgetAttachmentService', () => ({ receive: jest.fn() }));
jest.mock('../services/planService', () => ({
  getPlan: jest.fn(async () => ({ allowVisitorAttachments: true })),
}));

const express = require('express');
const request = require('supertest');
const routes = require('./widgetRoutes');
const widgetAttachmentService = require('../services/widgetAttachmentService');
const { getConversationHistory } = require('../controllers/chatController');
const { AppError } = require('../middleware/errorMiddleware');

const TENANT = '7f8b6c7f-acda-4d24-b51c-165795cd1f84';
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64, 0x20)]);

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/widget', routes);
  return app;
};

describe('gestionnaire d’erreurs de widgetRoutes', () => {
  beforeEach(() => jest.clearAllMocks());

  test.each([
    [400, 'FILE_TOO_LARGE', 'Fichier trop volumineux. La taille maximale est de 10 Mo.'],
    [403, 'QUOTA_EXCEEDED', 'Quota de messages atteint.'],
    [503, 'STORAGE_NOT_CONFIGURED', "L'envoi de fichiers n'est pas disponible pour le moment."],
  ])('relaie une AppError %i sans la transformer en 500', async (statusCode, code, message) => {
    widgetAttachmentService.receive.mockRejectedValue(new AppError(message, statusCode, { code }));

    const response = await request(buildApp())
      .post('/api/widget/upload')
      .set('X-Tenant-ID', TENANT)
      .attach('file', PDF, 'contrat.pdf');

    // Sans le correctif : 500 et « Invalid status code: "fail" »
    expect(response.status).toBe(statusCode);
    expect(response.body).toMatchObject({ success: false, code, error: message });
  });

  test('une erreur inattendue reste un 500 générique, sans fuite de détail', async () => {
    widgetAttachmentService.receive.mockRejectedValue(new Error('ENOENT /etc/secret'));

    const response = await request(buildApp())
      .post('/api/widget/upload')
      .set('X-Tenant-ID', TENANT)
      .attach('file', PDF, 'contrat.pdf');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Une erreur est survenue');
    expect(JSON.stringify(response.body)).not.toContain('/etc/secret');
  });

  test('relaie une conversation absente sans la journaliser comme une erreur serveur', async () => {
    getConversationHistory.mockImplementation((_req, _res, next) => next(
      new AppError('Conversation introuvable.', 404, { code: 'CONVERSATION_NOT_FOUND' })
    ));
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(buildApp())
      .get('/api/widget/conversation/session-absente')
      .set('X-Tenant-ID', TENANT);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      code: 'CONVERSATION_NOT_FOUND',
      error: 'Conversation introuvable.',
    });
    expect(errorLog).not.toHaveBeenCalledWith('Widget Route Error:', expect.anything());
    errorLog.mockRestore();
  });
});
