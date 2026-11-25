const { AppError } = require('../middleware/errorMiddleware');

function normalizeRecipients(recipients) {
  if (!Array.isArray(recipients)) {
    throw new AppError('La liste des destinataires est invalide', 400, { code: 'INVALID_RECIPIENTS' });
  }
  const unique = [...new Set(recipients.map(email => String(email).trim().toLowerCase()).filter(Boolean))];
  if (unique.length > 50 || unique.some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new AppError('La liste des destinataires contient une adresse invalide', 400, { code: 'INVALID_RECIPIENTS' });
  }
  return unique;
}

function getAllowedRecipients(tenant) {
  return tenant.settings?.conversationExport?.allowedRecipients || [];
}

async function updateAllowedRecipients(tenant, recipients) {
  const settings = { ...(tenant.settings || {}) };
  settings.conversationExport = { ...settings.conversationExport, allowedRecipients: normalizeRecipients(recipients) };
  await tenant.update({ settings });
  return getAllowedRecipients(tenant);
}

module.exports = { getAllowedRecipients, updateAllowedRecipients };
