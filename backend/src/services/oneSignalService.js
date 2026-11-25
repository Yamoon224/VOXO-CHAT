const axios = require('axios');
const config = require('../config/config');

const ENDPOINT = 'https://api.onesignal.com/notifications';

function externalId(recipientType, recipientId) {
  return `${recipientType}:${recipientId}`;
}

function notificationUrl(url) {
  if (!url) return config.app.frontendUrl;
  return new URL(url, config.app.frontendUrl).toString();
}

function enabled() {
  return Boolean(config.oneSignal.appId && config.oneSignal.restApiKey);
}

async function send(notification) {
  if (!enabled()) return false;
  try {
    await axios.post(ENDPOINT, {
      app_id: config.oneSignal.appId,
      target_channel: 'push',
      include_aliases: { external_id: [externalId(notification.recipientType, notification.recipientId)] },
      headings: { fr: notification.title },
      contents: { fr: notification.body },
      url: notificationUrl(notification.url),
      data: { notificationId: notification.id, type: notification.type },
    }, {
      headers: { Authorization: `Key ${config.oneSignal.restApiKey}`, 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    return true;
  } catch (error) {
    console.error('Notification push OneSignal échouée', error.response?.data || error.message);
    return false;
  }
}

module.exports = { enabled, externalId, notificationUrl, send };
