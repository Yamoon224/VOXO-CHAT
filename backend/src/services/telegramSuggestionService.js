const CALLBACK_PREFIX = 'sg';
const MAX_SUGGESTIONS = 3;
const MAX_BUTTON_LABEL_LENGTH = 64;

function buildCallbackData(assistantMessageId, index) {
  if (typeof assistantMessageId !== 'string' || !Number.isInteger(index) || index < 0 || index >= MAX_SUGGESTIONS) {
    return null;
  }
  const value = `${CALLBACK_PREFIX}:${assistantMessageId}:${index}`;
  return Buffer.byteLength(value, 'utf8') <= 64 ? value : null;
}

function parseCallbackData(value) {
  const match = typeof value === 'string'
    ? new RegExp(`^${CALLBACK_PREFIX}:([A-Za-z0-9-]{1,58}):([0-2])$`).exec(value)
    : null;
  if (!match) return null;
  return { assistantMessageId: match[1], index: Number(match[2]) };
}

function buttonLabel(suggestion) {
  const text = String(suggestion || '').trim().replace(/\s+/g, ' ');
  return text.length > MAX_BUTTON_LABEL_LENGTH
    ? `${text.slice(0, MAX_BUTTON_LABEL_LENGTH - 1)}…`
    : text;
}

function buildInlineKeyboard(assistantMessageId, suggestions = []) {
  return suggestions
    .slice(0, MAX_SUGGESTIONS)
    .map((suggestion, index) => {
      const text = buttonLabel(suggestion);
      const callbackData = buildCallbackData(assistantMessageId, index);
      return text && callbackData ? [{ text, callback_data: callbackData }] : null;
    })
    .filter(Boolean);
}

function buildReplyKeyboard(suggestions = []) {
  return suggestions
    .slice(0, MAX_SUGGESTIONS)
    .map(buttonLabel)
    .filter(Boolean)
    .map(text => [{ text }]);
}

module.exports = { buildInlineKeyboard, buildReplyKeyboard, parseCallbackData, buildCallbackData };
