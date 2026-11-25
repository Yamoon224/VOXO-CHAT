// backend/src/validators/knowledgeValidators.js - Validateurs complets
const Joi = require('joi');
const { joiMessage } = require('./joiMessage');

const createKnowledgeSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.empty': joiMessage('JOI_TITLE_REQUIRED'),
      'string.max': joiMessage('JOI_TITLE_MAX_500'),
    }),
  
  content: Joi.string()
    .min(1)
    .max(10000)
    .required()
    .messages({
      'string.empty': joiMessage('JOI_CONTENT_REQUIRED'),
      'string.max': joiMessage('JOI_CONTENT_MAX_10000'),
    }),
  
  sourceType: Joi.string()
    .valid('manual', 'upload', 'url', 'api')
    .default('manual'),
  
  sourceUrl: Joi.string()
    .uri()
    .optional()
    .allow('', null)
    .messages({
      'string.uri': joiMessage('JOI_SOURCE_URL_INVALID'),
    }),
  
  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .default([])
    .messages({
      'array.max': joiMessage('JOI_TAGS_MAX_10'),
    }),
  
  isActive: Joi.boolean()
    .default(true),
  
  metadata: Joi.object()
    .default({}),
});

const updateKnowledgeSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(500)
    .optional()
    .messages({
      'string.empty': joiMessage('JOI_TITLE_NOT_EMPTY'),
      'string.max': joiMessage('JOI_TITLE_MAX_500'),
    }),
  
  content: Joi.string()
    .min(1)
    .max(10000)
    .optional()
    .messages({
      'string.empty': joiMessage('JOI_CONTENT_NOT_EMPTY'),
      'string.max': joiMessage('JOI_CONTENT_MAX_10000'),
    }),
  
  sourceType: Joi.string()
    .valid('manual', 'upload', 'url', 'api')
    .optional(),
  
  sourceUrl: Joi.string()
    .uri()
    .optional()
    .allow('', null)
    .messages({
      'string.uri': joiMessage('JOI_SOURCE_URL_INVALID'),
    }),
  
  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .optional()
    .messages({
      'array.max': joiMessage('JOI_TAGS_MAX_10'),
    }),
  
  isActive: Joi.boolean()
    .optional(),
  
  metadata: Joi.object()
    .optional(),
});

const getKnowledgeBaseSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  
  search: Joi.string()
    .max(200)
    .optional()
    .allow(''),
  
  sourceType: Joi.string()
    .valid('manual', 'upload', 'url', 'api')
    .optional(),
  
  tags: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.array().items(Joi.string())
    )
    .optional(),
  
  isActive: Joi.string()
    .valid('true', 'false', 'all')
    .default('true'),
  
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'title')
    .default('createdAt'),
  
  sortOrder: Joi.string()
    .valid('ASC', 'DESC')
    .default('DESC'),
});

const bulkImportSchema = Joi.object({
  knowledgeItems: Joi.array()
    .items(Joi.object({
      title: Joi.string().min(1).max(500).required(),
      content: Joi.string().min(1).max(10000).required(),
      sourceType: Joi.string().valid('manual', 'upload', 'url', 'api').default('manual'),
      sourceUrl: Joi.string().uri().optional().allow('', null),
      tags: Joi.array().items(Joi.string().max(50)).max(10).default([]),
      isActive: Joi.boolean().default(true),
      metadata: Joi.object().default({}),
    }))
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': joiMessage('JOI_AT_LEAST_ONE_ITEM'),
      'array.max': joiMessage('JOI_IMPORT_MAX_100'),
    }),
});

const searchKnowledgeSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': joiMessage('JOI_SEARCH_QUERY_REQUIRED'),
      'string.max': joiMessage('JOI_SEARCH_QUERY_MAX_200'),
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10),
});

const createFromUrlSchema = Joi.object({
  url: Joi.string()
    .uri()
    .required()
    .custom((value, helpers) => {
      const check = validateUrl(value);
      if (!check.isValid) {
        return helpers.message(check.error);
      }
      return value;
    })
    .messages({
      'string.empty': joiMessage('JOI_URL_REQUIRED'),
      'string.uri': joiMessage('JOI_URL_INVALID'),
    }),

  title: Joi.string()
    .trim()
    .empty('')
    .max(500)
    .optional()
    .messages({
      'string.max': joiMessage('JOI_TITLE_MAX_500'),
    }),
  
  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .default([])
    .messages({
      'array.max': joiMessage('JOI_TAGS_MAX_10'),
    }),
  
  metadata: Joi.object()
    .default({}),
});

// Validation du lancement d'un crawl multi-pages
const crawlSiteSchema = Joi.object({
  url: Joi.string()
    .uri()
    .required()
    .custom((value, helpers) => {
      const check = validateUrl(value);
      if (!check.isValid) {
        return helpers.message(check.error);
      }
      return value;
    })
    .messages({
      'string.empty': joiMessage('JOI_SITE_URL_REQUIRED'),
      'string.uri': joiMessage('JOI_URL_INVALID'),
    }),

  // Sitemap fourni manuellement : court-circuite la détection automatique
  sitemapUrl: Joi.string()
    .uri()
    .optional()
    .allow('', null)
    .custom((value, helpers) => {
      if (!value) return value;
      const check = validateUrl(value);
      if (!check.isValid) {
        return helpers.message(check.error);
      }
      return value;
    }),

  title: Joi.string()
    .max(400)
    .optional()
    .allow('', null)
    .messages({
      'string.max': joiMessage('JOI_TITLE_MAX_400'),
    }),

  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .default([]),

  maxPages: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .default(50)
    .messages({
      'number.max': joiMessage('JOI_CRAWL_MAX_500_PAGES'),
    }),

  maxDepth: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .default(3),

  includeSubdomains: Joi.boolean().default(false),
});

// Validation pour les paramètres de fichier upload
const uploadFileSchema = Joi.object({
  title: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': joiMessage('JOI_TITLE_MAX_500'),
    }),
  
  tags: Joi.alternatives()
    .try(
      Joi.string().pattern(/^[^,]+(,[^,]+)*$/, 'comma-separated tags'),
      Joi.array().items(Joi.string())
    )
    .optional(),
  
  metadata: Joi.object()
    .optional(),
  
  isActive: Joi.boolean()
    .default(true),
});

// Validation pour les paramètres d'export
const exportSchema = Joi.object({
  format: Joi.string()
    .valid('json', 'csv', 'txt')
    .default('json'),
  
  includeInactive: Joi.boolean()
    .default(false),
  
  sourceTypes: Joi.array()
    .items(Joi.string().valid('manual', 'upload', 'url', 'api'))
    .optional(),
  
  tags: Joi.array()
    .items(Joi.string())
    .optional(),
  
  dateFrom: Joi.date()
    .iso()
    .optional(),
  
  dateTo: Joi.date()
    .iso()
    .greater(Joi.ref('dateFrom'))
    .optional(),
});

// Validation pour les paramètres d'archivage
const archiveSchema = Joi.object({
  archive: Joi.boolean()
    .default(true),
  
  reason: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': joiMessage('JOI_REASON_MAX_500'),
    }),
});

// Validation pour les paramètres de duplication
const duplicateSchema = Joi.object({
  newTitle: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': joiMessage('JOI_NEW_TITLE_MAX_500'),
    }),
  
  copyTags: Joi.boolean()
    .default(true),
  
  copyMetadata: Joi.boolean()
    .default(true),
  
  additionalTags: Joi.array()
    .items(Joi.string().max(50))
    .max(5)
    .default([])
    .messages({
      'array.max': joiMessage('JOI_EXTRA_TAGS_MAX_5'),
    }),
});

// Validation pour la régénération d'embeddings
const regenerateEmbeddingsSchema = Joi.object({
  force: Joi.boolean()
    .default(false),
  
  batchSize: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10),
  
  sourceTypes: Joi.array()
    .items(Joi.string().valid('manual', 'upload', 'url', 'api'))
    .optional(),
});

// Helper pour valider les types de fichiers
const validateFileType = (mimetype, filename) => {
  const allowedTypes = {
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
  };

  const path = require('path');
  const ext = path.extname(filename).toLowerCase();
  
  // Vérifier le MIME type
  if (!allowedTypes[mimetype]) {
    return {
      isValid: false,
      error: `Type de fichier non supporté: ${mimetype}`
    };
  }
  
  // Vérifier l'extension
  if (!allowedTypes[mimetype].includes(ext)) {
    return {
      isValid: false,
      error: `Extension de fichier non supportée: ${ext}`
    };
  }
  
  return { isValid: true };
};

// Helper pour valider la taille de fichier
const validateFileSize = (size, maxSize = 10 * 1024 * 1024) => { // 10MB par défaut
  if (size > maxSize) {
    return {
      isValid: false,
      error: `Fichier trop volumineux. Taille maximum: ${Math.round(maxSize / 1024 / 1024)}MB`
    };
  }
  
  return { isValid: true };
};

// Helper pour valider les URLs
const validateUrl = (url) => {
  try {
    const urlObj = new URL(url);
    
    // Vérifier le protocole
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        isValid: false,
        error: 'Seuls les protocoles HTTP et HTTPS sont autorisés'
      };
    }
    
    // Vérifier que ce n'est pas une IP locale ou interne (protection SSRF)
    const hostname = urlObj.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    const localPatterns = [
      /^localhost$/,
      /\.localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^169\.254\./,        // link-local + métadonnées cloud (169.254.169.254)
      /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT 100.64.0.0/10
      /^::1$/,              // loopback IPv6
      /^::$/,
      /^fe80:/i,            // link-local IPv6
      /^f[cd][0-9a-f]{2}:/i, // unique local IPv6 fc00::/7
      /\.internal$/,
      /\.local$/
    ];

    if (localPatterns.some(pattern => pattern.test(hostname))) {
      return {
        isValid: false,
        error: 'Les URLs locales ne sont pas autorisées'
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'URL invalide'
    };
  }
};

// Helper pour nettoyer les tags
const cleanTags = (tags) => {
  if (!tags) return [];
  
  let tagArray = [];
  
  if (typeof tags === 'string') {
    tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  } else if (Array.isArray(tags)) {
    tagArray = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
  }
  
  // Supprimer les doublons et limiter à 10
  return [...new Set(tagArray)].slice(0, 10);
};

// Helper pour valider le contenu textuel
const validateTextContent = (content) => {
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      error: 'Contenu requis'
    };
  }
  
  const trimmedContent = content.trim();
  
  if (trimmedContent.length === 0) {
    return {
      isValid: false,
      error: 'Le contenu ne peut pas être vide'
    };
  }
  
  if (trimmedContent.length > 10000) {
    return {
      isValid: false,
      error: 'Le contenu ne peut pas dépasser 10000 caractères'
    };
  }
  
  // Vérifier qu'il y a du contenu significatif (pas juste des espaces ou caractères spéciaux)
  const meaningfulContent = trimmedContent.replace(/[\s\n\r\t]/g, '');
  if (meaningfulContent.length < 10) {
    return {
      isValid: false,
      error: 'Le contenu doit contenir au moins 10 caractères significatifs'
    };
  }
  
  return { isValid: true, content: trimmedContent };
};

// Helper pour valider les métadonnées
const validateMetadata = (metadata) => {
  if (!metadata) return { isValid: true, metadata: {} };
  
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {
      isValid: false,
      error: 'Les métadonnées doivent être un objet'
    };
  }
  
  // Vérifier la taille des métadonnées (sérialisées)
  try {
    const serialized = JSON.stringify(metadata);
    if (serialized.length > 5000) { // 5KB max pour les métadonnées
      return {
        isValid: false,
        error: 'Les métadonnées sont trop volumineuses (max 5KB)'
      };
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'Les métadonnées ne peuvent pas être sérialisées'
    };
  }
  
  return { isValid: true, metadata };
};

// Schema de validation complet pour l'upload avec toutes les vérifications
const fullUploadValidationSchema = Joi.object({
  title: Joi.string()
    .max(500)
    .optional(),
  
  content: Joi.string()
    .when('$hasFile', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  
  tags: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.array().items(Joi.string())
    )
    .optional(),
  
  metadata: Joi.object()
    .optional(),
  
  sourceUrl: Joi.string()
    .uri()
    .optional()
    .custom((value, helpers) => {
      const validation = validateUrl(value);
      if (!validation.isValid) {
        return helpers.error('string.custom', { error: validation.error });
      }
      return value;
    }),
});

module.exports = {
  knowledgeValidators: {
    createKnowledgeSchema,
    updateKnowledgeSchema,
    getKnowledgeBaseSchema,
    bulkImportSchema,
    searchKnowledgeSchema,
    createFromUrlSchema,
    crawlSiteSchema,
    uploadFileSchema,
    exportSchema,
    archiveSchema,
    duplicateSchema,
    regenerateEmbeddingsSchema,
    fullUploadValidationSchema,
  },
  
  // Export des helpers pour utilisation dans les contrôleurs
  helpers: {
    validateFileType,
    validateFileSize,
    validateUrl,
    cleanTags,
    validateTextContent,
    validateMetadata,
  }
};
