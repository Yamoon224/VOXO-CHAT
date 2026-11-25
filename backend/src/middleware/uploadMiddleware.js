// backend/src/middleware/uploadMiddleware.js
// Réception multipart. Auparavant multer était invoqué en callback à
// l'intérieur du controller, ce qui mélangeait transport HTTP et logique
// métier ; il redevient ici un middleware de route.
const multer = require('multer');
const { AppError } = require('./errorMiddleware');
const { normalizeFilenameEncoding } = require('../utils/filenameEncoding');
const { requestLocale } = require('../i18n/locale');
const { dynamicMessage } = require('../i18n/messages');
const {
  MAX_FILE_BYTES,
  isAllowedExtension,
  readableExtensions
} = require('../config/fileUploads');

// Stockage mémoire : le fichier est extrait puis poussé vers Supabase Storage,
// il n'a jamais à toucher le disque du serveur applicatif.
const storage = multer.memoryStorage();

function buildUploader(context) {
  return multer({
    storage,
    limits: { fileSize: MAX_FILE_BYTES, files: 1 },
    // Premier filtre, sur l'extension seule : la vraie validation (signature
    // binaire) a besoin du buffer complet et vit dans fileValidationService.
    fileFilter: (req, file, cb) => {
      if (isAllowedExtension(file.originalname, context)) return cb(null, true);
      // La liste des formats acceptés est interpolée : MESSAGES[code] ne peut
      // porter qu'un texte figé, donc on résout la paire {fr, en} ici et on
      // marque preTranslated. Cf. dynamicMessage() dans src/i18n/messages.js.
      cb(new AppError(
        dynamicMessage({
          fr: `Format non pris en charge. Formats acceptés : ${readableExtensions(context)}.`,
          en: `Unsupported format. Accepted formats: ${readableExtensions(context)}.`,
        }, requestLocale(req)),
        400,
        { code: 'UNSUPPORTED_FILE_TYPE', preTranslated: true }
      ));
    }
  }).single('file');
}

/** Traduit les erreurs multer en AppError localisée. */
function toAppError(error, locale = 'fr') {
  if (error instanceof AppError) return error;

  if (error?.code === 'LIMIT_FILE_SIZE') {
    const limit = Math.round(MAX_FILE_BYTES / (1024 * 1024));
    // Taille limite interpolée : texte résolu ici plutôt que via MESSAGES[code].
    return new AppError(
      dynamicMessage({
        fr: `Fichier trop volumineux. La taille maximale est de ${limit} Mo.`,
        en: `File too large. The maximum size is ${limit} MB.`,
      }, locale),
      400,
      { code: 'FILE_TOO_LARGE', preTranslated: true }
    );
  }
  if (error?.code === 'LIMIT_FILE_COUNT' || error?.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Un seul fichier peut être envoyé à la fois.', 400, {
      code: 'TOO_MANY_FILES'
    });
  }

  console.error('❌ Upload:', error?.message || error);
  return new AppError("L'envoi du fichier a échoué.", 400, { code: 'UPLOAD_FAILED' });
}

function singleFile(context) {
  const uploader = buildUploader(context);

  return (req, res, next) => {
    uploader(req, res, error => {
      if (error) return next(toAppError(error, requestLocale(req)));
      if (!req.file) {
        const contentType = String(req.get('content-type') || '').toLowerCase();
        if (contentType && !contentType.startsWith('multipart/form-data')) {
          return next(new AppError(
            'Le fichier doit être envoyé au format multipart/form-data.',
            400,
            { code: 'UPLOAD_MULTIPART_REQUIRED' }
          ));
        }
        return next(new AppError('Aucun fichier fourni.', 400, { code: 'NO_FILE' }));
      }
      req.file.originalname = normalizeFilenameEncoding(req.file.originalname);
      next();
    });
  };
}

function optionalSingleFile(context) {
  const uploader = buildUploader(context);
  return (req, res, next) => uploader(req, res, error => {
    if (error) return next(toAppError(error));
    if (req.file) req.file.originalname = normalizeFilenameEncoding(req.file.originalname);
    next();
  });
}

module.exports = {
  uploadKnowledgeFile: singleFile('knowledge'),
  uploadCatalogFile: singleFile('knowledge'),
  uploadConversationFile: singleFile('conversation'),
  optionalConversationFile: optionalSingleFile('conversation'),
  toAppError
};
