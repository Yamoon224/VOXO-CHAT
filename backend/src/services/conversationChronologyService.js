function sortMessages(messages = []) {
  return messages.map((message, index) => ({ message, index })).sort((left, right) => {
    const leftTime = Date.parse(left.message.timestamp);
    const rightTime = Date.parse(right.message.timestamp);
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime) || leftTime === rightTime) return left.index - right.index;
    return leftTime - rightTime;
  }).map(item => item.message);
}

// Durée en secondes entre la création et la dernière activité (ou la fin) de la conversation.
function conversationDuration(conversation = {}) {
  const start = Date.parse(conversation.createdAt);
  const end = Date.parse(conversation.endedAt || conversation.updatedAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  return Math.round((end - start) / 1000);
}

module.exports = { sortMessages, conversationDuration };
