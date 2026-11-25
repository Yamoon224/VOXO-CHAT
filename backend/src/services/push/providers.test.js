const { EventEmitter } = require('events');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createFcmProvider } = require('./fcmProvider');
const { createApnsProvider } = require('./apnsProvider');

const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pem = (key, type) => key.export({ type, format: 'pem' });

describe('FCM provider', () => {
  const account = { project_id: 'proj', client_email: 'svc@proj.iam', private_key: pem(rsa.privateKey, 'pkcs8') };
  const payload = { token: 'devtok', title: 'Léa', body: 'Salut', data: { sessionId: 's' } };

  function http(sendResult) {
    return {
      post: jest.fn(async url => {
        if (url.includes('oauth2')) return { data: { access_token: 'ya29.abc' } };
        if (sendResult instanceof Error) throw sendResult;
        return { data: {} };
      }),
    };
  }

  test('signs an RS256 assertion, reuses the access token, and posts to the project endpoint', async () => {
    const client = http();
    const provider = createFcmProvider({ http: client, now: () => 1_700_000_000_000 });
    await expect(provider.send(account, payload)).resolves.toEqual({ ok: true });
    await provider.send(account, payload);

    const oauthCalls = client.post.mock.calls.filter(call => call[0].includes('oauth2'));
    expect(oauthCalls).toHaveLength(1);
    const assertion = new URLSearchParams(oauthCalls[0][1]).get('assertion');
    expect(jwt.verify(assertion, pem(rsa.publicKey, 'spki'), { algorithms: ['RS256'], ignoreExpiration: true }))
      .toMatchObject({ iss: 'svc@proj.iam', scope: 'https://www.googleapis.com/auth/firebase.messaging' });

    const [url, body, options] = client.post.mock.calls.find(call => call[0].includes('fcm.googleapis.com'));
    expect(url).toBe('https://fcm.googleapis.com/v1/projects/proj/messages:send');
    expect(options.headers.Authorization).toBe('Bearer ya29.abc');
    expect(body.message).toMatchObject({ token: 'devtok', notification: { title: 'Léa', body: 'Salut' }, data: { sessionId: 's' } });
  });

  test('renews the access token once it has expired', async () => {
    const client = http();
    let now = 1_700_000_000_000;
    const provider = createFcmProvider({ http: client, now: () => now });
    await provider.send(account, payload);
    now += 3301 * 1000;
    await provider.send(account, payload);
    expect(client.post.mock.calls.filter(call => call[0].includes('oauth2'))).toHaveLength(2);
  });

  test('flags UNREGISTERED and 404 as invalid tokens, other failures as retryable', async () => {
    const unregistered = Object.assign(new Error('nf'), { response: { status: 404, data: { error: { details: [{ errorCode: 'UNREGISTERED' }] } } } });
    await expect(createFcmProvider({ http: http(unregistered) }).send(account, payload)).resolves.toMatchObject({ ok: false, invalid: true });
    const outage = Object.assign(new Error('x'), { response: { status: 503, data: {} } });
    await expect(createFcmProvider({ http: http(outage) }).send(account, payload)).resolves.toMatchObject({ ok: false, invalid: false });
  });
});

describe('APNs provider', () => {
  const credentials = { keyId: 'KEY1', teamId: 'TEAM1', bundleId: 'com.exemple.app', privateKey: pem(ec.privateKey, 'pkcs8'), sandbox: false };
  const payload = { token: 'abcd1234', title: 'Léa', body: 'Salut', data: { type: 'voxo.agent_message', sessionId: 's', messageId: 'm' } };

  function fakeConnect({ status, reason }) {
    const seen = {};
    const connect = jest.fn(host => {
      seen.host = host;
      const client = new EventEmitter();
      client.close = jest.fn();
      client.request = headers => {
        seen.headers = headers;
        const request = new EventEmitter();
        request.setEncoding = () => {};
        request.setTimeout = () => {};
        request.close = () => {};
        request.end = body => {
          seen.body = JSON.parse(body);
          setImmediate(() => {
            request.emit('response', { ':status': status });
            if (reason) request.emit('data', JSON.stringify({ reason }));
            request.emit('end');
          });
        };
        return request;
      };
      return client;
    });
    return { connect, seen };
  }

  test('sends a token-authenticated alert to the right host and topic', async () => {
    const { connect, seen } = fakeConnect({ status: 200 });
    await expect(createApnsProvider({ connect }).send(credentials, payload)).resolves.toEqual({ ok: true });
    expect(seen.host).toBe('https://api.push.apple.com');
    expect(seen.headers[':path']).toBe('/3/device/abcd1234');
    expect(seen.headers['apns-topic']).toBe('com.exemple.app');
    expect(seen.headers['apns-push-type']).toBe('alert');
    const decoded = jwt.decode(seen.headers.authorization.replace('bearer ', ''), { complete: true });
    expect(decoded.header).toMatchObject({ alg: 'ES256', kid: 'KEY1' });
    expect(decoded.payload.iss).toBe('TEAM1');
    expect(seen.body).toEqual({
      aps: { alert: { title: 'Léa', body: 'Salut' }, sound: 'default', 'thread-id': 's' },
      voxo: payload.data,
    });
  });

  test('uses the sandbox host when the owner asks for it', async () => {
    const { connect, seen } = fakeConnect({ status: 200 });
    await createApnsProvider({ connect }).send({ ...credentials, sandbox: true }, payload);
    expect(seen.host).toBe('https://api.sandbox.push.apple.com');
  });

  test('flags 410 and bad device tokens as invalid, other errors as retryable', async () => {
    for (const result of [{ status: 410, reason: 'Unregistered' }, { status: 400, reason: 'BadDeviceToken' }]) {
      await expect(createApnsProvider({ connect: fakeConnect(result).connect }).send(credentials, payload))
        .resolves.toMatchObject({ ok: false, invalid: true });
    }
    await expect(createApnsProvider({ connect: fakeConnect({ status: 429, reason: 'TooManyRequests' }).connect }).send(credentials, payload))
      .resolves.toMatchObject({ ok: false, invalid: false, error: 'TooManyRequests' });
  });

  test('reports a bad private key instead of throwing', async () => {
    const { connect } = fakeConnect({ status: 200 });
    await expect(createApnsProvider({ connect }).send({ ...credentials, privateKey: 'pas une clé' }, payload))
      .resolves.toMatchObject({ ok: false });
  });
});
