const conversationExportService = require('../services/conversationExportService');
const conversationExportSettingsService = require('../services/conversationExportSettingsService');
const emailService = require('../services/emailService');
const { successResponse } = require('../utils/responseUtils');
const { AppError } = require('../middleware/errorMiddleware');
const { logChannelEvent } = require('../utils/channelLogger');
const { requestLocale } = require('../i18n/locale');

function filename(sessionId, extension) {
  return `conversation-${sessionId.slice(0, 8)}.${extension}`;
}

function logExport(level, eventType, req, payload = {}) {
  logChannelEvent(level, eventType, { tenantId: req.tenant.id, requestedBy: req.user.id, ...payload });
}

async function downloadConversationPdf(req, res, next) {
  try {
    const conversation = await conversationExportService.getConversation(req.tenant.id, req.params.sessionId);
    const buffer = await conversationExportService.renderConversationPdf(conversation);
    logExport('info', 'conversation_export.downloaded', req, { sessionId: conversation.sessionId, format: 'pdf' });
    res.type('application/pdf').attachment(filename(conversation.sessionId, 'pdf')).send(buffer);
  } catch (error) {
    next(error);
  }
}

async function downloadSelectedConversations(req, res, next) {
  try {
    const { sessionIds, format } = req.body;
    const result = await conversationExportService.buildBulkExport(req.tenant.id, sessionIds, format);
    logExport('info', 'conversation_export.bulk_downloaded', req, { count: sessionIds.length, format });
    res.type(result.type).attachment(`conversations-export.${result.extension}`).send(result.buffer);
  } catch (error) {
    next(error);
  }
}

async function emailConversationPdf(req, res, next) {
  try {
    const { recipient } = req.body;
    const allowedRecipients = conversationExportSettingsService.getAllowedRecipients(req.tenant);
    if (!allowedRecipients.includes(recipient.toLowerCase())) {
      throw new AppError('Ce destinataire n’est pas autorisé', 403, { code: 'RECIPIENT_NOT_ALLOWED' });
    }
    const conversation = await conversationExportService.getConversation(req.tenant.id, req.params.sessionId);
    const report = await conversationExportService.renderConversationPdf(conversation);
    const result = await emailService.sendConversationExport({
      email: recipient,
      tenantName: req.tenant.name,
      conversationTitle: conversation.title || conversation.userName || 'Conversation',
      filename: filename(conversation.sessionId, 'pdf'),
      content: report,
      // Le destinataire est une adresse autorisée quelconque, sans compte
      // rattaché : la locale de la requête (celle du membre qui déclenche
      // l'export) est le meilleur signal disponible.
      locale: requestLocale(req),
    });
    logExport('info', 'conversation_export.emailed', req, {
      sessionId: conversation.sessionId, recipient, messageId: result.messageId,
    });
    successResponse(res, { sessionId: conversation.sessionId }, 'Export envoyé par email');
  } catch (error) {
    logExport('error', 'conversation_export.email_failed', req, {
      sessionId: req.params.sessionId, recipient: req.body?.recipient, code: error.code,
    });
    next(error);
  }
}

module.exports = { downloadConversationPdf, downloadSelectedConversations, emailConversationPdf };
