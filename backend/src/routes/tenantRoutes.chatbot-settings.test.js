const express = require('express');
const request = require('supertest');

jest.mock('../services/openaiService', () => ({ validateOwnerSuggestions: jest.fn() }));
jest.mock('../services/tenantDeletionService', () => ({ deleteTenant: jest.fn() }));
// Ces tests portent sur les réglages du chatbot, pas sur les accès : on
// authentifie un propriétaire pour que le vrai requirePermission laisse passer.
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'owner-1', role: 'owner' };
    next();
  },
}));

const openaiService = require('../services/openaiService');
const tenantRoutes = require('./tenantRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

describe('PUT /api/tenant/chatbot-settings', () => {
  let app;
  let tenant;

  beforeEach(() => {
    jest.clearAllMocks();
    tenant = {
      id: 'tenant-1',
      settings: {
        chatbot: {
          name: 'Assistant',
          initialQuestions: ['Question existante ?'],
        },
      },
      update: jest.fn(async ({ settings }) => {
        tenant.settings = settings;
      }),
    };

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.tenant = tenant;
      next();
    });
    app.use('/api/tenant', tenantRoutes);
    app.use(errorHandler);
  });

  test('does not validate unchanged suggestions', async () => {
    const response = await request(app)
      .put('/api/tenant/chatbot-settings')
      .send({
        name: 'Assistant renommé',
        initialQuestions: ['Question existante ?'],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.warnings).toEqual([]);
    expect(openaiService.validateOwnerSuggestions).not.toHaveBeenCalled();
    expect(tenant.settings.chatbot.name).toBe('Assistant renommé');
  });

  test('saves changed suggestions and returns an advisory warning', async () => {
    openaiService.validateOwnerSuggestions.mockResolvedValue({
      isValid: false,
      reason: 'Contexte insuffisant pour répondre.',
    });

    const questions = ['Quels services proposez-vous ?'];
    const response = await request(app)
      .put('/api/tenant/chatbot-settings')
      .send({ initialQuestions: questions });

    expect(response.status).toBe(200);
    expect(openaiService.validateOwnerSuggestions).toHaveBeenCalledWith(questions, tenant.id);
    expect(response.body.data.warnings).toEqual([{
      code: 'INITIAL_QUESTIONS_NOT_COVERED',
      message: 'Contexte insuffisant pour répondre.',
    }]);
    expect(tenant.settings.chatbot.initialQuestions).toEqual(questions);
  });
});
