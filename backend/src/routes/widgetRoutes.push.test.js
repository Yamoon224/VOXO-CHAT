const express = require('express');
const request = require('supertest');

jest.mock('../services/mobilePushService', () => ({ registerDevice: jest.fn(), unregisterDevice: jest.fn() }));
jest.mock('../middleware/tenantMiddleware', () => ({
  extractTenantFromRequest: (req, res, next) => { req.tenant = { id: 'tenant-1', allowedAppIds: [], enforceAppIds: false }; next(); },
}));
jest.mock('../controllers/chatMessageController', () => ({ sendMessage: jest.fn() }));
jest.mock('../controllers/chatController', () => ({ getConversationHistory: jest.fn(), endConversation: jest.fn(), submitMessageFeedback: jest.fn() }));
jest.mock('../services/openaiService', () => ({}));
jest.mock('./widgetAttachmentRoutes', () => () => require('express').Router());
jest.mock('../controllers/brandingMediaController', () => ({ publicMedia: jest.fn() }));

const mobilePushService = require('../services/mobilePushService');
const widgetRoutes = require('./widgetRoutes');
const { errorHandler, AppError } = require('../middleware/errorMiddleware');

const TENANT = '3f1c2b4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b';

describe('widget push-token routes', () => {
  let app;
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/widget', widgetRoutes);
    app.use(errorHandler);
  });

  test('POST registers the token, passing the declared app id', async () => {
    mobilePushService.registerDevice.mockResolvedValue({ registered: true });
    const response = await request(app).post('/api/widget/push-token')
      .set('X-Tenant-ID', TENANT).set('X-App-Id', 'com.exemple.app')
      .send({ sessionId: 's-1234567', token: 'tok', platform: 'fcm', locale: 'en' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { registered: true } });
    expect(mobilePushService.registerDevice).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tenant-1' }),
      { sessionId: 's-1234567', token: 'tok', platform: 'fcm', locale: 'en', appId: 'com.exemple.app' });
  });

  test('relays PUSH_NOT_ENABLED so the SDK can ignore it silently', async () => {
    mobilePushService.registerDevice.mockRejectedValue(new AppError('Non activé.', 403, { code: 'PUSH_NOT_ENABLED' }));
    const response = await request(app).post('/api/widget/push-token').set('X-Tenant-ID', TENANT).send({});
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ success: false, code: 'PUSH_NOT_ENABLED' });
  });

  test('DELETE forgets the token', async () => {
    mobilePushService.unregisterDevice.mockResolvedValue({ removed: true });
    const response = await request(app).delete('/api/widget/push-token').set('X-Tenant-ID', TENANT).send({ token: 'tok' });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ removed: true });
    expect(mobilePushService.unregisterDevice).toHaveBeenCalledWith(expect.objectContaining({ id: 'tenant-1' }), 'tok');
  });

  test('requires the tenant header like every widget route', async () => {
    const response = await request(app).post('/api/widget/push-token').send({});
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('MISSING_TENANT_ID');
  });
});
