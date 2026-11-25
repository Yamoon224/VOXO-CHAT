const channelStatusController = require('./channelStatusController');
const telegramChannelController = require('./telegramChannelController');
const telegramWebhookController = require('./telegramWebhookController');
const whatsappChannelController = require('./whatsappChannelController');
const whatsappWebhookController = require('./whatsappWebhookController');

module.exports = {
  ...channelStatusController,
  ...telegramChannelController,
  ...telegramWebhookController,
  ...whatsappChannelController,
  ...whatsappWebhookController,
};
