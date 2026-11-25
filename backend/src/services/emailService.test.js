jest.mock('../config/config', () => ({
  email: {
    provider: 'brevo',
    brevo: { apiKey: 'test-key', senderEmail: 'no-reply@voxo.test', senderName: 'Voxo Chat' },
  },
  app: { supportEmail: 'support@voxo.test', frontendUrl: 'https://app.test' },
}));

jest.mock('./email', () => ({ getTransport: jest.fn() }));

const { getTransport } = require('./email');
const { AppError } = require('../middleware/errorMiddleware');
const emailService = require('./emailService');

const SECRET_TOKEN = 'SECRET_VERIFY_TOKEN';

const verificationParams = {
  email: 'user@client.test',
  firstName: 'Ada',
  verifyUrl: `https://app.test/auth/verify-email?token=${SECRET_TOKEN}`,
  expiresInHours: 24,
};

/** Les logs sont sérialisés en JSON sur console.error par channelLogger. */
const failureLogs = errorSpy =>
  errorSpy.mock.calls.map(([line]) => JSON.parse(line)).filter(e => e.eventType === 'email.failed');

describe('emailService — journalisation des échecs', () => {
  let send;
  let errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    send = jest.fn();
    getTransport.mockReturnValue({ send });
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => errorSpy.mockRestore());

  test('journalise le statut HTTP et la réponse du fournisseur', async () => {
    send.mockRejectedValue(
      new AppError('Impossible d’envoyer l’email', 502, {
        code: 'EMAIL_SEND_FAILED',
        details: { status: 401, reason: '{"code":"unauthorized","message":"Unrecognised IP"}' },
      })
    );

    await emailService.sendEmailVerification(verificationParams);

    expect(failureLogs(errorSpy)).toEqual([
      expect.objectContaining({
        eventType: 'email.failed',
        to: 'user@client.test',
        template: 'emailVerification',
        code: 'EMAIL_SEND_FAILED',
        status: 401,
        reason: '{"code":"unauthorized","message":"Unrecognised IP"}',
      }),
    ]);
  });

  test('retombe sur le message d’erreur quand le transport ne fournit pas de détails', async () => {
    send.mockRejectedValue(new Error('ECONNRESET'));

    await emailService.sendEmailVerification(verificationParams);

    const [log] = failureLogs(errorSpy);
    expect(log).toMatchObject({ code: 'EMAIL_SEND_FAILED', reason: 'ECONNRESET' });
    expect(log).not.toHaveProperty('status');
  });

  test('tronque une réponse volumineuse', async () => {
    send.mockRejectedValue(
      new AppError('Impossible d’envoyer l’email', 502, {
        code: 'EMAIL_SEND_FAILED',
        details: { status: 500, reason: 'x'.repeat(2000) },
      })
    );

    await emailService.sendEmailVerification(verificationParams);

    expect(failureLogs(errorSpy)[0].reason).toBe(`${'x'.repeat(500)}…`);
  });

  test('ne fait jamais fuiter le jeton de vérification dans les logs', async () => {
    send.mockRejectedValue(
      new AppError('Impossible d’envoyer l’email', 502, {
        code: 'EMAIL_SEND_FAILED',
        details: { status: 400, reason: 'Invalid sender' },
      })
    );

    await emailService.sendEmailVerification(verificationParams);

    const serialized = errorSpy.mock.calls.map(([line]) => line).join('\n');
    expect(serialized).not.toContain(SECRET_TOKEN);
  });

  test('sendBestEffort absorbe l’échec sans le propager', async () => {
    send.mockRejectedValue(new Error('boom'));

    await expect(emailService.sendEmailVerification(verificationParams)).resolves.toBe(false);
  });

  test('journalise email.sent en cas de succès, sans champ reason', async () => {
    send.mockResolvedValue({ messageId: '<abc@brevo>' });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await expect(emailService.sendEmailVerification(verificationParams)).resolves.toBe(true);

    const sent = JSON.parse(logSpy.mock.calls[0][0]);
    expect(sent).toMatchObject({ eventType: 'email.sent', messageId: '<abc@brevo>' });
    expect(failureLogs(errorSpy)).toHaveLength(0);
    logSpy.mockRestore();
  });
});
