const MESSAGE_TYPES = Object.freeze({
  TEXT: 'text',
  IMAGE: 'image',
  DOCUMENT: 'document',
  VOICE: 'voice',
});

const MESSAGE_TYPE_VALUES = Object.freeze(Object.values(MESSAGE_TYPES));

function ignored(reason, context = {}) {
  return {
    status: 'ignored',
    reason,
    context,
  };
}

function optionalString(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return String(value);
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizeTimestamp(value) {
  if (!value) {
    return new Date().toISOString();
  }

  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function normalizeMedia(media = {}) {
  return {
    reference: optionalString(media.reference),
    mimeType: optionalString(media.mimeType),
    fileName: optionalString(media.fileName),
    sizeBytes: optionalNumber(media.sizeBytes),
    durationSeconds: optionalNumber(media.durationSeconds),
  };
}

function validateRequiredFields(input) {
  const missingFields = [];

  if (!input.channel) missingFields.push('channel');
  if (!input.provider) missingFields.push('provider');
  if (!input.externalMessageId) missingFields.push('externalMessageId');
  if (!input.externalConversationId) missingFields.push('externalConversationId');
  if (!input.sender?.externalUserId) missingFields.push('sender.externalUserId');

  return missingFields;
}

function createInboundMessage(input = {}) {
  const missingFields = validateRequiredFields(input);
  if (missingFields.length > 0) {
    return ignored('invalid_message', { missingFields });
  }

  if (!MESSAGE_TYPE_VALUES.includes(input.type)) {
    return ignored('unsupported_type', { type: input.type || null });
  }

  const text = optionalString(input.text)?.trim() || null;
  if (input.type === MESSAGE_TYPES.TEXT && !text) {
    return ignored('empty_text');
  }

  const occurredAt = normalizeTimestamp(input.occurredAt);
  if (!occurredAt) {
    return ignored('invalid_timestamp');
  }

  return {
    status: 'accepted',
    message: {
      version: 1,
      channel: String(input.channel),
      provider: String(input.provider),
      direction: 'inbound',
      externalMessageId: String(input.externalMessageId),
      externalConversationId: String(input.externalConversationId),
      sender: {
        externalUserId: String(input.sender.externalUserId),
        displayName: optionalString(input.sender.displayName),
        username: optionalString(input.sender.username),
      },
      type: input.type,
      text,
      media: input.type === MESSAGE_TYPES.TEXT ? null : normalizeMedia(input.media),
      occurredAt,
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    },
  };
}

module.exports = {
  MESSAGE_TYPES,
  createInboundMessage,
  ignored,
};
