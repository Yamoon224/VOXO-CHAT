const whatsappService = require('./whatsappService');
const telegramService = require('./telegramService');
const { AppError } = require('../middleware/errorMiddleware');
const storageService = require('./storageService');

function resolveDestination(conversation) {
  return conversation.metadata?.externalConversationId || conversation.metadata?.chatId || conversation.externalUserId || null;
}

async function sendTelegram(tenant, destination, content, attachment) {
  const token = tenant.settings?.channels?.telegram?.botToken;
  if (!token) throw new AppError('Telegram n’est pas configuré', 409, { code: 'CHANNEL_NOT_CONFIGURED' });
  if (!attachment) return telegramService.sendMessage(token, destination, content, { removeKeyboard: true });
  const url = await storageService.createSignedUrl(attachment.storageKey, tenant.id);
  return attachment.category === 'image' ? telegramService.sendPhoto(token, destination, url, content) : telegramService.sendDocument(token, destination, url, attachment.originalName, content);
}

async function sendWhatsApp(tenant, destination, content, attachment) {
  const settings = tenant.settings?.channels?.whatsapp || {};
  if (!settings.phoneNumberId || !settings.accessToken) throw new AppError('WhatsApp n’est pas configuré', 409, { code: 'CHANNEL_NOT_CONFIGURED' });
  if (!attachment) return whatsappService.sendMessage(settings.phoneNumberId, settings.accessToken, destination, content);
  const url = await storageService.createSignedUrl(attachment.storageKey, tenant.id);
  return attachment.category === 'image' ? whatsappService.sendImage(settings.phoneNumberId, settings.accessToken, destination, url, content) : whatsappService.sendDocument(settings.phoneNumberId, settings.accessToken, destination, url, attachment.originalName, content);
}

async function sendChannelMessage(tenant, conversation, content, attachments = []) {
  if (conversation.channel === 'web') return;
  const destination = resolveDestination(conversation);
  if (!destination) throw new AppError('Le destinataire du canal est introuvable', 409, { code: 'CHANNEL_DESTINATION_MISSING' });
  if (conversation.channel === 'telegram') return sendTelegram(tenant, destination, content, attachments[0]);
  return sendWhatsApp(tenant, destination, content, attachments[0]);
}

module.exports = { sendChannelMessage, resolveDestination };
