jest.mock('../config/config', () => ({ whatsapp: { graphApiUrl: 'https://graph.example', apiVersion: 'v22.0', timeoutMs: 1000 } }));

const crypto = require('crypto');
const whatsappService = require('./whatsappService');

test('validates Meta webhook signatures and challenges', () => {
  const body = '{"object":"whatsapp_business_account"}';
  const secret = 'app-secret';
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  expect(whatsappService.verifySignature({ 'x-hub-signature-256': signature }, body, secret)).toBe(true);
  expect(whatsappService.verifyWebhookChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 'token', 'hub.challenge': 'challenge' }, 'token')).toBe('challenge');
});

test('maps a Cloud API text message into the canonical channel format', () => {
  const result = whatsappService.mapInboundMessage({ entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: 'phone-1' }, contacts: [{ wa_id: '2250102030405', profile: { name: 'Alice' } }], messages: [{ id: 'wamid.1', from: '2250102030405', timestamp: '1780000000', type: 'text', text: { body: 'Bonjour' } }] } }] }] });
  expect(result.message).toMatchObject({ provider: 'meta', externalMessageId: 'wamid.1', externalConversationId: '2250102030405', text: 'Bonjour' });
});
