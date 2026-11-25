const chatMessageService = require('../services/chatMessageService');
const { buildClientContext } = require('../services/clientContextService');
const { successResponse } = require('../utils/responseUtils');

async function sendMessage(req, res, next) {
  try {
    const data = await chatMessageService.processMessage({
      tenant: req.tenant,
      payload: req.body,
      requestMetadata: await buildClientContext(req),
    });
    const message = data.idempotentReplay
      ? 'Message déjà traité'
      : 'Message traité avec succès';
    return successResponse(res, data, message);
  } catch (error) {
    return next(error);
  }
}

module.exports = { sendMessage };
