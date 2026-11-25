const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/config');
const { AppError } = require('../middleware/errorMiddleware');

class PaystackClient {
  assertAvailable() {
    if (config.paystack.enabled && config.paystack.secretKey) return;
    throw new AppError('Le paiement Paystack n’est pas activé', 503, { code: 'PAYSTACK_DISABLED' });
  }

  async request(method, path, data) {
    this.assertAvailable();
    const response = await axios.request({
      method, url: `${config.paystack.baseUrl}${path}`,
      headers: { Authorization: `Bearer ${config.paystack.secretKey}`, 'Content-Type': 'application/json' },
      ...(data && { data }), timeout: 15000,
    });
    if (!response.data?.status) throw new AppError('Paystack a refusé la demande', 502, { code: 'PAYSTACK_REJECTED' });
    return response.data.data;
  }

  initializeTransaction(payload) {
    return this.request('post', '/transaction/initialize', payload);
  }

  verifyTransaction(reference) {
    return this.request('get', `/transaction/verify/${encodeURIComponent(reference)}`);
  }

  verifyWebhookSignature(rawBody, signature) {
    if (!config.paystack.secretKey || typeof signature !== 'string') return false;
    const expected = crypto.createHmac('sha512', config.paystack.secretKey).update(rawBody).digest('hex');
    const actual = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
  }
}

module.exports = new PaystackClient();
