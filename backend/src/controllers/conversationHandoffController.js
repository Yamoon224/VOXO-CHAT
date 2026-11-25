const handoffService = require('../services/conversationHandoffService');
const channelOutboundService = require('../services/channelOutboundService');
const widgetAttachmentService = require('../services/widgetAttachmentService');
const { successResponse } = require('../utils/responseUtils');
const { logChannelEvent } = require('../utils/channelLogger');
const planService = require('../services/planService');

function response(res, data, message) { return successResponse(res, { conversation: data, handoff: handoffService.handoffView(data) }, message); }
async function take(req, res, next) { try { response(res, await handoffService.takeHandoff({ tenantId: req.tenant.id, sessionId: req.params.sessionId, actor: req.user }), 'Conversation prise en charge'); } catch (error) { next(error); } }
async function returnToAi(req, res, next) { try { response(res, await handoffService.returnToAi({ tenantId: req.tenant.id, sessionId: req.params.sessionId, actor: req.user }), 'Conversation rendue à l’IA'); } catch (error) { next(error); } }
// Un renvoi du même message ne doit pas être ignoré tant que la livraison a échoué,
// sinon la relance annoncée au conseiller n'atteint jamais le client.
function shouldDeliver({ internal, duplicate, previousStatus }) {
  if (internal) return false;
  return !duplicate || previousStatus === 'failed';
}

async function deliver(req, result, attachment, previousStatus) {
  const context = {
    channel: result.conversation.channel, tenantId: req.tenant.id,
    sessionId: req.params.sessionId, messageId: result.message.id,
  };
  const setStatus = status => handoffService.setAgentDeliveryStatus({ ...context, status });
  try {
    await channelOutboundService.sendChannelMessage(req.tenant, result.conversation, result.message.content, attachment ? [attachment] : []);
    if (previousStatus === 'failed') await setStatus('sent');
    return { deliveryStatus: 'sent', deliveryError: null };
  } catch (error) {
    logChannelEvent('error', 'agent_message.delivery_failed', { ...context, errorCode: error.code || null, error });
    await setStatus('failed');
    return { deliveryStatus: 'failed', deliveryError: error.code || null };
  }
}

async function send(req, res, next) {
  try {
    const internal = String(req.body.internal) === 'true' || req.body.internal === true;
    const plan = await planService.getPlan(req.tenant.subscriptionPlan);
    if (req.file && !internal && plan.allowAgentAttachments === false) {
      return res.status(403).json({ success: false, error: "L'envoi de documents par les agents n'est pas inclus dans votre forfait.", code: 'PLAN_AGENT_ATTACHMENTS_DISABLED' });
    }
    const attachment = req.file ? await widgetAttachmentService.receive(req.tenant, req.file) : null;
    const result = await handoffService.addAgentMessage({ tenantId: req.tenant.id, sessionId: req.params.sessionId, actor: req.user, content: req.body.content, internal, attachments: attachment ? [attachment] : [], clientMessageId: req.body.clientMessageId });
    const previousStatus = result.message.metadata?.deliveryStatus || 'sent';
    const delivery = shouldDeliver({ internal, duplicate: result.duplicate, previousStatus })
      ? await deliver(req, result, attachment, previousStatus)
      : { deliveryStatus: previousStatus, deliveryError: null };
    successResponse(res, { message: result.message, duplicate: result.duplicate, ...delivery }, delivery.deliveryStatus === 'failed' ? 'Réponse enregistrée mais non livrée au client' : (internal ? 'Note ajoutée' : 'Réponse envoyée'));
  } catch (error) { next(error); }
}
module.exports = { take, returnToAi, send };
