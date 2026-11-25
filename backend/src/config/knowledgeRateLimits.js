const rateLimit = require('express-rate-limit');

// Limites des opérations coûteuses de la base de connaissances.
// Regroupées ici pour que les routeurs ne contiennent que des routes.

const embeddingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5,
  message: {
    error: 'Trop de regénérations d\'embeddings. Réessayez dans 1 heure.',
  },
});

const bulkLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  message: {
    error: 'Trop d\'imports en lot. Réessayez dans 10 minutes.',
  },
});

// Plus restrictif : l'OCR est le traitement le plus lourd.
const ocrLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: {
    error: 'Trop de traitements OCR. Réessayez dans 5 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const pdfLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: {
    error: 'Trop de traitements PDF. Réessayez dans 10 minutes.',
  },
});

const urlLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 5,
  message: {
    error: 'Trop d\'imports d\'URL. Réessayez dans 2 minutes.',
  },
});

// Un crawl mobilise le serveur bien plus longtemps qu'un import d'URL isolé.
const crawlLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3,
  message: {
    error: 'Trop de crawls lancés. Réessayez dans 30 minutes.',
  },
});

/**
 * Tout upload est limité, quel que soit son format.
 * L'ancienne version choisissait son limiteur d'après l'en-tête x-file-type,
 * fourni par le client : il suffisait de l'omettre — ce que faisait le
 * frontend — pour n'être limité par rien du tout.
 */
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: {
    error: 'Trop de fichiers envoyés. Réessayez dans 10 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  embeddingLimiter,
  bulkLimiter,
  ocrLimiter,
  pdfLimiter,
  urlLimiter,
  crawlLimiter,
  uploadLimiter,
};
