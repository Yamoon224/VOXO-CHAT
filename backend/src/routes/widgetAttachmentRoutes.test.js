jest.mock('../services/widgetAttachmentService', () => ({
  receive: jest.fn(),
}));

jest.mock('../services/planService', () => ({
  getPlan: jest.fn(async () => ({ allowVisitorAttachments: true })),
}));

const express = require('express');
const request = require('supertest');
const buildRoutes = require('./widgetAttachmentRoutes');
const widgetAttachmentService = require('../services/widgetAttachmentService');
const { errorHandler, AppError } = require('../middleware/errorMiddleware');

const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64, 0x20)]);

/** Simule la résolution du tenant widget, seule garde en amont de la route. */
const tenantGuard = (settings) => (req, _res, next) => {
  req.tenant = { id: 'tenant-1', name: 'Acme', subscriptionPlan: 'free', settings };
  next();
};

const withAttachments = { chatbot: { options: { features: { attachments: true } } } };

const buildApp = (settings = withAttachments) => {
  const app = express();
  app.use('/api/widget', buildRoutes([tenantGuard(settings)]));
  app.use(errorHandler);
  return app;
};

describe('POST /api/widget/upload', () => {
  beforeEach(() => jest.clearAllMocks());

  test('accepte un PDF et renvoie les métadonnées publiques', async () => {
    widgetAttachmentService.receive.mockResolvedValue({
      toPublicJSON: () => ({
        id: 'att-1', name: 'contrat.pdf', mimeType: 'application/pdf',
        size: PDF.length, category: 'document',
      }),
    });

    const response = await request(buildApp())
      .post('/api/widget/upload')
      .attach('file', PDF, 'contrat.pdf');

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ id: 'att-1', category: 'document' });
    // La clé de stockage ne doit jamais franchir la frontière HTTP
    expect(JSON.stringify(response.body)).not.toContain('storageKey');
  });

  test('refuse un envoi quand la fonctionnalité est désactivée pour le tenant', async () => {
    const settings = { chatbot: { options: { features: { attachments: false } } } };

    const response = await request(buildApp(settings))
      .post('/api/widget/upload')
      .attach('file', PDF, 'contrat.pdf');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('ATTACHMENTS_DISABLED');
    expect(widgetAttachmentService.receive).not.toHaveBeenCalled();
  });

  test('refuse un format hors allowlist avant tout traitement', async () => {
    const response = await request(buildApp())
      .post('/api/widget/upload')
      .attach('file', Buffer.from('MZ\x90\x00'), 'virus.exe');

    expect(response.status).toBe(400);
    expect(widgetAttachmentService.receive).not.toHaveBeenCalled();
  });

  test('refuse une requête sans fichier', async () => {
    const response = await request(buildApp()).post('/api/widget/upload');

    expect(response.status).toBe(400);
    expect(widgetAttachmentService.receive).not.toHaveBeenCalled();
  });

  test('ne consomme aucun quota quand le tenant est à court de messages', async () => {
    widgetAttachmentService.receive.mockRejectedValue(
      new AppError('Quota de messages atteint.', 403, { code: 'QUOTA_EXCEEDED' })
    );

    const response = await request(buildApp())
      .post('/api/widget/upload')
      .attach('file', PDF, 'contrat.pdf');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('QUOTA_EXCEEDED');
  });
});
