function safeMetadata(metadata = {}) {
  const safe = { ...metadata };
  if (safe.storage) {
    safe.storage = {
      available: Boolean(safe.storage.key),
      size: safe.storage.size,
      mimeType: safe.storage.mimeType,
      originalName: safe.storage.originalName,
    };
  }
  delete safe.storageKey;
  delete safe.key;
  delete safe.buffer;
  delete safe.base64;
  delete safe.tempPath;
  return safe;
}

module.exports = { safeMetadata };
