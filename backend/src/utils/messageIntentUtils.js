// src/utils/messageIntentUtils.js
// Détection déterministe des messages purement sociaux (aucun appel LLM).
const { normalizeText } = require('./textUtils');

const MAX_SOCIAL_LENGTH = 60;
const MAX_SOCIAL_TOKENS = 8;

// Mots porteurs d'une intention sociale, en forme normalisée (donc sans accent).
const SOCIAL_LEXICON = new Map();

function addCategory(category, words) {
  words.forEach((word) => SOCIAL_LEXICON.set(word, category));
}

addCategory('greeting', [
  'bonjour', 'bonsoir', 'salut', 'coucou', 'hello', 'hi', 'hey', 'yo', 'bjr', 'slt', 're',
]);
addCategory('thanks', [
  'merci', 'mercis', 'remercie', 'thanks', 'thank', 'super', 'parfait', 'genial',
  'top', 'nickel', 'cool', 'chouette', 'impeccable', 'excellent', 'bravo',
]);
addCategory('goodbye', [
  'revoir', 'bye', 'ciao', 'tchao', 'adieu', 'bientot', 'journee', 'soiree', 'nuit', 'weekend',
]);
addCategory('identity', [
  'robot', 'robots', 'bot', 'humain', 'humaine', 'machine', 'ia', 'nom', 'prenom',
  'appelle', 'appelles',
]);
addCategory('smalltalk', [
  'va', 'vas', 'allez', 'comment', 'ok', 'oui', 'non', 'accord', 'pardon', 'desole',
  'desolee', 'excusez', 'excuse', 'sorry', 'lol', 'haha', 'hahaha', 'mdr', 'enchante',
  'enchantee', 'ravi', 'ravie', 'sympa', 'bienvenue',
]);

// Mots neutres tolérés : ils ne déclenchent jamais à eux seuls une intention sociale.
const FILLER_WORDS = new Set([
  'a', 'au', 'aux', 'avec', 'bcp', 'beaucoup', 'bien', 'bonne', 'bonnes', 'c', 'ca',
  'ce', 'cela', 'd', 'de', 'des', 'du', 'elle', 'en', 'es', 'est', 'et', 'il', 'j',
  'je', 'l', 'la', 'le', 'les', 'ma', 'me', 'moi', 'mon', 'n', 'nous', 'on', 'pas',
  'plait', 'plaisir', 'pour', 's', 'si', 'sil', 'suis', 't', 'ta', 'te', 'toi', 'ton',
  'tous', 'tout', 'toute', 'tres', 'tu', 'un', 'une', 'vous', 'y',
]);

// Priorité de résolution quand plusieurs catégories cohabitent (ex: « merci, au revoir »).
const CATEGORY_PRIORITY = ['identity', 'goodbye', 'thanks', 'greeting', 'smalltalk'];

const NO_SOCIAL_INTENT = Object.freeze({ type: null, isPureSocial: false });

function tokenize(normalized) {
  return normalized.split(/[^a-z0-9]+/).filter(Boolean);
}

function resolveType(categories) {
  return CATEGORY_PRIORITY.find((category) => categories.has(category)) || null;
}

/**
 * Détecte si un message est PUREMENT social (salutation, remerciement, politesse, adieu).
 *
 * Stratégie volontairement conservatrice : chaque token doit appartenir au lexique social
 * ou aux mots neutres. Un seul mot inconnu suffit à renvoyer `isPureSocial: false`, et le
 * message repart alors par le chemin RAG normal.
 *
 * Ce déséquilibre est assumé : un faux négatif est sans gravité (le prompt système possède
 * lui aussi une branche sociale), tandis qu'un faux positif priverait le visiteur d'une
 * vraie réponse métier.
 *
 * @param {string} message
 * @returns {{ type: string|null, isPureSocial: boolean }}
 */
function detectSocialIntent(message) {
  const raw = String(message || '').trim();
  if (!raw || raw.length > MAX_SOCIAL_LENGTH) {
    return NO_SOCIAL_INTENT;
  }

  const tokens = tokenize(normalizeText(raw));

  // Message sans aucune lettre (emoji seul, ponctuation) : jamais une question métier.
  if (tokens.length === 0) {
    return { type: 'smalltalk', isPureSocial: true };
  }

  if (tokens.length > MAX_SOCIAL_TOKENS) {
    return NO_SOCIAL_INTENT;
  }

  const categories = new Set();
  for (const token of tokens) {
    const category = SOCIAL_LEXICON.get(token);
    if (category) {
      categories.add(category);
      continue;
    }
    if (!FILLER_WORDS.has(token)) {
      return NO_SOCIAL_INTENT;
    }
  }

  // Uniquement des mots neutres : trop ambigu pour court-circuiter le RAG.
  if (categories.size === 0) {
    return NO_SOCIAL_INTENT;
  }

  return { type: resolveType(categories), isPureSocial: true };
}

module.exports = {
  detectSocialIntent,
  MAX_SOCIAL_LENGTH,
  MAX_SOCIAL_TOKENS,
};
