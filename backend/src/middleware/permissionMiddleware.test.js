const express = require('express');
const request = require('supertest');
const { requirePermission } = require('./permissionMiddleware');
const { errorHandler } = require('./errorMiddleware');

describe('permissionMiddleware', () => {
  // Monte une route protégée en injectant l'utilisateur donné (null = anonyme).
  const buildApp = (user, resource, level) => {
    const app = express();
    app.use((req, _res, next) => {
      if (user) req.user = user;
      next();
    });
    app.get('/protected', requirePermission(resource, level), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);
    return app;
  };

  test('rejects an anonymous request before looking at any permission', async () => {
    const response = await request(buildApp(null, 'knowledge', 'read')).get('/protected');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_REQUIRED');
  });

  test('lets a member through when the level matches exactly', async () => {
    const user = { role: 'user' };
    const response = await request(buildApp(user, 'knowledge', 'read')).get('/protected');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  test('lets a write level satisfy a read requirement', async () => {
    const user = { role: 'user', permissionOverrides: { knowledge: 'write' } };
    const response = await request(buildApp(user, 'knowledge', 'read')).get('/protected');

    expect(response.status).toBe(200);
  });

  test('refuses a write requirement held only in read, in French', async () => {
    const user = { role: 'user' };
    const response = await request(buildApp(user, 'knowledge', 'write')).get('/protected');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('PERMISSION_DENIED');
    expect(response.body.error).toContain('Base de connaissances');
    expect(response.body.error).toContain('modifier');
  });

  test('refuses a member whose resource is cut to none', async () => {
    const user = { role: 'user', permissionOverrides: { company: 'none' } };
    const response = await request(buildApp(user, 'company', 'read')).get('/protected');

    expect(response.status).toBe(403);
    expect(response.body.details).toMatchObject({ resource: 'company', required: 'read' });
  });

  test('never blocks the owner, even with a sabotaged override', async () => {
    const owner = { role: 'owner', permissionOverrides: { company: 'none' } };
    const response = await request(buildApp(owner, 'company', 'write')).get('/protected');

    expect(response.status).toBe(200);
  });
});
