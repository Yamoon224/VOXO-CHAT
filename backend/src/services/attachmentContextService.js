// backend/src/services/attachmentContextService.js
// Transforme les pièces jointes d'un message en contexte textuel éphémère.
// Aucune connaissance permanente n'est créée : rien n'est écrit dans
// KnowledgeBase ni KnowledgeChunk (règle de docs/TEST_GESTION_MEDIAS_ENTRANTS.md).
const { MessageAttachment, sequelize } = require('../models');
const { Op } = require('sequelize');
const { MAX_EXTRACTED_CHARS, MAX_ATTACHMENTS_PER_MESSAGE } = require('../config/fileUploads');
const { AppError } = require('../middleware/errorMiddleware');
const { dynamicMessage } = require('../i18n/messages');
const ragChunkingService = require('./ragChunkingService');

// Au-delà, on sélectionne les passages les plus proches de la question
// plutôt que de tronquer bêtement le début du document.
const MAX_CHUNKS_SELECTED = 4;

/**
 * Réserve les pièces d'un message. Une nouvelle tentative portant le même
 * messageId reprend sa réservation ; tout autre message ou tenant est refusé.
 */
function normalizeIds(attachmentIds) {
  const ids = [...new Set((attachmentIds || []).filter(Boolean))];
  if (ids.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    // Limite interpolée : texte résolu ici, MESSAGES[code] ne portant qu'une
    // chaîne plate (cf. dynamicMessage, src/i18n/messages.js).
    throw new AppError(
      dynamicMessage({
        fr: `Vous pouvez joindre au maximum ${MAX_ATTACHMENTS_PER_MESSAGE} fichiers par message.`,
        en: `You can attach at most ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`,
      }),
      400,
      { code: 'TOO_MANY_ATTACHMENTS', preTranslated: true }
    );
  }
  return ids;
}

async function reserveForMessage(tenantId, attachmentIds, messageId, parentTransaction = null) {
  const ids = normalizeIds(attachmentIds);
  if (ids.length === 0) return [];

  const reserve = async transaction => {
    await MessageAttachment.update(
      { messageId },
      {
        where: { id: ids, tenantId, conversationId: null, messageId: null },
        transaction,
      }
    );

    const attachments = await MessageAttachment.findAll({
      where: {
        id: ids,
        tenantId,
        conversationId: null,
        [Op.or]: [{ messageId: null }, { messageId }],
      },
      transaction,
    });

    if (attachments.length !== ids.length) {
      throw new AppError(
        'Une des pièces jointes est introuvable ou a déjà été envoyée.',
        404,
        { code: 'ATTACHMENT_NOT_FOUND' }
      );
    }

    return attachments;
  };
  return parentTransaction ? reserve(parentTransaction) : sequelize.transaction(reserve);
}

/** Score lexical simple : nombre de mots de la question présents dans le passage. */
function scoreChunk(chunkContent, question) {
  const words = String(question || '')
    .toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 3);

  if (words.length === 0) return 0;
  const haystack = chunkContent.toLowerCase();
  return words.reduce((score, word) => (haystack.includes(word) ? score + 1 : score), 0);
}

/**
 * Réduit un texte long aux passages les plus pertinents pour la question,
 * en réutilisant le chunker RAG existant.
 */
function selectRelevantText(text, question, budget) {
  if (text.length <= budget) return text;

  const chunks = ragChunkingService.createChunks({ content: text, title: '' });
  if (chunks.length === 0) return text.slice(0, budget);

  const ranked = chunks
    .map((chunk, index) => ({ chunk, index, score: scoreChunk(chunk.content, question) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  // Le budget se consomme par ordre de pertinence : remplir dans l'ordre du
  // document laisserait un passage sans intérêt évincer celui qui répond.
  const selected = [];
  let used = 0;
  for (const entry of ranked) {
    if (selected.length >= MAX_CHUNKS_SELECTED) break;
    if (used + entry.chunk.content.length > budget) continue;
    selected.push(entry);
    used += entry.chunk.content.length;
  }

  if (selected.length === 0) return text.slice(0, budget);

  // On rétablit l'ordre du document : un extrait dans le désordre se lit mal.
  return selected
    .sort((a, b) => a.index - b.index)
    .map(entry => entry.chunk.content)
    .join('\n[…]\n');
}

/**
 * Construit le bloc de contexte injecté dans le prompt.
 * @returns {string} vide s'il n'y a aucun texte exploitable
 */
function buildTextContext(attachments, question) {
  const withText = attachments.filter(item => item.extractedText?.trim());
  if (withText.length === 0) return '';

  // Le budget total est partagé entre les pièces jointes du message.
  const budgetPerFile = Math.floor(MAX_EXTRACTED_CHARS / withText.length);

  const blocks = withText.map(item => {
    const body = selectRelevantText(item.extractedText.trim(), question, budgetPerFile);
    return `--- Fichier joint : ${item.originalName} ---\n${body}`;
  });

  return blocks.join('\n\n').slice(0, MAX_EXTRACTED_CHARS);
}

/** Rattache définitivement les pièces au message qui vient d'être créé. */
async function attachToMessage(attachments, tenantId, conversationId, messageId, transaction) {
  if (attachments.length === 0) return;

  const [updated] = await MessageAttachment.update(
    { conversationId },
    {
      where: {
        id: attachments.map(item => item.id),
        tenantId,
        messageId,
        conversationId: null,
      },
      transaction,
    }
  );
  if (updated !== attachments.length) {
    throw new AppError(
      'Une pièce jointe n’a pas pu être rattachée au message.',
      409,
      { code: 'ATTACHMENT_CONFLICT' }
    );
  }
}

module.exports = {
  reserveForMessage,
  buildTextContext,
  attachToMessage,
  selectRelevantText,
  scoreChunk,
  MAX_CHUNKS_SELECTED,
};
