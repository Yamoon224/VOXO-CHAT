function sanitizeValue(value) {
  if (value instanceof Error) {
    return value.message;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)])
    );
  }

  return value;
}

function logChannelEvent(level = 'info', eventType, payload = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    eventType,
    ...sanitizeValue(payload),
  };

  const serializedEntry = JSON.stringify(entry);

  if (level === 'error') {
    console.error(serializedEntry);
    return;
  }

  if (level === 'warn') {
    console.warn(serializedEntry);
    return;
  }

  console.log(serializedEntry);
}

module.exports = {
  logChannelEvent,
};
