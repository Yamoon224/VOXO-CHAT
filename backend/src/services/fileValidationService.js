// backend/src/services/fileValidationService.js
// Validation des fichiers entrants : taille, extension, cohérence de signature
// binaire, nom sûr. Le contrôle de signature empêche qu'une image renommée en
// .pdf (ou un exécutable renommé) atteigne les extracteurs.
const path = require('path');
const { AppError } = require('../middleware/errorMiddleware');
const { normalizeFilenameEncoding } = require('../utils/filenameEncoding');
const { dynamicMessage } = require('../i18n/messages');
const {
  MAX_FILE_BYTES,
  extensionOf,
  isAllowedExtension,
  canonicalMimeFor,
  categoryOf,
  readableExtensions
} = require('../config/fileUploads');

// Signatures attendues par extension. Un tableau vide signifie « format sans
// signature fiable » (texte brut) : seul l'encodage est alors vérifié.
const SIGNATURES = {
  '.pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  '.docx': [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]], // conteneur ZIP
  '.xlsx': [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]],
  '.doc': [[0xd0, 0xcf, 0x11, 0xe0]], // conteneur OLE2
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]],
  '.png': [[0x89, 0x50, 0x4e, 0x47]],
  '.gif': [[0x47, 0x49, 0x46, 0x38]],
  '.bmp': [[0x42, 0x4d]],
  '.tif': [[0x49, 0x49, 0x2a, 0x00], [0x4d, 0x4d, 0x00, 0x2a]],
  '.tiff': [[0x49, 0x49, 0x2a, 0x00], [0x4d, 0x4d, 0x00, 0x2a]],
  '.webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF, le marqueur WEBP est vérifié à part
  '.txt': [],
  '.md': []
};

function startsWith(buffer, bytes) {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
}

function matchesSignature(buffer, extension) {
  const expected = SIGNATURES[extension];
  if (!expected || expected.length === 0) return true;
  if (!expected.some(bytes => startsWith(buffer, bytes))) return false;
  // RIFF sert aussi aux WAV et AVI : on exige le marqueur WEBP en octets 8-11.
  if (extension === '.webp') return buffer.slice(8, 12).toString('latin1') === 'WEBP';
  return true;
}

/**
 * Un fichier texte doit être décodable en UTF-8 et ne pas contenir d'octet nul,
 * marqueur d'un binaire déguisé.
 */
function looksLikeText(buffer) {
  const sample = buffer.slice(0, 4096);
  if (sample.includes(0x00)) return false;
  return !sample.toString('utf8').includes('�');
}

/**
 * Neutralise toute traversée de répertoire et borne la longueur. Le nom retourné
 * ne sert qu'à l'affichage et aux métadonnées : les clés de stockage sont
 * générées séparément.
 */
function safeFilename(filename) {
  // Les antislashs sont normalisés d'abord : sous POSIX, basename ne les traite
  // pas comme des séparateurs et « ..\..\secret.pdf » passerait entier.
  const normalized = normalizeFilenameEncoding(filename);
  const basename = path.basename(normalized.replace(/\\/g, '/'));
  const base = [...basename].filter(character => {
    const codePoint = character.codePointAt(0);
    return codePoint > 0x1f && codePoint !== 0x7f;
  }).join('');
  const cleaned = base.replace(/[\\/:*?"<>|]/g, '_').replace(/^\.+/, '').trim();
  if (!cleaned) return 'fichier';
  if (cleaned.length <= 200) return cleaned;
  // On tronque le radical, jamais l'extension : sans elle le fichier serait
  // ensuite refusé comme format non pris en charge.
  const extension = extensionOf(cleaned);
  return cleaned.slice(0, 200 - extension.length) + extension;
}

/**
 * Valide un upload et retourne les métadonnées normalisées.
 * Lève une AppError localisée au premier problème rencontré.
 *
 * `locale` est optionnelle : les appelants qui disposent de la requête HTTP la
 * transmettent, les chaînes d'appel plus profondes gardent le français par
 * défaut. Les deux messages interpolés ci-dessous (taille limite, liste des
 * formats) ne peuvent pas passer par MESSAGES[code], qui ne stocke que des
 * chaînes plates — cf. dynamicMessage() dans src/i18n/messages.js.
 */
function validateUpload(buffer, filename, mimeType, context = 'knowledge', locale = 'fr') {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError('Le fichier est vide.', 400, { code: 'EMPTY_FILE' });
  }

  if (buffer.length > MAX_FILE_BYTES) {
    const limit = Math.round(MAX_FILE_BYTES / (1024 * 1024));
    throw new AppError(
      dynamicMessage({
        fr: `Fichier trop volumineux. La taille maximale est de ${limit} Mo.`,
        en: `File too large. The maximum size is ${limit} MB.`,
      }, locale),
      400,
      {
        code: 'FILE_TOO_LARGE',
        preTranslated: true,
        details: { maxBytes: MAX_FILE_BYTES, size: buffer.length },
      }
    );
  }

  const name = safeFilename(filename);
  const extension = extensionOf(name);

  if (!isAllowedExtension(name, context)) {
    throw new AppError(
      dynamicMessage({
        fr: `Format non pris en charge. Formats acceptés : ${readableExtensions(context)}.`,
        en: `Unsupported format. Accepted formats: ${readableExtensions(context)}.`,
      }, locale),
      400,
      { code: 'UNSUPPORTED_FILE_TYPE', preTranslated: true, details: { extension } }
    );
  }

  if (!matchesSignature(buffer, extension)) {
    throw new AppError(
      "Le contenu du fichier ne correspond pas à son extension. Vérifiez qu'il n'a pas été renommé.",
      400,
      { code: 'FILE_SIGNATURE_MISMATCH', details: { extension } }
    );
  }

  if (SIGNATURES[extension]?.length === 0 && !looksLikeText(buffer)) {
    throw new AppError(
      'Ce fichier texte est illisible : il doit être encodé en UTF-8.',
      400,
      { code: 'FILE_SIGNATURE_MISMATCH', details: { extension } }
    );
  }

  return {
    filename: name,
    extension,
    mimeType: canonicalMimeFor(name) || mimeType || 'application/octet-stream',
    category: categoryOf(name),
    size: buffer.length
  };
}

module.exports = { validateUpload, safeFilename, matchesSignature, looksLikeText };
