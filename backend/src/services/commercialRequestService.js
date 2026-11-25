const { Op } = require('sequelize');
const { CommercialRequest, KnowledgeBase, User, Tenant } = require('../models');
const emailService = require('./emailService');

function extractQuantity(text) {
  const match = String(text || '').match(/\b(\d{1,4})\b/);
  return match ? Number(match[1]) : null;
}

function extractPhone(text, fallback) {
  if (fallback && /\d{8,}/.test(fallback)) return fallback;
  const match = String(text || '').match(/(?:\+?\d[\s.-]?){8,15}/);
  return match ? match[0].replace(/[^+\d]/g, '') : null;
}

function extractName(text, phone, fallback) {
  if (fallback && String(fallback).trim().length >= 2) return String(fallback).trim();
  const cleaned = String(text || '')
    .replace(phone || '', '')
    .replace(/\b(?:mon nom est|je suis|téléphone|tel|contact)\b/gi, '')
    .replace(/[\d+_.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length >= 2 && cleaned.length <= 150 ? cleaned : null;
}

async function notify(request, tenant) {
  const members = await User.findAll({
    where: { tenantId: tenant.id, isActive: true },
    // `preferredLocale` est nécessaire ici : chaque membre reçoit la
    // notification dans SA langue, pas dans une langue unique pour tous.
    attributes: ['email', 'preferredLocale'],
  });
  const product = request.knowledgeBaseId
    ? await KnowledgeBase.findOne({ where: { id: request.knowledgeBaseId, tenantId: tenant.id } })
    : null;
  const outcomes = await Promise.all(members.map(member => emailService.sendBestEffort({
    to: member.email,
    template: 'commercialRequest',
    data: {
      tenantName: tenant.name,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      customerEmail: request.customerEmail,
      quantity: request.quantity,
      productName: product?.title,
      category: request.reason === 'special_order' ? request.requestKey.split(':').pop() : null,
      reason: request.reason,
    },
    locale: member.preferredLocale || 'fr',
  })));
  await request.update({
    notificationStatus: outcomes.every(Boolean) ? 'sent' : 'partial',
    notifiedAt: new Date(),
  });
}

async function createRequest(conversation, tenant, flow, contact) {
  const identity = flow.productId || flow.category || 'general';
  const requestKey = `${conversation.id}:${identity}:${flow.reason}`;
  const [request] = await CommercialRequest.findOrCreate({
    where: { tenantId: tenant.id, requestKey },
    defaults: {
      tenantId: tenant.id,
      conversationId: conversation.id,
      knowledgeBaseId: flow.productId || null,
      requestKey,
      reason: flow.reason,
      quantity: flow.quantity || null,
      customerName: contact.name,
      customerPhone: contact.phone,
      customerEmail: contact.email || null,
      category: flow.reason === 'repair' ? 'repair' : (flow.reason === 'purchase' || flow.reason === 'special_order' ? 'order' : 'other'),
    },
  });
  if (request.notificationStatus !== 'sent') {
    setImmediate(() => notify(request, tenant).catch(error => {
      console.error('Notification commerciale échouée', { requestId: request.id, reason: error.message });
    }));
  }
  return request;
}

async function continueFlow({ conversation, tenant, text, userName, userEmail, userPhone }) {
  const flow = conversation.metadata?.commercialFlow;
  if (!flow || flow.stage === 'complete') return null;
  const quantity = flow.quantity || extractQuantity(text);
  if (flow.stage === 'quantity' && !quantity) return {
    response: 'Quelle quantité souhaitez-vous ?',
    commercialAction: flow,
  };
  const nextFlow = { ...flow, quantity, stage: 'contact' };
  const phone = extractPhone(text, userPhone);
  const name = extractName(text, phone, userName || conversation.userName);
  if (!phone || !name) return {
    response: `Merci${quantity ? `, quantité demandée : ${quantity}` : ''}. Indiquez maintenant votre nom et un numéro de téléphone pour que notre équipe vous recontacte.`,
    commercialAction: nextFlow,
  };
  const request = await createRequest(conversation, tenant, nextFlow, {
    name, phone, email: userEmail || conversation.userEmail,
  });
  return {
    response: 'Votre demande a bien été transmise à notre équipe. Un conseiller vous recontactera prochainement.',
    commercialAction: { ...nextFlow, stage: 'complete', requestId: request.id },
  };
}

function conversationUpdate(aiResponse, metadata = {}) {
  const action = aiResponse.commercialAction;
  return {
    status: action?.stage === 'complete' ? 'escalated' : 'active',
    metadata: { ...metadata, commercialFlow: action || metadata.commercialFlow || null },
  };
}

async function retryNotifications() {
  const requests = await CommercialRequest.findAll({
    where: { notificationStatus: { [Op.in]: ['pending', 'partial'] } },
    limit: 100,
  });
  let retried = 0;
  for (const request of requests) {
    const tenant = await Tenant.findOne({ where: { id: request.tenantId, isActive: true } });
    if (!tenant) continue;
    await notify(request, tenant);
    retried += 1;
  }
  return retried;
}

module.exports = {
  continueFlow, conversationUpdate, createRequest, notify, retryNotifications,
  extractQuantity, extractPhone, extractName,
};
