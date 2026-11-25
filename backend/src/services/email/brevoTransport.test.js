jest.mock('../../config/config', () => ({
  email: {
    provider: 'brevo',
    brevo: { apiKey: 'test-key', senderEmail: 'no-reply@voxo.test', senderName: 'Voxo Chat' },
  },
  app: { supportEmail: 'support@voxo.test' },
}));

const config = require('../../config/config');
const brevoTransport = require('./brevoTransport');

const okResponse = (body = { messageId: '<abc@brevo>' }) => ({
  ok: true,
  status: 201,
  json: jest.fn().mockResolvedValue(body),
  text: jest.fn().mockResolvedValue(''),
});

describe('brevoTransport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    config.email.brevo.apiKey = 'test-key';
    config.email.brevo.senderEmail = 'no-reply@voxo.test';
    global.fetch = jest.fn().mockResolvedValue(okResponse());
  });

  test('posts the expected payload to the Brevo API', async () => {
    const result = await brevoTransport.send({
      to: 'user@client.test',
      subject: 'Sujet',
      html: '<p>Bonjour</p>',
      text: 'Bonjour',
    });

    expect(result).toEqual({ messageId: '<abc@brevo>' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'api-key': 'test-key' }),
      })
    );

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({
      sender: { name: 'Voxo Chat', email: 'no-reply@voxo.test' },
      to: [{ email: 'user@client.test' }],
      subject: 'Sujet',
      htmlContent: '<p>Bonjour</p>',
      textContent: 'Bonjour',
    });
  });

  test('raises EMAIL_SERVICE_UNAVAILABLE when the API key is missing', async () => {
    config.email.brevo.apiKey = '';

    await expect(brevoTransport.send({ to: 'a@b.test', subject: 's', html: 'h' }))
      .rejects.toMatchObject({ statusCode: 503, code: 'EMAIL_SERVICE_UNAVAILABLE' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('raises EMAIL_SEND_FAILED on a non-2xx response', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('{"message":"Invalid sender"}'),
    });

    await expect(brevoTransport.send({ to: 'a@b.test', subject: 's', html: 'h' }))
      .rejects.toMatchObject({ statusCode: 502, code: 'EMAIL_SEND_FAILED' });
  });

  test('raises EMAIL_SEND_FAILED when the network call throws', async () => {
    global.fetch.mockRejectedValue(new Error('ECONNRESET'));

    await expect(brevoTransport.send({ to: 'a@b.test', subject: 's', html: 'h' }))
      .rejects.toMatchObject({ statusCode: 502, code: 'EMAIL_SEND_FAILED' });
  });

  test('never leaks the request body — which carries the reset link — into the error', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('server error'),
    });

    const secretUrl = 'https://app.test/auth/reset-password?token=SECRET_TOKEN';
    await expect(
      brevoTransport.send({ to: 'a@b.test', subject: 's', html: `<a href="${secretUrl}">x</a>` })
    ).rejects.toMatchObject({
      details: { status: 500, reason: 'server error' },
    });

    const thrown = await brevoTransport
      .send({ to: 'a@b.test', subject: 's', html: `<a href="${secretUrl}">x</a>` })
      .catch(error => JSON.stringify(error.details));
    expect(thrown).not.toContain('SECRET_TOKEN');
  });
});
