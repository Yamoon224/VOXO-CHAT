const { WebSocket } = require('ws');
const { resolveTenant, resolveAdmin } = require('./socketAuthService');
const { channel } = require('./notificationService');
const { registerSocketRoute } = require('./socketRouterService');

function connect(identity) {
  return (ws, context) => {
    const unsubscribe = require('./eventBus').subscribe(channel(...identity(context)), event => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
    });
    ws.once('close', unsubscribe); ws.once('error', unsubscribe);
  };
}
function registerNotificationSockets() {
  registerSocketRoute(path => path === '/api/notifications/socket', resolveTenant, connect(context => ['user', context.user.id]));
  registerSocketRoute(path => path === '/api/admin/notifications/socket', resolveAdmin, connect(context => ['admin', context.admin.id]));
}
module.exports = { registerNotificationSockets };
