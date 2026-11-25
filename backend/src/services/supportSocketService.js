const { WebSocket } = require('ws');
const { SupportTicket } = require('../models');
const { hasPermission } = require('../config/adminPermissions');
const tickets = require('./supportTicketService');
const events = require('./supportEventService');
const { resolveTenant, resolveAdmin } = require('./socketAuthService');
const { registerSocketRoute } = require('./socketRouterService');

const tenantPattern = /^\/api\/tenant\/support\/([^/]+)\/socket$/;
const adminPattern = /^\/api\/admin\/support\/([^/]+)\/socket$/;
const ticketId = pathname => pathname.split('/').slice(-2)[0];

async function authorizeTenant(request, url) {
  const context = await resolveTenant(request);
  if (!context) return null;
  const ticket = await SupportTicket.findOne({ where: { id: ticketId(url.pathname), tenantId: context.user.tenantId } });
  return ticket && tickets.canRead(ticket, context.user) ? { ...context, ticket } : null;
}
async function authorizeAdmin(request, url) {
  const context = await resolveAdmin(request);
  if (!context || !hasPermission(context.admin, 'support', 'read')) return null;
  const ticket = await SupportTicket.findByPk(ticketId(url.pathname));
  return ticket && (!ticket.assignedAdminId || ticket.assignedAdminId === context.admin.id)
    ? { ...context, ticket }
    : null;
}
function connect(channelFor, verifyAccess) {
  return (ws, context) => {
    const unsubscribe = require('./eventBus').subscribe(channelFor(context.ticket), async event => {
      if (verifyAccess && !(await verifyAccess(context))) return ws.close(4003, 'Ticket attribu\u00e9');
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
    });
    ws.once('close', unsubscribe); ws.once('error', unsubscribe);
  };
}
function registerSupportSockets() {
  registerSocketRoute(path => tenantPattern.test(path), authorizeTenant, connect(ticket => events.tenantChannel(ticket.tenantId, ticket.id)));
  registerSocketRoute(path => adminPattern.test(path), authorizeAdmin, connect(
    ticket => events.adminChannel(ticket.id),
    async context => {
      const current = await SupportTicket.findByPk(context.ticket.id);
      return Boolean(current && (!current.assignedAdminId || current.assignedAdminId === context.admin.id));
    },
  ));
}
module.exports = { registerSupportSockets };
