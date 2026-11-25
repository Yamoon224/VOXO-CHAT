const { Conversation, ConversationAlert, User, Tenant, sequelize } = require('../models');
const quotaService = require('./quotaService');
const mobilePushService = require('./mobilePushService');
const { hasPermission } = require('../config/permissions');
const emailService = require('./emailService');
const { AppError } = require('../middleware/errorMiddleware');
const { v4: uuidv4 } = require('uuid');
const events = require('./conversationEventService');
const attachmentContextService = require('./attachmentContextService');
const storageService = require('./storageService');
const notifications = require('./notificationService');
const { findTenantAdmins } = require('./tenantNotificationRecipients');

const REQUEST_PATTERN = /\b(conseiller|conseillere|humain|humaine|service client|parler.{0,12}(quelqu|agent)|contact(er)?\s+(un|une))/i;
const ORDER_PATTERN = /\b(commander|commande|acheter|achat|passer.{0,12}commande|devis)\b/i;
const WAITING_MESSAGE = 'Votre demande a bien été transmise à notre équipe. Un conseiller vous répondra ici dès que possible.';

function detectExplicitReason(message) {
  if (REQUEST_PATTERN.test(message)) return 'conseiller';
  return null;
}

function detectCommercialIntent(message) {
  if (ORDER_PATTERN.test(message)) return 'commande';
  return null;
}

function detectReason(message, aiResponse = null) {
  const explicit = detectExplicitReason(message) || detectCommercialIntent(message);
  if (explicit) return explicit;
  if (aiResponse && !aiResponse.sources?.length && /\?/.test(message) && !aiResponse.socialOnly) return 'limite_ia';
  return null;
}

function actorName(user) { return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email; }

function topicTerms(message) {
  return [...new Set(String(message || '').toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || [])]
    .filter(word => !['avec', 'pour', 'dans', 'vous', 'nous', 'avoir', 'faire', 'parler', 'conseiller', 'commande'].includes(word));
}

function canOfferForMessage(conversation, message) {
  if (conversation.metadata?.handoffAutoOfferDisabled) return false;
  // Hors d'une reprise déjà ouverte, l'offre de secours reste disponible.
  if (conversation.handoffStatus !== 'waiting') return true;
  const topics = conversation.metadata?.handoffTopics || [];
  const terms = topicTerms(message);
  return topics.some(topic => (topic.terms || []).some(term => terms.includes(term)));
}

function handoffView(conversation) {
  return {
    status: conversation.handoffStatus, reason: conversation.handoffReason,
    requestedAt: conversation.handoffRequestedAt, takenAt: conversation.humanTakenAt,
    assignedAgent: conversation.assignedAgent ? { id: conversation.assignedAgent.id, name: actorName(conversation.assignedAgent) } : null,
  };
}

async function notify(alert, conversation, tenant) {
  const users = await User.findAll({ where: { tenantId: tenant.id, isActive: true } });
  const targets = users.filter(user => hasPermission(user, 'conversations', 'write'));
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/conversations/details?id=${conversation.sessionId}`;
  // Un envoi par destinataire, chacun dans SA langue (`preferredLocale`) :
  // l'alerte part vers plusieurs membres qui n'ont pas forcément la même.
  const outcomes = await Promise.all(targets.map(user => emailService.sendBestEffort({
    to: user.email, template: 'humanHandoff', data: {
      tenantName: tenant.name, reason: alert.reason, customerName: conversation.userName,
      channel: conversation.channel, lastMessage: [...(conversation.messages || [])].reverse().find(item => item.role === 'user')?.content,
      conversationUrl: url,
    },
    locale: user.preferredLocale || 'fr',
  })));
  await alert.update({ emailStatus: outcomes.every(Boolean) ? 'sent' : 'partial' });
}

async function requestHandoff({ conversation, tenant, reason, topic }) {
  if (!reason || conversation.handoffStatus === 'human') return { requested: false, handoff: handoffView(conversation) };
  if (conversation.handoffStatus === 'waiting') return { requested: false, handoff: handoffView(conversation) };
  const now = new Date();
  const lastUserMessage = [...(conversation.messages || [])].reverse().find(item => item.role === 'user');
  const topicText = topic || lastUserMessage?.content || '';
  const handoffTopics = [...(conversation.metadata?.handoffTopics || []), {
    text: topicText, terms: topicTerms(topicText), reason, requestedAt: now.toISOString(),
  }].slice(-5);
  await conversation.update({ handoffStatus: 'waiting', handoffReason: reason, handoffRequestedAt: now, status: 'escalated', metadata: { ...conversation.metadata, handoffTopics } });
  const [alert] = await ConversationAlert.findOrCreate({
    where: { tenantId: tenant.id, conversationId: conversation.id, status: 'open' },
    defaults: { tenantId: tenant.id, conversationId: conversation.id, reason },
  });
  setImmediate(() => notify(alert, conversation, tenant).catch(error => console.error('Alerte reprise humaine échouée', error.message)));
  events.publish(tenant.id, conversation.sessionId, { type: 'handoff', handoff: handoffView(conversation) });
  const recipients = await findTenantAdmins(tenant.id);
  await Promise.all(recipients.map(user => notifications.notify({
    recipientType: 'user', recipientId: user.id, tenantId: tenant.id, type: 'conversation.handoff',
    title: 'Conversation \u00e0 reprendre', body: `${conversation.userName || 'Un visiteur'} demande une assistance`,
    url: `/dashboard/conversations/details?sessionId=${conversation.sessionId}`,
    dedupeKey: `handoff:${conversation.id}:${now.toISOString()}`,
  })));
  return { requested: true, handoff: handoffView(conversation) };
}

async function getConversation(tenantId, sessionId) {
  const conversation = await Conversation.findOne({ where: { tenantId, sessionId }, include: [{ model: User, as: 'assignedAgent', attributes: ['id', 'firstName', 'lastName', 'email'] }] });
  if (!conversation) throw new AppError('Conversation introuvable', 404, { code: 'CONVERSATION_NOT_FOUND' });
  return conversation;
}

async function takeHandoff({ tenantId, sessionId, actor }) {
  const conversation = await getConversation(tenantId, sessionId);
  if (conversation.status === 'ended' || conversation.handoffStatus === 'ended') throw new AppError('Cette conversation est terminée', 409, { code: 'CONVERSATION_ENDED' });
  if (conversation.handoffStatus === 'human' && conversation.assignedAgentId !== actor.id) {
    throw new AppError('Cette conversation est déjà prise en charge par un autre conseiller', 409, { code: 'CONVERSATION_ALREADY_ASSIGNED' });
  }
  if (conversation.handoffStatus === 'human') return conversation;
  await conversation.update({ handoffStatus: 'human', handoffReason: conversation.handoffStatus === 'ai' ? 'intervention_equipe' : conversation.handoffReason, assignedAgentId: actor.id, humanTakenAt: new Date(), status: 'escalated' });
  await ConversationAlert.update({ status: 'handled' }, { where: { tenantId, conversationId: conversation.id, status: 'open' } });
  const updated = await getConversation(tenantId, sessionId);
  events.publish(tenantId, sessionId, { type: 'handoff', handoff: handoffView(updated) });
  return updated;
}

async function returnToAi({ tenantId, sessionId, actor }) {
  const conversation = await getConversation(tenantId, sessionId);
  if (conversation.status === 'ended' || conversation.handoffStatus === 'ended') throw new AppError('Cette conversation est terminée', 409, { code: 'CONVERSATION_ENDED' });
  if (conversation.assignedAgentId && conversation.assignedAgentId !== actor.id) throw new AppError('Seul le conseiller assigné peut rendre la conversation à l’IA', 403, { code: 'HANDOFF_NOT_ASSIGNED' });
  await conversation.update({ handoffStatus: 'ai', handoffReason: null, assignedAgentId: null, humanTakenAt: null, status: 'active', metadata: { ...conversation.metadata, handoffOffer: null, handoffTopics: [], handoffAutoOfferDisabled: true } });
  const updated = await getConversation(tenantId, sessionId);
  events.publish(tenantId, sessionId, { type: 'handoff', handoff: handoffView(updated) });
  return updated;
}

async function addAgentMessage({ tenantId, sessionId, actor, content, internal = false, attachments = [], clientMessageId }) {
  const messageId = clientMessageId || uuidv4();
  if (internal && attachments.length) throw new AppError('Une note interne ne peut pas contenir de pièce jointe.', 400, { code: 'INTERNAL_NOTE_ATTACHMENT_FORBIDDEN' });
  if (!String(content || '').trim() && !attachments.length) throw new AppError('Un message ou une pièce jointe est requis.', 400, { code: 'AGENT_MESSAGE_REQUIRED' });
  if (!internal) {
    const current = await getConversation(tenantId, sessionId);
    if (!(current.messages || []).some(item => item.id === messageId)) {
      const tenant = await Tenant.findByPk(tenantId);
      await quotaService.assertCanSendMessage(tenant, 1);
    }
  }
  // Une URL indisponible ne doit jamais laisser un message persistant sans livraison.
  const preparedAttachments = await Promise.all(attachments.map(async item => ({
    attachment: item,
    public: { ...item.toPublicJSON(), url: await storageService.createSignedUrl(item.storageKey, tenantId) },
  })));
  let message;
  let duplicate = false;
  await sequelize.transaction(async transaction => {
    const conversation = await Conversation.findOne({
      where: { tenantId, sessionId }, transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!conversation) throw new AppError('Conversation introuvable', 404, { code: 'CONVERSATION_NOT_FOUND' });
    if (conversation.status === 'ended' || conversation.handoffStatus === 'ended') throw new AppError('Cette conversation est terminée', 409, { code: 'CONVERSATION_ENDED' });
    if (conversation.handoffStatus !== 'human') throw new AppError('Prenez en charge la conversation avant de répondre', 409, { code: 'HANDOFF_REQUIRED' });
    if (conversation.assignedAgentId !== actor.id) throw new AppError('Cette conversation est attribuée à un autre conseiller', 403, { code: 'HANDOFF_NOT_ASSIGNED' });
    message = (conversation.messages || []).find(item => item.id === messageId);
    if (message) { duplicate = true; return; }
    message = {
      id: messageId, role: internal ? 'internal_note' : 'agent', content: String(content || '').trim(), timestamp: new Date().toISOString(),
      metadata: { agentId: actor.id, agentName: actorName(actor), deliveryStatus: internal ? 'internal' : 'sent' },
      ...(attachments.length && { attachments: attachments.map(item => item.toPublicJSON()) }),
    };
    const reservedAttachments = await attachmentContextService.reserveForMessage(
      tenantId, attachments.map(item => item.id), message.id, transaction
    );
    await conversation.update({ messages: [...(conversation.messages || []), message] }, { transaction });
    await attachmentContextService.attachToMessage(reservedAttachments, tenantId, conversation.id, message.id, transaction);
  });
  const conversation = await getConversation(tenantId, sessionId);
  const publicMessage = duplicate || !preparedAttachments.length
    ? message
    : { ...message, attachments: preparedAttachments.map(item => item.public) };
  if (!internal && !duplicate) events.publish(tenantId, sessionId, { type: 'message', message: publicMessage, handoff: handoffView(conversation) });
  if (!internal && !duplicate) await quotaService.incrementMessageUsage(tenantId);
  // Application fermée : une notification prévient le visiteur (sans effet s'il a un socket ouvert).
  if (!internal && !duplicate) mobilePushService.notifyAgentMessage({ tenantId, sessionId, message: publicMessage, agentName: message.metadata?.agentName });
  return { conversation, message: publicMessage, duplicate };
}

async function setAgentDeliveryStatus({ tenantId, sessionId, messageId, status }) {
  const conversation = await getConversation(tenantId, sessionId);
  const messages = (conversation.messages || []).map(message => message.id === messageId
    ? { ...message, metadata: { ...message.metadata, deliveryStatus: status } }
    : message);
  await conversation.update({ messages });
  return conversation;
}

module.exports = { WAITING_MESSAGE, detectReason, detectExplicitReason, detectCommercialIntent, canOfferForMessage, requestHandoff, takeHandoff, returnToAi, addAgentMessage, setAgentDeliveryStatus, getConversation, handoffView };
