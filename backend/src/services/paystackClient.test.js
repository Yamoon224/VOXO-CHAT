jest.mock('axios', () => ({ request: jest.fn() }));
jest.mock('../config/config', () => ({
  paystack: { enabled: false, secretKey: '', baseUrl: 'https://api.paystack.test' },
}));

const axios = require('axios');
const config = require('../config/config');
const client = require('./paystackClient');

describe('paystackClient', () => {
  beforeEach(() => { jest.clearAllMocks(); config.paystack.enabled = false; config.paystack.secretKey = ''; });

  test('refuses network calls while Paystack is disabled', async () => {
    await expect(client.initializeTransaction({})).rejects.toMatchObject({ code: 'PAYSTACK_DISABLED' });
    expect(axios.request).not.toHaveBeenCalled();
  });

  test('initializes transactions only with the server secret', async () => {
    config.paystack.enabled = true; config.paystack.secretKey = 'secret';
    axios.request.mockResolvedValue({ data: { status: true, data: { reference: 'ref-1' } } });
    await expect(client.initializeTransaction({ email: 'owner@voxo.test' })).resolves.toEqual({ reference: 'ref-1' });
    expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer secret' }) }));
  });

  test('verifies the HMAC SHA-512 webhook signature', () => {
    config.paystack.secretKey = 'secret';
    const crypto = require('crypto');
    const raw = '{"event":"charge.success"}';
    const signature = crypto.createHmac('sha512', 'secret').update(raw).digest('hex');
    expect(client.verifyWebhookSignature(raw, signature)).toBe(true);
    expect(client.verifyWebhookSignature(raw, 'invalid')).toBe(false);
  });
});
