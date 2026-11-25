const axios = require('axios');
const { MESSAGE_TYPES, createInboundMessage, ignored } = require('./channelMessage');
const { buildReplyKeyboard, parseCallbackData } = require('./telegramSuggestionService');
const { sendWithRetry } = require('./telegramDeliveryService');

class TelegramService {
  buildMessagePayload(chatId, text, options = {}) {
    const replyKeyboard = buildReplyKeyboard(options.suggestions);
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    };
    if (replyKeyboard.length > 0) {
      payload.reply_markup = {
        keyboard: replyKeyboard,
        resize_keyboard: true,
        one_time_keyboard: true,
      };
    } else if (options.removeKeyboard) {
      payload.reply_markup = { remove_keyboard: true };
    }
    return payload;
  }

  async sendMessage(botToken, chatId, text, options = {}) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload = this.buildMessagePayload(chatId, text, options);
    const response = await sendWithRetry(url, payload, { ...options, chatId });
    return response?.data;
  }

  async sendPhoto(botToken, chatId, photo, caption = '') {
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      chat_id: chatId,
      photo,
      ...(caption && { caption }),
    });
    return response.data;
  }

  async sendDocument(botToken, chatId, document, filename, caption = '') {
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      chat_id: chatId,
      document,
      ...(filename && { filename }),
      ...(caption && { caption }),
    });
    return response.data;
  }

  mapInboundMessage(body = {}) {
    if (body.callback_query) return this.mapCallbackQuery(body.callback_query);

    const message = body.message;
    if (!message) {
      return ignored('unsupported_event');
    }

    if (message.from?.is_bot) {
      return ignored('from_me');
    }

    if (message.chat?.type && message.chat.type !== 'private') {
      return ignored('group_message', { chatType: message.chat.type });
    }

    const type = this.getMessageType(message);
    if (!type) {
      return ignored('unsupported_type', { type: this.getRawMessageType(message) });
    }

    const firstName = message.from?.first_name || '';
    const lastName = message.from?.last_name || '';

    return createInboundMessage({
      channel: 'telegram',
      provider: 'telegram',
      externalMessageId: message.message_id,
      externalConversationId: message.chat?.id,
      sender: {
        externalUserId: message.from?.id || message.chat?.id,
        displayName: `${firstName} ${lastName}`.trim() || null,
        username: message.from?.username,
      },
      type,
      text: message.text || message.caption,
      media: this.getMedia(message, type),
      occurredAt: message.date ? new Date(message.date * 1000) : undefined,
      metadata: {
        chatType: message.chat?.type || null,
      },
    });
  }

  mapCallbackQuery(callbackQuery = {}) {
    const chat = callbackQuery.message?.chat;
    if (!chat) return ignored('unsupported_callback');
    if (chat.type && chat.type !== 'private') return ignored('group_callback', { chatType: chat.type });
    if (callbackQuery.from?.is_bot) return ignored('from_me');

    const suggestion = parseCallbackData(callbackQuery.data);
    if (!suggestion) return ignored('unsupported_callback');

    const firstName = callbackQuery.from?.first_name || '';
    const lastName = callbackQuery.from?.last_name || '';
    return createInboundMessage({
      channel: 'telegram',
      provider: 'telegram',
      externalMessageId: `callback-${callbackQuery.id}`,
      externalConversationId: chat.id,
      sender: {
        externalUserId: callbackQuery.from?.id || chat.id,
        displayName: `${firstName} ${lastName}`.trim() || null,
        username: callbackQuery.from?.username,
      },
      type: MESSAGE_TYPES.TEXT,
      // Le texte réel est résolu côté serveur depuis le message assistant.
      text: '__telegram_suggestion__',
      occurredAt: callbackQuery.message?.date ? new Date(callbackQuery.message.date * 1000) : undefined,
      metadata: { telegramSuggestion: suggestion, callbackQueryId: callbackQuery.id },
    });
  }

  async answerCallbackQuery(botToken, callbackQueryId) {
    const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
    const response = await axios.post(url, { callback_query_id: callbackQueryId });
    return response.data;
  }

  getMessageType(message) {
    if (typeof message.text === 'string') return MESSAGE_TYPES.TEXT;
    if (Array.isArray(message.photo) && message.photo.length > 0) return MESSAGE_TYPES.IMAGE;
    if (message.document) return MESSAGE_TYPES.DOCUMENT;
    if (message.voice) return MESSAGE_TYPES.VOICE;
    return null;
  }

  getRawMessageType(message) {
    return Object.keys(message).find((key) =>
      ['audio', 'video', 'sticker', 'animation', 'contact', 'location'].includes(key)
    ) || null;
  }

  getMedia(message, type) {
    if (type === MESSAGE_TYPES.IMAGE) {
      const photo = message.photo[message.photo.length - 1];
      return {
        reference: photo.file_id,
        sizeBytes: photo.file_size,
      };
    }

    const media = type === MESSAGE_TYPES.DOCUMENT ? message.document : message.voice;
    return {
      reference: media?.file_id,
      mimeType: media?.mime_type,
      fileName: media?.file_name,
      sizeBytes: media?.file_size,
      durationSeconds: media?.duration,
    };
  }

  async setWebhook(botToken, webhookUrl, secretToken) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
      const response = await axios.post(url, {
        url: webhookUrl,
        secret_token: secretToken,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur Telegram setWebhook:', error.response?.data || error.message);
      throw error;
    }
  }

  async deleteWebhook(botToken) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
      const response = await axios.post(url);
      return response.data;
    } catch (error) {
      console.error('Erreur Telegram deleteWebhook:', error.response?.data || error.message);
      throw error;
    }
  }

  async getMe(botToken) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/getMe`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Erreur Telegram getMe:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new TelegramService();
