const eventBus = require('./eventBus');

function topic(tenantId, sessionId) { return `conv:${tenantId}:${sessionId}`; }
function listTopic(tenantId) { return `conversation-list:${tenantId}`; }
function publish(tenantId, sessionId, event) {
  eventBus.publish(topic(tenantId, sessionId), event);
  eventBus.publish(listTopic(tenantId), {
    type: 'conversation.list.changed', sessionId,
    changeType: event?.type || 'updated',
  });
  if (event?.message?.role === 'user') {
    require('./conversationPriorityService').schedule(tenantId, sessionId);
  }
}
function subscribe(tenantId, sessionId, listener) {
  const key = topic(tenantId, sessionId);
  return eventBus.subscribe(key, listener);
}
function subscribeList(tenantId, listener) { return eventBus.subscribe(listTopic(tenantId), listener); }

module.exports = { publish, subscribe, subscribeList, listTopic };
