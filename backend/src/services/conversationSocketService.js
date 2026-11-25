const { WebSocket } = require('ws');
const { URL } = require('url');
const { Tenant } = require('../models');
const events = require('./conversationEventService');
const handoffService = require('./conversationHandoffService');
const typingService = require('./conversationTypingService');
const { registerSocketRoute } = require('./socketRouterService');
const visitorPresence = require('./visitorPresence');
const { appIdVerdict, logAppIdMismatch } = require('../middleware/widgetOriginGuard');

function isSocketPath(pathname) { return /^\/api\/widget\/conversation\/[^/]+\/socket$/.test(pathname); }
function sessionId(pathname) { return pathname.split('/')[4]; }
function typingEnabled(tenant) { return tenant.settings?.chatbot?.options?.features?.liveTypingPreview === true; }

async function authorize(request) {
  const url = new URL(request.url, 'http://localhost');
  const tenantId = url.searchParams.get('tenantId');
  const id = sessionId(url.pathname);
  if (!tenantId || !id) return null;
  const tenant = await Tenant.findOne({ where: { id: tenantId, isActive: true }, attributes: ['id', 'settings', 'allowedAppIds', 'enforceAppIds'] });
  if (!tenant) return null;
  // Même contrôle que le REST : un client natif n'envoie pas d'Origin, et passe l'appId en query.
  const appId = url.searchParams.get('appId');
  const verdict = appIdVerdict(tenant, { origin: request.headers?.origin, appId });
  if (!verdict.ok) {
    logAppIdMismatch(tenant, appId, url.pathname, verdict.blocked);
    if (verdict.blocked) return null;
  }
  // Une session neuve ouvre sa socket avant d'avoir créé sa conversation : on
  // autorise la connexion sans conversation, l'aperçu de saisie restant bloqué
  // tant qu'aucune prise en charge humaine n'est constatée.
  const conversation = await handoffService.getConversation(tenantId, id).catch(() => null);
  return {
    tenantId, sessionId: id, typingEnabled: typingEnabled(tenant),
    handoff: conversation ? handoffService.handoffView(conversation) : null
  };
}

function registerConversationSockets() {
  registerSocketRoute(isSocketPath, authorize, (ws, context) => {
    const state = typingService.createTypingState(context.handoff?.status, context.typingEnabled);
    const send = event => {
      typingService.trackHandoff(state, event);
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
    };
    const unsubscribe = events.subscribe(context.tenantId, context.sessionId, send);
    send({ type: 'conversation.sync', ...(context.handoff ? { handoff: context.handoff } : {}) });
    typingService.attachTypingInbound(ws, context, state);
    const leave = visitorPresence.add(context.tenantId, context.sessionId);
    const release = () => { unsubscribe(); leave(); };
    ws.on('close', release);
    ws.on('error', release);
  });
}

module.exports = { registerConversationSockets };
