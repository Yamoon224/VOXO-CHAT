const mediaProcessingService = require('./mediaProcessingService');
const deduplicationService = require('./inboundDeduplicationService');
const replyService = require('./inboundReplyService');
const conversationService = require('./inboundConversationService');
const { logChannelEvent } = require('../utils/channelLogger');

const { logContext, claimContext, resolveConversation, assertQuota } = conversationService;

const MEDIA_FAILURE_MESSAGE = 'Le média n’a pas pu être traité. Veuillez réessayer avec un autre fichier.';
const TECHNICAL_FAILURE_MESSAGE = 'Une erreur technique est survenue. Veuillez réessayer dans un instant.';

function mediaStoredContent(message, mediaResult) {
  // Pour un vocal, `userIntent` EST déjà la transcription : la répéter sous « Contenu extrait »
  // rendrait l'historique illisible pour les tours suivants.
  if (message.type === 'voice') {
    return `[VOCAL] ${mediaResult.userIntent}`;
  }
  return [
    `[${message.type.toUpperCase()} : ${mediaResult.attachment.title}]`,
    `Demande : ${mediaResult.userIntent}`,
    'Contenu extrait :',
    mediaResult.supplementalContext,
  ].join('\n');
}

function humanMediaStoredContent(message, mediaResult) {
  if (!mediaResult.attachment) return message.text || `[${message.type.toUpperCase()}]`;
  return message.text || `[${message.type.toUpperCase()} : ${mediaResult.attachment.title}]`;
}

function resolveTelegramSuggestion(conversation, message) {
  const selection = message.metadata?.telegramSuggestion;
  if (!selection) return null;
  const assistant = (conversation.messages || []).find(item => (
    item.id === selection.assistantMessageId && item.role === 'assistant'
  ));
  const suggestion = assistant?.metadata?.suggestions?.[selection.index];
  return typeof suggestion === 'string' && suggestion.trim() ? suggestion.trim() : null;
}

async function processTelegramSuggestion({ tenant, message, sendReply }) {
  const claim = claimContext(tenant, message);
  if (!(await deduplicationService.claim(claim))) {
    return { status: 'ignored', reason: 'duplicate_message' };
  }

  try {
    const conversation = await conversationService.findActiveConversation(
      tenant,
      message,
      'telegram'
    );
    if (!conversation) return { status: 'ignored', reason: 'suggestion_expired' };

    const suggestion = resolveTelegramSuggestion(conversation, message);
    if (!suggestion) return { status: 'ignored', reason: 'invalid_suggestion' };
    if (!(await assertQuota(tenant, message, sendReply, conversation))) {
      return { status: 'blocked', reason: 'quota_exceeded' };
    }
    await replyService.generateAndPersist({
      tenant,
      message,
      conversation,
      sendReply,
      userMessage: suggestion,
      storedContent: suggestion,
    });
    return { status: 'processed' };
  } catch (error) {
    await deduplicationService.release(claim);
    throw error;
  }
}

async function processTextMessage({ tenant, message, sendReply }) {
  const startedAt = Date.now();
  const claim = claimContext(tenant, message);
  if (!(await deduplicationService.claim(claim))) {
    return { status: 'ignored', reason: 'duplicate_message' };
  }
  try {
    const conversation = await resolveConversation(tenant, message);
    if (!(await assertQuota(tenant, message, sendReply, conversation))) {
      return { status: 'blocked', reason: 'quota_exceeded' };
    }
    await replyService.generateAndPersist({
      tenant,
      message,
      conversation,
      sendReply,
      userMessage: message.text,
      storedContent: message.text,
    });
    logChannelEvent('info', 'message.reply_sent', {
      ...logContext(tenant, message),
      status: 'sent',
      durationMs: Date.now() - startedAt,
    });
    return { status: 'processed' };
  } catch (error) {
    await deduplicationService.release(claim);
    throw error;
  }
}

// Le message rendu à l'utilisateur dépend de l'étape atteinte : seule l'étape `media`
// peut mettre le fichier en cause. Une panne d'IA, d'envoi ou de base survient après
// que le média a été lu avec succès et ne doit pas demander « un autre fichier ».
function failureMessage(error, stage) {
  if (error.isOperational) return error.message;
  return stage === 'media' ? MEDIA_FAILURE_MESSAGE : TECHNICAL_FAILURE_MESSAGE;
}

async function failMediaMessage({ claim, tenant, message, sendReply, error, stage }) {
  await deduplicationService.release(claim);
  await sendReply(failureMessage(error, stage));
  logChannelEvent('error', 'media.processing_failed', {
    ...logContext(tenant, message),
    status: 'error',
    stage: error.stage || stage,
    code: error.code || 'MEDIA_PROCESSING_FAILED',
    errorName: error.name,
    error,
  });
  return { status: 'failed', reason: error.code || 'media_processing_failed' };
}

async function processMediaMessage({ tenant, message, sendReply, loadMedia }) {
  const claim = claimContext(tenant, message);
  if (!(await deduplicationService.claim(claim))) {
    return { status: 'ignored', reason: 'duplicate_message' };
  }

  let conversation;
  let mediaResult;
  try {
    conversation = await resolveConversation(tenant, message);
    if (!(await assertQuota(tenant, message, sendReply, conversation))) {
      return { status: 'blocked', reason: 'quota_exceeded' };
    }
  } catch (error) {
    return failMediaMessage({ claim, tenant, message, sendReply, error, stage: 'conversation' });
  }

  // Pendant un échange humain, le média est uniquement validé et conservé de
  // manière privée. Ni OCR, ni vision, ni contexte IA ne sont déclenchés.
  if (conversation.handoffStatus === 'human') {
    try {
      const mediaResult = await mediaProcessingService.storeForHuman({ tenant, message, loadMedia });
      await replyService.generateAndPersist({
        tenant,
        message,
        conversation,
        sendReply,
        userMessage: message.text || humanMediaStoredContent(message, mediaResult),
        storedContent: humanMediaStoredContent(message, mediaResult),
        aiOptions: mediaResult,
      });
      return { status: 'processed' };
    } catch (error) {
      return failMediaMessage({ claim, tenant, message, sendReply, error, stage: 'media' });
    }
  }

  try {
    mediaResult = await mediaProcessingService.process({ tenant, message, loadMedia });
  } catch (error) {
    return failMediaMessage({ claim, tenant, message, sendReply, error, stage: 'media' });
  }

  try {
    await replyService.generateAndPersist({
      tenant,
      message,
      conversation,
      sendReply,
      userMessage: mediaResult.userIntent,
      storedContent: mediaStoredContent(message, mediaResult),
      aiOptions: mediaResult,
    });
    return { status: 'processed' };
  } catch (error) {
    return failMediaMessage({ claim, tenant, message, sendReply, error, stage: 'response' });
  }
}

async function processInboundMessage({ tenant, message, sendReply, loadMedia }) {
  if (message.metadata?.telegramSuggestion) {
    return processTelegramSuggestion({ tenant, message, sendReply });
  }
  if (message.type === 'text') {
    return processTextMessage({ tenant, message, sendReply });
  }
  return processMediaMessage({ tenant, message, sendReply, loadMedia });
}

module.exports = {
  processInboundMessage,
  humanMediaStoredContent,
  MEDIA_FAILURE_MESSAGE,
  TECHNICAL_FAILURE_MESSAGE,
};
