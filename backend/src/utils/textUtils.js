// src/utils/textUtils.js
// Normalisation de texte partagee entre la recherche RAG et la detection d'intention.

// Plage Unicode des diacritiques combinants (accents) laissee par une decomposition NFD.
const DIACRITICS = /[\u0300-\u036f]/g;

// Minuscules + suppression des accents.
function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase();
}

module.exports = { normalizeText };
