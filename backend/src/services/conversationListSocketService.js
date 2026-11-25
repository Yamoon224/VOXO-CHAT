const { WebSocket } = require('ws');
const { hasPermission } = require('../config/permissions');
const { resolveTenant } = require('./socketAuthService');
const events = require('./conversationEventService');
const { registerSocketRoute } = require('./socketRouterService');

async function authorize(request) {
  const context = await resolveTenant(request);
  return context && hasPermission(context.user, 'conversations', 'read') ? context : null;
}

function connect(ws, context) {
  const unsubscribe = events.subscribeList(context.user.tenantId, event => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
  });
  ws.once('close', unsubscribe);
  ws.once('error', unsubscribe);
}

function registerConversationListSockets() {
  registerSocketRoute(path => path === '/api/conversations/socket', authorize, connect);
}

module.exports = { registerConversationListSockets, authorize };
