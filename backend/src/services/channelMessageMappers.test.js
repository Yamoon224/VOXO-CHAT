jest.mock('../config/config', () => ({ whatsapp: { graphApiUrl: 'https://graph.example', apiVersion: 'v22.0', timeoutMs: 1000 } }));

const whatsappService = require('./whatsappService');

test('maps Cloud API image media to the canonical message shape', () => {
  const result = whatsappService.mapInboundMessage({ entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: 'phone-1' }, messages: [{ id: 'id-1', from: '2250102030405', timestamp: '1780000000', type: 'image', image: { id: 'media-1', mime_type: 'image/jpeg' } }] } }] }] });
  expect(result.message).toMatchObject({ provider: 'meta', type: 'image', media: { reference: 'media-1', mimeType: 'image/jpeg' } });
});
