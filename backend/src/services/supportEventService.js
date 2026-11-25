const bus = require('./eventBus');

const adminChannel = ticketId => `support:admin:${ticketId}`;
const tenantChannel = (tenantId, ticketId) => `support:tenant:${tenantId}:${ticketId}`;

function publish({ ticketId, tenantId, internal = false, type = 'support.changed' }) {
  const event = { type, ticketId };
  bus.publish(adminChannel(ticketId), event);
  if (!internal) bus.publish(tenantChannel(tenantId, ticketId), event);
}

module.exports = { publish, adminChannel, tenantChannel };
