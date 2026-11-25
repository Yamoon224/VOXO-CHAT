jest.mock('./integrationCryptoService', () => ({
  // Chiffrement factice réversible : on vérifie ce qui est stocké sans dépendre de la clé d'environnement.
  encrypt: value => (value && Object.keys(value).length ? `enc:${JSON.stringify(value)}` : null),
  decrypt: value => (value ? JSON.parse(value.slice(4)) : {}),
}));

const crypto = require('crypto');
const service = require('./mobilePushSettingsService');

const rsaPem = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
const ecPem = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ type: 'pkcs8', format: 'pem' });
const account = { type: 'service_account', project_id: 'proj', client_email: 'svc@proj.iam', private_key: rsaPem };
const apns = { keyId: 'ABCDE12345', teamId: 'TEAM123456', bundleId: 'com.exemple.app', privateKey: ecPem };

function makeTenant(overrides = {}) {
  const tenant = { mobilePush: {}, mobilePushSecrets: null, update: jest.fn(async data => Object.assign(tenant, data)), ...overrides };
  return tenant;
}
const stored = tenant => JSON.parse(tenant.mobilePushSecrets.slice(4));

describe('mobile push settings', () => {
  test('stores the FCM service account encrypted and reports it as configured, without ever returning it', async () => {
    const tenant = makeTenant();
    const status = await service.update(tenant, { fcm: { serviceAccount: JSON.stringify(account) }, enabled: true });
    expect(status).toEqual({ enabled: true, includeMessageText: true, fcm: { configured: true }, apns: { configured: false } });
    expect(stored(tenant).fcm.serviceAccount.private_key).toBe(rsaPem);
    expect(JSON.stringify(status)).not.toContain('PRIVATE KEY');
    expect(JSON.stringify(tenant.mobilePush)).not.toContain('PRIVATE KEY');
  });

  test('keeps only the fields it needs from the service account', async () => {
    const tenant = makeTenant();
    await service.update(tenant, { fcm: { serviceAccount: { ...account, client_secret: 'x', token_uri: 'https://evil' } } });
    expect(Object.keys(stored(tenant).fcm.serviceAccount).sort()).toEqual(['client_email', 'private_key', 'project_id', 'type']);
  });

  test.each([
    ['not json', 'JSON invalide'],
    [JSON.stringify({ type: 'authorized_user' }), 'compte de service'],
    [JSON.stringify({ ...account, private_key: 'nope' }), 'clé privée illisible'],
  ])('rejects a bad FCM file (%#)', async (serviceAccount, message) => {
    await expect(service.update(makeTenant(), { fcm: { serviceAccount } })).rejects.toMatchObject({
      statusCode: 400, code: 'INVALID_PUSH_SETTINGS', message: expect.stringContaining(message),
    });
  });

  test('configures APNs with a validated key and public identifiers kept apart from the secret', async () => {
    const tenant = makeTenant();
    const status = await service.update(tenant, { apns: { ...apns, sandbox: true }, enabled: true });
    expect(status.apns).toEqual({ configured: true, keyId: 'ABCDE12345', teamId: 'TEAM123456', bundleId: 'com.exemple.app', sandbox: true });
    expect(tenant.mobilePush.apns.privateKey).toBeUndefined();
    expect(stored(tenant).apns.privateKey).toBe(ecPem);
  });

  test('lets the owner change an identifier later without re-uploading the key', async () => {
    const tenant = makeTenant();
    await service.update(tenant, { apns });
    const status = await service.update(tenant, { apns: { bundleId: 'com.exemple.beta' } });
    expect(status.apns.bundleId).toBe('com.exemple.beta');
    expect(stored(tenant).apns.privateKey).toBe(ecPem);
  });

  test.each([
    [{ ...apns, keyId: 'court' }, 'Key ID'],
    [{ ...apns, teamId: 'trop-long-pour-etre-valide' }, 'Team ID'],
    [{ ...apns, bundleId: 'pas un id' }, 'Bundle ID'],
    [{ ...apns, privateKey: 'pas une clé' }, 'clé privée illisible'],
  ])('rejects bad APNs input (%#)', async (input, message) => {
    await expect(service.update(makeTenant(), { apns: input })).rejects.toMatchObject({ message: expect.stringContaining(message) });
  });

  test('requires the .p8 key the first time', async () => {
    const withoutKey = { ...apns };
    delete withoutKey.privateKey;
    await expect(service.update(makeTenant(), { apns: withoutKey })).rejects.toMatchObject({ message: expect.stringContaining('clé privée (.p8) est requise') });
  });

  test('cannot be enabled without any platform configured', async () => {
    const status = await service.update(makeTenant(), { enabled: true });
    expect(status.enabled).toBe(false);
  });

  test('removing the last platform disables the feature and clears the secrets column', async () => {
    const tenant = makeTenant();
    await service.update(tenant, { fcm: { serviceAccount: account }, enabled: true });
    const status = await service.update(tenant, { fcm: { remove: true } });
    expect(status).toMatchObject({ enabled: false, fcm: { configured: false } });
    expect(tenant.mobilePushSecrets).toBeNull();
  });

  test('can keep the message text out of notifications', async () => {
    const status = await service.update(makeTenant(), { includeMessageText: false });
    expect(status.includeMessageText).toBe(false);
  });
});
