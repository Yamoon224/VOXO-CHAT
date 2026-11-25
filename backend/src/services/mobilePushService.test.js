jest.mock('../models', () => ({
  Tenant: { findByPk: jest.fn() },
  MobilePushDevice: { findOne: jest.fn(), create: jest.fn(), findAll: jest.fn(), destroy: jest.fn() },
}));
jest.mock('./integrationCryptoService', () => ({ decrypt: jest.fn() }));

const { Tenant, MobilePushDevice } = require('../models');
const cryptoService = require('./integrationCryptoService');
const visitorPresence = require('./visitorPresence');
const service = require('./mobilePushService');

const tenant = overrides => ({
  id: 't1', settings: { chatbot: { name: 'Zoé' } }, mobilePushSecrets: 'chiffré',
  mobilePush: { enabled: true, fcmConfigured: true, apnsConfigured: true, apns: { keyId: 'K', teamId: 'T', bundleId: 'com.exemple.app' } },
  ...overrides,
});
const SESSION = 'a24ae350-04c6-46f1-b704-c28be6e14928';

describe('registerDevice', () => {
  beforeEach(() => jest.clearAllMocks());
  const register = (t, body) => service.registerDevice(t, { sessionId: SESSION, token: 'tok123', platform: 'fcm', ...body });

  test('creates a device bound to the session, hashing the token', async () => {
    MobilePushDevice.findOne.mockResolvedValue(null);
    await expect(register(tenant(), { locale: 'en', appId: 'com.exemple.app' })).resolves.toEqual({ registered: true });
    expect(MobilePushDevice.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 't1', sessionId: SESSION, platform: 'fcm', locale: 'en', tokenHash: service.hashToken('tok123'),
    }));
  });

  test('moves an already known token to the new session instead of duplicating it', async () => {
    const existing = { update: jest.fn() };
    MobilePushDevice.findOne.mockResolvedValue(existing);
    await register(tenant());
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ sessionId: SESSION }));
    expect(MobilePushDevice.create).not.toHaveBeenCalled();
  });

  test.each([
    [{ token: '' }], [{ token: 'a b' }], [{ token: 'x'.repeat(4097) }], [{ platform: 'sms' }], [{ sessionId: '../etc' }],
  ])('rejects %j with INVALID_PUSH_TOKEN', async body => {
    await expect(register(tenant(), body)).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PUSH_TOKEN' });
  });

  test('answers PUSH_NOT_ENABLED when the owner has not configured that platform', async () => {
    await expect(register(tenant({ mobilePush: { enabled: false } }))).rejects.toMatchObject({ statusCode: 403, code: 'PUSH_NOT_ENABLED' });
    await expect(register(tenant({ mobilePush: { enabled: true, fcmConfigured: false } }))).rejects.toMatchObject({ code: 'PUSH_NOT_ENABLED' });
  });

  test('unregister reports whether something was removed', async () => {
    MobilePushDevice.destroy.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    await expect(service.unregisterDevice(tenant(), 'tok123')).resolves.toEqual({ removed: true });
    await expect(service.unregisterDevice(tenant(), 'tok123')).resolves.toEqual({ removed: false });
  });
});

describe('notifyAgentMessage', () => {
  const fcm = { send: jest.fn() };
  const apns = { send: jest.fn() };
  const message = { id: 'm1', content: 'Bonjour, je prends le relais.' };
  const device = (overrides = {}) => ({ token: 'tok', sessionId: SESSION, platform: 'fcm', locale: 'fr', destroy: jest.fn(), ...overrides });
  const notify = () => service.notifyAgentMessage({ tenantId: 't1', sessionId: SESSION, message, agentName: 'Léa' });

  beforeEach(() => {
    jest.clearAllMocks();
    service.setProviders({ fcm, apns });
    fcm.send.mockResolvedValue({ ok: true });
    apns.send.mockResolvedValue({ ok: true });
    Tenant.findByPk.mockResolvedValue(tenant());
    cryptoService.decrypt.mockReturnValue({ fcm: { serviceAccount: { project_id: 'p' } }, apns: { privateKey: 'pem' } });
  });

  test('sends the agent name as title and the start of the message as body', async () => {
    MobilePushDevice.findAll.mockResolvedValue([device()]);
    await expect(notify()).resolves.toEqual({ sent: 1 });
    expect(fcm.send).toHaveBeenCalledWith({ project_id: 'p' }, {
      token: 'tok', title: 'Léa', body: 'Bonjour, je prends le relais.',
      data: { type: 'voxo.agent_message', sessionId: SESSION, messageId: 'm1' },
    });
  });

  test('truncates the body, and uses a generic localized one when the text must not leave', async () => {
    MobilePushDevice.findAll.mockResolvedValue([device({ locale: 'en' })]);
    await service.notifyAgentMessage({ tenantId: 't1', sessionId: SESSION, message: { id: 'm', content: 'x'.repeat(500) } });
    expect(fcm.send.mock.calls[0][1].body).toHaveLength(service.MAX_BODY_LENGTH);
    expect(fcm.send.mock.calls[0][1].title).toBe('Zoé');

    Tenant.findByPk.mockResolvedValue(tenant({ mobilePush: { enabled: true, fcmConfigured: true, includeMessageText: false } }));
    await notify();
    // L'appareil de ce test est en locale `en` : le texte générique suit la langue de l'appareil.
    expect(fcm.send.mock.calls[1][1].body).toBe('You have a new reply.');
  });

  test('routes each device to its platform, with the APNs credentials the owner configured', async () => {
    MobilePushDevice.findAll.mockResolvedValue([device({ platform: 'apns', token: 'apnstok' })]);
    await notify();
    expect(apns.send).toHaveBeenCalledWith(
      { keyId: 'K', teamId: 'T', bundleId: 'com.exemple.app', privateKey: 'pem' }, expect.objectContaining({ token: 'apnstok' }));
    expect(fcm.send).not.toHaveBeenCalled();
  });

  test('forgets a token the provider declares invalid, but keeps one that merely failed', async () => {
    const dead = device({ token: 'dead' });
    const flaky = device({ token: 'flaky' });
    MobilePushDevice.findAll.mockResolvedValue([dead, flaky]);
    fcm.send.mockResolvedValueOnce({ ok: false, invalid: true }).mockResolvedValueOnce({ ok: false, error: 'boom' });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(notify()).resolves.toEqual({ sent: 0 });
    expect(dead.destroy).toHaveBeenCalled();
    expect(flaky.destroy).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  test('sends nothing while the visitor has a socket open', async () => {
    const leave = visitorPresence.add('t1', SESSION);
    await expect(notify()).resolves.toEqual({ sent: 0 });
    expect(MobilePushDevice.findAll).not.toHaveBeenCalled();
    leave();
    MobilePushDevice.findAll.mockResolvedValue([device()]);
    await expect(notify()).resolves.toEqual({ sent: 1 });
  });

  test('never throws: a push outage must not break the agent reply', async () => {
    Tenant.findByPk.mockRejectedValue(new Error('db down'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(notify()).resolves.toEqual({ sent: 0 });
    warn.mockRestore();
  });

  test('does nothing when the owner disabled notifications', async () => {
    Tenant.findByPk.mockResolvedValue(tenant({ mobilePush: { enabled: false } }));
    await expect(notify()).resolves.toEqual({ sent: 0 });
    expect(MobilePushDevice.findAll).not.toHaveBeenCalled();
  });
});

describe('visitorPresence', () => {
  test('counts several sockets and releases each only once', () => {
    const first = visitorPresence.add('t', 's');
    const second = visitorPresence.add('t', 's');
    first(); first();
    expect(visitorPresence.has('t', 's')).toBe(true);
    second();
    expect(visitorPresence.has('t', 's')).toBe(false);
  });
});
