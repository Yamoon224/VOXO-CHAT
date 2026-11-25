// shared/file-rules.mjs - Règles de fichiers partagées entre le widget et le frontend.
// Miroir client de backend/src/config/fileUploads.js : toute modification doit
// être reportée des deux côtés. Aucune dépendance npm, aucune API Node : ce
// module est bundlé tel quel dans le widget (règle « zéro dépendance runtime »).

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 3;
export const MAX_KNOWLEDGE_FILES = 10;
export const MAX_KNOWLEDGE_BATCH_BYTES = 30 * 1024 * 1024;

// Extension -> type MIME canonique. L'extension fait autorité côté client : les
// navigateurs annoncent souvent un type vide pour .md et .csv.
export const DOCUMENT_EXTENSIONS = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.md': 'text/markdown'
};

export const IMAGE_EXTENSIONS = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff'
};

// La base de connaissance n'accepte que des documents ; une conversation
// accepte aussi les images.
export const CONTEXTS = {
  knowledge: { ...DOCUMENT_EXTENSIONS, ...IMAGE_EXTENSIONS },
  conversation: { ...DOCUMENT_EXTENSIONS, ...IMAGE_EXTENSIONS }
};

export function extensionOf(filename) {
  const match = /\.[^.]+$/.exec(String(filename || '').toLowerCase());
  return match ? match[0] : '';
}

export function categoryOf(filename) {
  const extension = extensionOf(filename);
  if (IMAGE_EXTENSIONS[extension]) return 'image';
  if (DOCUMENT_EXTENSIONS[extension]) return 'document';
  return null;
}

/** Attribut accept d'un <input type="file"> pour un contexte donné. */
export function acceptAttribute(context = 'knowledge') {
  return Object.keys(CONTEXTS[context] || CONTEXTS.knowledge).join(',');
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

/**
 * Valide un fichier déjà compressé. Retourne { valid, error } — le message
 * d'erreur est destiné à l'utilisateur final, donc en français.
 */
export function validateFile(file, context = 'knowledge') {
  const allowed = CONTEXTS[context] || CONTEXTS.knowledge;

  if (!file) return { valid: false, error: 'Aucun fichier sélectionné.' };
  if (!file.size) return { valid: false, error: 'Le fichier est vide.' };

  const extension = extensionOf(file.name);
  if (!allowed[extension]) {
    const list = Object.keys(allowed).join(', ');
    return { valid: false, error: `Format non pris en charge. Formats acceptés : ${list}.` };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      valid: false,
      error: `Fichier trop volumineux (${formatSize(file.size)}). La taille maximale est de ${formatSize(MAX_FILE_BYTES)}.`
    };
  }

  return { valid: true, error: null, category: categoryOf(file.name), mimeType: allowed[extension] };
}

export function validateKnowledgeBatch(files = []) {
  if (files.length > MAX_KNOWLEDGE_FILES) {
    return { valid: false, error: `Vous pouvez sélectionner au maximum ${MAX_KNOWLEDGE_FILES} fichiers.` };
  }
  const totalBytes = files.reduce((sum, file) => sum + Number(file?.size || 0), 0);
  if (totalBytes > MAX_KNOWLEDGE_BATCH_BYTES) {
    return { valid: false, error: 'La sélection complète ne peut pas dépasser 30 Mo.', totalBytes };
  }
  return { valid: true, error: null, totalBytes, remainingBytes: MAX_KNOWLEDGE_BATCH_BYTES - totalBytes };
}

const MAX_IMAGE_DIMENSION = 2048;
const IMAGE_QUALITY = 0.82;

function toBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

function withExtension(filename, extension) {
  return `${String(filename).replace(/\.[^.]+$/, '')}${extension}`;
}

/**
 * Réduit une image côté navigateur avant l'envoi : au plus 2048 px sur le plus
 * grand côté, ré-encodée en WebP (repli JPEG si le navigateur ne sait pas
 * produire de WebP). Le fichier d'origine est conservé si la compression ne
 * fait rien gagner, si le format n'est pas une image, ou en cas d'échec —
 * la validation de taille s'applique ensuite au résultat.
 */
export async function compressImage(file, options = {}) {
  const maxDimension = options.maxDimension || MAX_IMAGE_DIMENSION;
  const quality = options.quality || IMAGE_QUALITY;

  // Le GIF peut être animé : le canvas l'aplatirait sur la première image.
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type || '')) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let blob = await toBlob(canvas, 'image/webp', quality);
    if (!blob || blob.type !== 'image/webp') {
      // Sans WebP on retombe sur le JPEG, qui n'a pas de canal alpha : on pose
      // un fond blanc pour éviter que la transparence vire au noir.
      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      blob = await toBlob(canvas, 'image/jpeg', quality);
    }

    if (!blob || blob.size >= file.size) return file;

    const extension = blob.type === 'image/webp' ? '.webp' : '.jpg';
    return new File([blob], withExtension(file.name, extension), {
      type: blob.type,
      lastModified: Date.now()
    });
  } catch {
    return file;
  } finally {
    bitmap.close?.();
  }
}

/** Compresse puis valide : c'est l'ordre attendu, la limite porte sur l'envoi réel. */
export async function prepareFile(file, context = 'knowledge') {
  const prepared = await compressImage(file);
  return { file: prepared, ...validateFile(prepared, context) };
}
