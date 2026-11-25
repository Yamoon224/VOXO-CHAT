const archiver = require('archiver');
const { Conversation } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const { renderConversationPdf } = require('./conversationPdfService');

const CSV_HEADERS = [
  'conversation_id', 'session_id', 'titre', 'utilisateur', 'email', 'canal',
  'statut', 'cree_le', 'terminee_le', 'note', 'auteur_message', 'message',
  'date_message', 'pieces_jointes',
];

function escapeCsv(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function attachmentMetadata(attachments = []) {
  return attachments.map(item => [
    item.name || item.originalName || 'Fichier joint',
    item.mimeType || item.type || 'type inconnu',
    item.size || item.sizeBytes || '',
  ].filter(Boolean).join(' — ')).join(' | ');
}

function toCsv(conversations) {
  const rows = conversations.flatMap(conversation => (conversation.messages || []).map(message => [
    conversation.id, conversation.sessionId, conversation.title, conversation.userName,
    conversation.userEmail, conversation.channel, conversation.status, conversation.createdAt,
    conversation.endedAt, conversation.satisfactionRating,
    message.role === 'user' ? (conversation.userName || 'Utilisateur') : 'Assistant IA',
    message.content, message.timestamp, attachmentMetadata(message.attachments),
  ].map(escapeCsv).join(',')));
  return `\uFEFF${CSV_HEADERS.join(',')}\n${rows.join('\n')}`;
}

async function appendConversationPdfs(archive, conversations) {
  for (const conversation of conversations) {
    const report = await renderConversationPdf(conversation);
    archive.append(report, { name: `conversation-${conversation.sessionId.slice(0, 8)}.pdf` });
  }
  archive.finalize();
}

function archivePdfs(conversations) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];
    archive.on('data', chunk => chunks.push(chunk));
    archive.on('error', reject);
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    appendConversationPdfs(archive, conversations).catch(reject);
  });
}

async function getConversation(tenantId, sessionId) {
  const conversation = await Conversation.findOne({ where: { tenantId, sessionId } });
  if (!conversation) throw new AppError('Conversation introuvable', 404, { code: 'CONVERSATION_NOT_FOUND' });
  return conversation;
}

async function getSelectedConversations(tenantId, sessionIds) {
  const uniqueIds = [...new Set(sessionIds || [])];
  const conversations = await Conversation.findAll({
    where: { tenantId, sessionId: uniqueIds },
    order: [['createdAt', 'ASC']],
  });
  if (conversations.length !== uniqueIds.length) {
    throw new AppError('Une ou plusieurs conversations sont introuvables', 404, {
      code: 'CONVERSATION_NOT_FOUND',
    });
  }
  return conversations;
}

async function buildBulkExport(tenantId, sessionIds, format) {
  const conversations = await getSelectedConversations(tenantId, sessionIds);
  if (format === 'csv') return { buffer: Buffer.from(toCsv(conversations)), type: 'text/csv', extension: 'csv' };
  return { buffer: await archivePdfs(conversations), type: 'application/zip', extension: 'zip' };
}

module.exports = { buildBulkExport, getConversation, renderConversationPdf };
