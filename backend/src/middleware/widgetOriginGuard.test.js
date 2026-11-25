const { widgetAppIdGuard, appIdVerdict } = require('./widgetOriginGuard');

function run(tenant, headers = {}) {
  const req = {
    tenant, originalUrl: '/api/widget/message',
    get: name => Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1],
  };
  const next = jest.fn();
  widgetAppIdGuard(req, {}, next);
  return next;
}

describe('widgetAppIdGuard', () => {
  let warn;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => warn.mockRestore());

  const tenant = overrides => ({ id: 't1', allowedAppIds: ['com.exemple.app'], enforceAppIds: false, ...overrides });

  test('lets everything through when no app list is configured', () => {
    const next = run(tenant({ allowedAppIds: [], enforceAppIds: true }), { 'X-App-Id': 'com.autre' });
    expect(next).toHaveBeenCalledWith();
    expect(warn).not.toHaveBeenCalled();
  });

  test('never touches browser requests: they are governed by domains', () => {
    const next = run(tenant({ enforceAppIds: true }), { Origin: 'https://site.test' });
    expect(next).toHaveBeenCalledWith();
    expect(warn).not.toHaveBeenCalled();
  });

  test('accepts a listed app, whatever the case', () => {
    expect(run(tenant({ enforceAppIds: true }), { 'X-App-Id': 'COM.Exemple.App' })).toHaveBeenCalledWith();
  });

  test('observation mode: logs the mismatch but lets the request through', () => {
    const next = run(tenant(), { 'X-App-Id': 'com.autre' });
    expect(next).toHaveBeenCalledWith();
    expect(JSON.parse(warn.mock.calls[0][0])).toMatchObject({ event: 'widget_app_not_allowed', appId: 'com.autre', blocked: false });
  });

  test('blocking mode: rejects an unlisted or missing app id with APP_NOT_ALLOWED', () => {
    for (const headers of [{ 'X-App-Id': 'com.autre' }, {}]) {
      const next = run(tenant({ enforceAppIds: true }), headers);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code || error.details?.code).toBe('APP_NOT_ALLOWED');
    }
  });

  test('verdict is shared with the WebSocket authorization', () => {
    expect(appIdVerdict(tenant({ enforceAppIds: true }), { appId: 'com.autre' })).toEqual({ ok: false, blocked: true });
    expect(appIdVerdict(tenant(), { appId: 'com.autre' })).toEqual({ ok: false, blocked: false });
    expect(appIdVerdict(tenant({ enforceAppIds: true }), { appId: 'com.autre', origin: 'https://x.test' })).toEqual({ ok: true, blocked: false });
  });
});
