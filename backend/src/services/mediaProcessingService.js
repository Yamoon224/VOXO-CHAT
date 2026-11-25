const path = require('path');
const config = require('../config/config');
const { AppError } = require('../middleware/errorMiddleware');
const { logChannelEvent } = require('../utils/channelLogger');
const mediaValidationService = require('./mediaValidationService');
const mediaStorageService = require('./mediaStorageService');
const imageReadabilityService = require('./imageReadabilityService');
const extractionService = require('./extraction');
const audioTranscriptionService = require('./audioTranscriptionService');
const extractedTextService = require('./extractedTextService');
const ephemeralRagService = require('./ephemeralRagService');
const widgetAttachmentService = require('./widgetAttachmentService');

const DEFAULT_INTENTS = {
  document: 'Résume ce document et présente ses informations importantes.',
  image: "Analyse cette image et réponds en tenant compte du périmètre de l'entreprise.",
  voice: 'Réponds au contenu de ce message vocal et reformule-le brièvement.',
};

// Marque l'erreur avec l'étape qui a échoué, sans la reclasser : l'appelant en a
// besoin pour choisir le message utilisateur et pour rendre le journal exploitable.
async function atStage(stage, action) {
  try {
    return await action();
  } catch (error) {
    if (error && !error.stage) error.stage = stage;
    throw error;
  }
}

function safeTitle(fileName, extension) {
  const baseName = path.basename(fileName || `media${extension}`, path.extname(fileName || ''));
  const normalized = baseName.replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 80);
  return normalized || 'Média reçu';
}

async function extractMedia(message, loaded, validated, temporaryFile) {
  if (message.type === 'voice') {
    return audioTranscriptionService.transcribe(temporaryFile.filePath);
  }
  return extractionService.extractText(
    loaded.buffer,
    `attachment${validated.extension}`,
    validated.mimeType
  );
}

async function extractWithoutBlockingVision(message, loaded, validated, temporaryFile) {
  try {
    return await extractMedia(message, loaded, validated, temporaryFile);
  } catch (error) {
    if (message.type !== 'image') throw error;
    console.warn('OCR image indisponible, poursuite avec la vision', { error: error.message });
    return { content: '', extractionMethod: 'vision-only', metadata: {} };
  }
}

function extractionMethod(result) {
  return result.extractionMethod || result.metadata?.extractionMethod || 'ocr';
}

function transcriptionLogFields(message, extracted) {
  if (message.type !== 'voice') return {};
  const transcription = extracted.metadata?.transcription || {};
  return {
    transcriptionProvider: extracted.metadata?.provider,
    transcriptionModel: extracted.metadata?.model,
    transcriptionLatencyMs: transcription.latencyMs,
    transcriptionAudioSeconds: transcription.audioSeconds,
    transcriptionCostUsd: transcription.costUsd,
  };
}

function processingLogContext(tenant, message, extra = {}) {
  return {
    tenantId: tenant.id,
    channel: message.channel,
    provider: message.provider,
    messageId: message.externalMessageId,
    mediaType: message.type,
    ...extra,
  };
}

// Un vocal transcrit EST le message du visiteur : l'envoyer tel quel plutôt qu'une consigne
// générique, sinon le modèle répond qu'il ne traite pas l'audio. La légende éventuelle reste
// prioritaire, mais elle vient du canal : elle est nettoyée comme tout contenu non fiable.
function resolveUserIntent(message, content) {
  const caption = extractedTextService.sanitizeUntrusted(message.text || '').trim();
  if (caption) return caption;
  if (message.type === 'voice' && content) {
    return extractedTextService.capLength(content);
  }
  return DEFAULT_INTENTS[message.type];
}

async function buildSupplementalContext(message, content, title, userIntent) {
  if (!content && message.type === 'image') return '';
  const meaningful = extractedTextService.requireMeaningful(
    content,
    message.type === 'voice' ? 2 : 10
  );
  return ephemeralRagService.selectContext({ content: meaningful, title, query: userIntent });
}

// Le nettoyage ne doit jamais écraser le résultat du traitement : un fichier temporaire
// resté en place sera repris par `mediaStorageService.purgeStale`.
async function cleanupQuietly(temporaryFile, tenant, message) {
  try {
    await temporaryFile.cleanup();
    logChannelEvent('info', 'media.cleaned', processingLogContext(tenant, message));
  } catch (error) {
    logChannelEvent('warn', 'media.cleanup_failed', processingLogContext(tenant, message, {
      error,
    }));
  }
}

async function process({ tenant, message, loadMedia }) {
  if (typeof loadMedia !== 'function') {
    throw new AppError('Le téléchargement de ce média n’est pas disponible', 503, {
      code: 'MEDIA_LOADER_UNAVAILABLE',
    });
  }
  if (message.type === 'voice' && message.media?.durationSeconds > config.media.maxVoiceSeconds) {
    throw new AppError('Le message vocal dépasse la durée maximale de 10 minutes', 413, {
      code: 'VOICE_TOO_LONG',
    });
  }

  const startedAt = Date.now();
  let temporaryFile = null;
  try {
    const loaded = await atStage('download', () => loadMedia(message));
    logChannelEvent('info', 'media.downloaded', processingLogContext(tenant, message, {
      sizeBytes: loaded.buffer?.length || loaded.sizeBytes || 0,
    }));

    const validated = await atStage('validate', async () => {
      const result = mediaValidationService.validate({ ...loaded, expectedType: message.type });
      if (message.type === 'image') {
        await imageReadabilityService.assertReadable(loaded.buffer);
      }
      return result;
    });

    temporaryFile = await atStage(
      'store',
      () => mediaStorageService.create(loaded.buffer, validated.extension)
    );
    const extracted = await atStage('extract', () => extractWithoutBlockingVision(
      message,
      loaded,
      validated,
      temporaryFile
    ));
    const content = String(extracted.content || '').trim();
    const userIntent = resolveUserIntent(message, content);
    const title = safeTitle(loaded.fileName, validated.extension);
    const supplementalContext = await atStage('context', () => buildSupplementalContext(
      message,
      content,
      title,
      userIntent
    ));
    if (!supplementalContext && message.type !== 'image') {
      throw new AppError('Aucun contexte exploitable n’a pu être extrait du média', 422, {
        code: 'MEDIA_CONTEXT_EMPTY',
      });
    }

    logChannelEvent('info', 'media.processed', processingLogContext(tenant, message, {
      sizeBytes: validated.sizeBytes,
      mimeType: validated.mimeType,
      extractionMethod: extractionMethod(extracted),
      durationMs: Date.now() - startedAt,
      ...transcriptionLogFields(message, extracted),
    }));
    return {
      userIntent,
      supplementalContext,
      attachment: {
        type: message.type,
        title,
        mimeType: validated.mimeType,
        sizeBytes: validated.sizeBytes,
        extractionMethod: extractionMethod(extracted),
        ...(message.type === 'voice' ? { transcription: extracted.metadata?.transcription } : {}),
      },
      ...(message.type === 'image' ? { images: [loaded.buffer] } : {}),
    };
  } finally {
    if (temporaryFile) await cleanupQuietly(temporaryFile, tenant, message);
  }
}

/**
 * Conserve un média entrant pendant une reprise humaine sans jamais en lire le
 * contenu. Les mêmes contrôles de signature, format et taille sont appliqués
 * avant le stockage privé ; l'extraction est réservée au chemin IA.
 */
async function storeForHuman({ tenant, message, loadMedia }) {
  if (typeof loadMedia !== 'function') {
    throw new AppError('Le téléchargement de ce média n’est pas disponible', 503, {
      code: 'MEDIA_LOADER_UNAVAILABLE',
    });
  }
  const loaded = await loadMedia(message);
  const validated = mediaValidationService.validate({ ...loaded, expectedType: message.type });
  if (!['image', 'document'].includes(validated.category)) return { attachments: [], attachment: null };

  const requestedName = loaded.fileName || message.media?.fileName || `media${validated.extension}`;
  const extension = path.extname(requestedName).toLowerCase();
  const originalname = extension ? requestedName : `${safeTitle(requestedName, validated.extension)}${validated.extension}`;
  const attachment = await widgetAttachmentService.receive(tenant, {
    buffer: loaded.buffer,
    originalname,
    mimetype: validated.mimeType,
  }, { enforceQuota: false });
  return {
    attachments: [attachment],
    attachment: {
      type: message.type,
      title: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    },
  };
}

module.exports = {
  DEFAULT_INTENTS, process, storeForHuman, safeTitle, extractionMethod, transcriptionLogFields,
};
