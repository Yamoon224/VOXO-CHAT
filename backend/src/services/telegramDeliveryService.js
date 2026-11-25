const axios = require('axios');
const config = require('../config/config');
const { logChannelEvent } = require('../utils/channelLogger');

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function getHttpStatus(error) {
  return error.response?.status || null;
}

function getErrorCode(error) {
  return error.response?.data?.error_code || error.code || null;
}

function isRetryableError(error) {
  const status = getHttpStatus(error);
  return !error.response || status === 429 || status >= 500;
}

// Telegram rejette en 400 un texte dont le Markdown est mal apparié. Un simple « * » dans une
// transcription suffit : sans repli, la réponse n'est jamais livrée.
function isMarkdownParseError(error) {
  if (error.response?.status !== 400) return false;
  return /can't parse entities|can not parse entities/i.test(
    String(error.response?.data?.description || '')
  );
}

function getRetryDelay(error, attempt) {
  const retryAfterSeconds = error.response?.data?.parameters?.retry_after;
  const exponentialDelay = config.telegram.retryBaseDelayMs * (2 ** (attempt - 1));
  const requestedDelay = Number.isFinite(Number(retryAfterSeconds))
    ? Number(retryAfterSeconds) * 1000
    : exponentialDelay;

  return Math.min(requestedDelay, config.telegram.retryMaxDelayMs);
}

// Sélection explicite : `options` porte aussi les suggestions, donc du texte visiteur,
// qui n'a rien à faire dans les journaux.
function deliveryLogContext(options, attempt) {
  return {
    channel: 'telegram',
    provider: 'telegram',
    tenantId: options.tenantId || null,
    chatId: options.chatId || null,
    messageId: options.messageId || null,
    suggestionCount: options.suggestions?.length || 0,
    attempt,
    maxAttempts: config.telegram.sendMaxAttempts,
  };
}

// Une tentative logique = un envoi Markdown, plus son repli éventuel en texte brut.
// Le repli ne consomme pas de tentative : un 400 de formatage n'est pas une panne réseau.
async function postOnce(url, payload, logContext) {
  try {
    return await axios.post(url, payload, { timeout: config.telegram.timeoutMs });
  } catch (error) {
    if (!isMarkdownParseError(error)) throw error;

    // La livraison prime sur le formatage : on renvoie le même texte sans interprétation,
    // clavier de suggestions compris.
    logChannelEvent('warn', 'message.markdown_fallback', logContext);
    const plainPayload = { ...payload };
    delete plainPayload.parse_mode;
    return axios.post(url, plainPayload, { timeout: config.telegram.timeoutMs });
  }
}

// Limite connue : Telegram n'expose aucune clé d'idempotence. Un 5xx ou un timeout renvoyé
// après que le message a déjà été accepté provoque une double livraison. Le dédoublonnage
// d'inboundDeduplicationService ne couvre que l'entrant.
async function sendWithRetry(url, payload, options = {}) {
  const startedAt = Date.now();

  for (let attempt = 1; attempt <= config.telegram.sendMaxAttempts; attempt += 1) {
    const logContext = deliveryLogContext(options, attempt);
    logChannelEvent('info', 'message.send_attempt', logContext);

    try {
      const response = await postOnce(url, payload, logContext);

      logChannelEvent('info', 'message.send_succeeded', {
        ...logContext,
        providerMessageId: response.data?.result?.message_id || null,
        durationMs: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      const errorContext = {
        ...logContext,
        httpStatus: getHttpStatus(error),
        errorCode: getErrorCode(error),
      };

      if (!isRetryableError(error) || attempt === config.telegram.sendMaxAttempts) {
        logChannelEvent('error', 'message.send_failed', {
          ...errorContext,
          durationMs: Date.now() - startedAt,
        });
        throw error;
      }

      const delayMs = getRetryDelay(error, attempt);
      logChannelEvent('warn', 'message.send_retry', {
        ...errorContext,
        nextAttempt: attempt + 1,
        delayMs,
      });
      await sleep(delayMs);
    }
  }

  return undefined;
}

module.exports = {
  sendWithRetry,
  isRetryableError,
  isMarkdownParseError,
  getRetryDelay,
};
