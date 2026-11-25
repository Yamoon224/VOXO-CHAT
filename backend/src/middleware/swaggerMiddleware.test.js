const express = require('express');
const request = require('supertest');
const {
  createSwaggerBasicAuth,
  createSwaggerRedirect,
  getBackendUrlPrefix,
  normalizeForwardedPrefix,
} = require('./swaggerMiddleware');

const basicAuthorization = (username, password) =>
  `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

const createTestApp = options => {
  const app = express();
  const protectSwagger = createSwaggerBasicAuth(options);
  const redirectSwaggerToTrailingSlash = createSwaggerRedirect({
    backendUrl: options.backendUrl || 'http://localhost:3000',
  });

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.get(/^\/api-docs$/, protectSwagger, redirectSwaggerToTrailingSlash);
  app.get('/api-docs/', protectSwagger, (_req, res) => res.status(200).send('Swagger UI'));

  return app;
};

describe('Swagger middleware', () => {
  test('preserves a safe Traefik forwarded prefix in the redirect', async () => {
    const app = createTestApp({
      environment: 'production',
      username: 'voxo-docs',
      password: 'strong-password',
      backendUrl: 'https://app.voxo.chat/configured-prefix',
    });

    const response = await request(app)
      .get('/api-docs')
      .set('X-Forwarded-Prefix', '/backserv-backend/pre-prod')
      .set('Authorization', basicAuthorization('voxo-docs', 'strong-password'));

    expect(response.status).toBe(308);
    expect(response.headers.location).toBe('/backserv-backend/pre-prod/api-docs/');
  });

  test('uses BACKEND_URL when Traefik does not forward the prefix', async () => {
    const app = createTestApp({
      environment: 'production',
      username: 'voxo-docs',
      password: 'strong-password',
      backendUrl: 'https://app.voxo.chat/backserv-backend/pre-prod',
    });

    const response = await request(app)
      .get('/api-docs')
      .set('Authorization', basicAuthorization('voxo-docs', 'strong-password'));

    expect(response.status).toBe(308);
    expect(response.headers.location).toBe('/backserv-backend/pre-prod/api-docs/');
  });

  test('falls back to BACKEND_URL when the forwarded prefix is unsafe', async () => {
    const app = createTestApp({
      environment: 'production',
      username: 'voxo-docs',
      password: 'strong-password',
      backendUrl: 'https://app.voxo.chat/backserv-backend/pre-prod',
    });

    const response = await request(app)
      .get('/api-docs')
      .set('X-Forwarded-Prefix', '//attacker.example')
      .set('Authorization', basicAuthorization('voxo-docs', 'strong-password'));

    expect(response.status).toBe(308);
    expect(response.headers.location).toBe('/backserv-backend/pre-prod/api-docs/');
  });

  test('redirects local Swagger without adding a prefix', async () => {
    const app = createTestApp({
      environment: 'development',
      username: '',
      password: '',
      backendUrl: 'http://localhost:3000',
    });

    const response = await request(app).get('/api-docs');

    expect(response.status).toBe(308);
    expect(response.headers.location).toBe('/api-docs/');
  });

  test('does not use an unsafe forwarded prefix', () => {
    expect(normalizeForwardedPrefix('//attacker.example')).toBe('');
    expect(normalizeForwardedPrefix('/safe/path?redirect=bad')).toBe('');
    expect(getBackendUrlPrefix('not-a-url')).toBe('');
  });

  test('challenges missing or invalid credentials', async () => {
    const app = createTestApp({
      environment: 'production',
      username: 'voxo-docs',
      password: 'strong-password',
    });

    const missing = await request(app).get('/api-docs/');
    const invalid = await request(app)
      .get('/api-docs/')
      .set('Authorization', basicAuthorization('voxo-docs', 'wrong-password'));

    expect(missing.status).toBe(401);
    expect(missing.headers['www-authenticate']).toContain('Basic realm="VOXO API Documentation"');
    expect(invalid.status).toBe(401);
  });

  test('serves Swagger with valid credentials', async () => {
    const app = createTestApp({
      environment: 'production',
      username: 'voxo-docs',
      password: 'strong-password',
    });

    const response = await request(app)
      .get('/api-docs/')
      .set('Authorization', basicAuthorization('voxo-docs', 'strong-password'));

    expect(response.status).toBe(200);
    expect(response.text).toBe('Swagger UI');
  });

  test('keeps the API healthy when production credentials are missing', async () => {
    const app = createTestApp({ environment: 'production', username: '', password: '' });

    const swaggerResponse = await request(app).get('/api-docs/');
    const healthResponse = await request(app).get('/health');

    expect(swaggerResponse.status).toBe(503);
    expect(healthResponse.status).toBe(200);
  });

  test('returns 503 when only one production credential is configured', async () => {
    const app = createTestApp({
      environment: 'production',
      username: 'voxo-docs',
      password: '',
    });

    const response = await request(app).get('/api-docs/');

    expect(response.status).toBe(503);
  });

  test('allows local Swagger when both credentials are empty', async () => {
    const app = createTestApp({ environment: 'development', username: '', password: '' });

    const response = await request(app).get('/api-docs/');

    expect(response.status).toBe(200);
  });
});
