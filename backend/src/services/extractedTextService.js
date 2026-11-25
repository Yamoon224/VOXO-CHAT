const { AppError } = require('../middleware/errorMiddleware');

// Aligné sur la limite Joi du widget (chatValidators.sendMessageSchema).
const MAX_USER_MESSAGE_LENGTH = 2000;

// En-têtes du prompt système que le contenu visiteur ne doit jamais pouvoir imiter.
const PROMPT_HEADERS = [
  'SOURCES ENTREPRISE',
  'CONTENU FOURNI PAR LE VISITEUR',
  'DÉBUT DU CONTENU VISITEUR',
  'FIN DU CONTENU VISITEUR',
  'RÈGLES FACTUELLES',
  'RÈGLES SUR LES PIÈCES JOINTES',
  'SUJETS QUE TU PEUX PROPOSER',
  'COMMENT RÉPONDRE',
  'STYLE',
  'NOTE',
];

const ROLE_TAG_PATTERN = /<\|[^|>]{0,40}\|>/g;
const HEADER_PATTERN = new RegExp(
  `^\\s*(?:${PROMPT_HEADERS.join('|')})\\s*:?\\s*$`,
  'i'
);

function clean(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

/**
 * Empêche un contenu visiteur (OCR, transcription, légende) de se faire passer pour
 * une section du prompt système. On neutralise sans supprimer : le sens reste lisible
 * par le modèle, mais la ligne ne peut plus être lue comme une consigne de structure.
 */
function neutralizePromptStructure(text) {
  return String(text || '')
    .replace(ROLE_TAG_PATTERN, '')
    .split('\n')
    .map((line) => (HEADER_PATTERN.test(line) ? `· ${line.trim()}` : line))
    .join('\n');
}

function capLength(text, maxLength = MAX_USER_MESSAGE_LENGTH) {
  const value = String(text || '');
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

/** Nettoyage complet d'un texte non fiable destiné au modèle. */
function sanitizeUntrusted(text, maxLength = MAX_USER_MESSAGE_LENGTH) {
  return capLength(neutralizePromptStructure(clean(text)), maxLength);
}

function requireMeaningful(text, minimumLength = 10) {
  const cleaned = clean(text);
  const meaningfulLength = cleaned.replace(/\s/g, '').length;
  if (meaningfulLength < minimumLength) {
    throw new AppError('Aucun texte significatif n’a pu être extrait du média', 422, {
      code: 'MEDIA_TEXT_EMPTY',
    });
  }
  return neutralizePromptStructure(cleaned);
}

module.exports = {
  clean,
  neutralizePromptStructure,
  capLength,
  sanitizeUntrusted,
  requireMeaningful,
  MAX_USER_MESSAGE_LENGTH,
  PROMPT_HEADERS,
};
