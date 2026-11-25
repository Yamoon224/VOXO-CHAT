const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/config');
const { AppError } = require('../middleware/errorMiddleware');
const { MESSAGE_TYPES, createInboundMessage, ignored } = require('./channelMessage');

function graphUrl(path) { return `/${config.whatsapp?.apiVersion || 'v22.0'}${path}`; }

class WhatsAppService {
  constructor() {
    this.client = axios.create({
      baseURL: config.whatsapp?.graphApiUrl || 'https://graph.facebook.com',
      timeout: config.whatsapp?.timeoutMs || 10000,
    });
  }

  headers(accessToken) {
    if (!accessToken) {
      throw new AppError('Le jeton d’accès WhatsApp est requis', 400, {
        code: 'WHATSAPP_ACCESS_TOKEN_REQUIRED',
      });
    }
    return { Authorization: `Bearer ${accessToken}` };
  }

  async request(method, path, accessToken, data, responseType) {
    const response = await this.client.request({ method, url: graphUrl(path), data, responseType, headers: this.headers(accessToken) });
    return response.data;
  }

  verifySignature(headers = {}, rawBody = '', appSecret) {
    const signature = headers['x-hub-signature-256'];
    if (!signature || !rawBody || !appSecret) return false;
    const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
    const actual = Buffer.from(String(signature));
    const wanted = Buffer.from(expected);
    return actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted);
  }

  verifyWebhookChallenge(query = {}, verifyToken) {
    return query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === verifyToken && query['hub.challenge'];
  }

  mapInboundMessage(body = {}) {
    const change = body.entry?.[0]?.changes?.find((item) => item.field === 'messages');
    const value = change?.value;
    const message = value?.messages?.[0];
    if (!message) return ignored('unsupported_event');
    const type = this.getMessageType(message.type);
    if (!type) return ignored('unsupported_type', { type: message.type });
    const contact = value.contacts?.find((item) => item.wa_id === message.from);
    const media = message[message.type] || {};
    return createInboundMessage({
      channel: 'whatsapp', provider: 'meta', externalMessageId: message.id, externalConversationId: message.from,
      sender: { externalUserId: message.from, displayName: contact?.profile?.name || message.from, username: null },
      type, text: message.text?.body || media.caption || null,
      media: { reference: media.id, mimeType: media.mime_type, fileName: media.filename, sizeBytes: null, durationSeconds: null },
      occurredAt: message.timestamp ? Number(message.timestamp) * 1000 : null,
      metadata: { phoneNumberId: value.metadata?.phone_number_id || null, displayPhoneNumber: value.metadata?.display_phone_number || null },
    });
  }

  getMessageType(type) {
    if (type === 'text') return MESSAGE_TYPES.TEXT;
    if (type === 'image') return MESSAGE_TYPES.IMAGE;
    if (type === 'document') return MESSAGE_TYPES.DOCUMENT;
    if (type === 'audio') return MESSAGE_TYPES.VOICE;
    return null;
  }

  getPhoneNumber(phoneNumberId, accessToken) {
    return this.request('get', `/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`, accessToken);
  }

  sendMessage(phoneNumberId, accessToken, to, text) {
    return this.request('post', `/${phoneNumberId}/messages`, accessToken, { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } });
  }

  sendImage(phoneNumberId, accessToken, to, link, caption = '') { return this.sendMedia(phoneNumberId, accessToken, to, 'image', { link, caption }); }
  sendDocument(phoneNumberId, accessToken, to, link, filename, caption = '') { return this.sendMedia(phoneNumberId, accessToken, to, 'document', { link, filename, caption }); }
  sendMedia(phoneNumberId, accessToken, to, type, media) { return this.request('post', `/${phoneNumberId}/messages`, accessToken, { messaging_product: 'whatsapp', to, type, [type]: media }); }
  getMedia(mediaId, accessToken) { return this.request('get', `/${mediaId}`, accessToken); }

  async downloadMedia(mediaId, accessToken) {
    const media = await this.getMedia(mediaId, accessToken);
    const response = await axios.get(media.url, { responseType: 'arraybuffer', timeout: config.whatsapp.timeoutMs, headers: this.headers(accessToken) });
    return { buffer: Buffer.from(response.data), mimeType: media.mime_type, fileName: media.filename || null };
  }
}

module.exports = new WhatsAppService();
