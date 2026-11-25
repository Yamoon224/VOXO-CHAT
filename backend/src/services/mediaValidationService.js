const path = require('path');
const { TextDecoder } = require('util');
const config = require('../config/config');
const { AppError } = require('../middleware/errorMiddleware');

const FORMATS = {
  jpeg: { mimeType: 'image/jpeg', extension: '.jpg', category: 'image' },
  png: { mimeType: 'image/png', extension: '.png', category: 'image' },
  webp: { mimeType: 'image/webp', extension: '.webp', category: 'image' },
  gif: { mimeType: 'image/gif', extension: '.gif', category: 'image' },
  bmp: { mimeType: 'image/bmp', extension: '.bmp', category: 'image' },
  tiff: { mimeType: 'image/tiff', extension: '.tiff', category: 'image' },
  pdf: { mimeType: 'application/pdf', extension: '.pdf', category: 'document' },
  docx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: '.docx',
    category: 'document',
  },
  txt: { mimeType: 'text/plain', extension: '.txt', category: 'document' },
  md: { mimeType: 'text/markdown', extension: '.md', category: 'document' },
  flac: { mimeType: 'audio/flac', extension: '.flac', category: 'voice' },
  mp3: { mimeType: 'audio/mpeg', extension: '.mp3', category: 'voice' },
  mp4: { mimeType: 'audio/mp4', extension: '.m4a', category: 'voice' },
  ogg: { mimeType: 'audio/ogg', extension: '.ogg', category: 'voice' },
  wav: { mimeType: 'audio/wav', extension: '.wav', category: 'voice' },
  webm: { mimeType: 'audio/webm', extension: '.webm', category: 'voice' },
};

const FORMAT_EXTENSIONS = {
  jpeg: ['.jpg', '.jpeg'],
  png: ['.png'],
  webp: ['.webp'],
  gif: ['.gif'],
  bmp: ['.bmp'],
  tiff: ['.tif', '.tiff'],
  pdf: ['.pdf'],
  docx: ['.docx'],
  txt: ['.txt'],
  md: ['.md', '.markdown'],
  flac: ['.flac'],
  mp3: ['.mp3', '.mpga', '.mpeg'],
  mp4: ['.mp4', '.m4a'],
  ogg: ['.ogg', '.oga'],
  wav: ['.wav'],
  webm: ['.webm'],
};

const FORMAT_MIME_TYPES = {
  jpeg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  bmp: ['image/bmp', 'image/x-bmp'],
  tiff: ['image/tiff'],
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/x-markdown', 'text/plain'],
  flac: ['audio/flac', 'audio/x-flac'],
  mp3: ['audio/mpeg', 'audio/mp3', 'audio/mpga'],
  mp4: ['audio/mp4', 'audio/m4a', 'video/mp4'],
  ogg: ['audio/ogg', 'application/ogg'],
  wav: ['audio/wav', 'audio/x-wav'],
  webm: ['audio/webm', 'video/webm'],
};

function startsWith(buffer, bytes) {
  return bytes.every((value, index) => buffer[index] === value);
}

function detectBinary(buffer) {
  if (startsWith(buffer, [0xFF, 0xD8, 0xFF])) return 'jpeg';
  if (startsWith(buffer, [0x89, 0x50, 0x4E, 0x47])) return 'png';
  if (buffer.slice(0, 6).toString('ascii').startsWith('GIF8')) return 'gif';
  if (buffer.slice(0, 2).toString('ascii') === 'BM') return 'bmp';
  if (startsWith(buffer, [0x49, 0x49, 0x2A, 0x00])
    || startsWith(buffer, [0x4D, 0x4D, 0x00, 0x2A])) return 'tiff';
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF') {
    const subtype = buffer.slice(8, 12).toString('ascii');
    if (subtype === 'WEBP') return 'webp';
    if (subtype === 'WAVE') return 'wav';
  }
  if (buffer.slice(0, 4).toString('ascii') === '%PDF') return 'pdf';
  if (
    startsWith(buffer, [0x50, 0x4B, 0x03, 0x04])
    && buffer.includes(Buffer.from('[Content_Types].xml'))
    && buffer.includes(Buffer.from('word/'))
  ) return 'docx';
  if (buffer.slice(0, 4).toString('ascii') === 'fLaC') return 'flac';
  if (buffer.slice(0, 4).toString('ascii') === 'OggS') return 'ogg';
  if (startsWith(buffer, [0x1A, 0x45, 0xDF, 0xA3])) return 'webm';
  if (buffer.slice(0, 3).toString('ascii') === 'ID3'
    || (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0)) return 'mp3';
  if (buffer.slice(4, 8).toString('ascii') === 'ftyp') return 'mp4';
  return null;
}

function detectText(buffer, fileName, declaredMimeType) {
  const extension = path.extname(fileName || '').toLowerCase();
  const declaredText = ['text/plain', 'text/markdown'].includes(declaredMimeType);
  if (!declaredText && !['.txt', '.md', '.markdown'].includes(extension)) return null;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return extension === '.md' || extension === '.markdown' || declaredMimeType === 'text/markdown'
      ? 'md'
      : 'txt';
  } catch {
    return null;
  }
}

function declaredCategory(mimeType = '') {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'voice';
  if (mimeType.startsWith('text/') || mimeType.includes('pdf') || mimeType.includes('word')) {
    return 'document';
  }
  return null;
}

function matchesDeclaredFormat(detectedKey, fileName, mimeType) {
  const extension = path.extname(fileName || '').toLowerCase();
  if (extension && !FORMAT_EXTENSIONS[detectedKey]?.includes(extension)) return false;

  const declaredMimeType = String(mimeType || '').toLowerCase().split(';')[0].trim();
  if (!declaredMimeType || declaredMimeType === 'application/octet-stream') return true;
  return FORMAT_MIME_TYPES[detectedKey]?.includes(declaredMimeType) === true;
}

function validate({ buffer, fileName, mimeType, expectedType }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError('Le fichier reçu est vide ou invalide', 400, {
      code: 'MEDIA_EMPTY',
    });
  }
  if (buffer.length > config.media.maxBytes) {
    throw new AppError('Le fichier dépasse la taille maximale autorisée de 10 Mo', 413, {
      code: 'MEDIA_TOO_LARGE',
    });
  }

  const detectedKey = detectBinary(buffer) || detectText(buffer, fileName, mimeType);
  const format = FORMATS[detectedKey];
  if (!format) {
    throw new AppError('Le format du fichier n’est pas pris en charge', 415, {
      code: 'MEDIA_UNSUPPORTED',
    });
  }
  if (format.category !== expectedType) {
    throw new AppError('Le contenu du fichier ne correspond pas au type annoncé', 415, {
      code: 'MEDIA_TYPE_MISMATCH',
    });
  }
  const announcedCategory = declaredCategory(String(mimeType || '').toLowerCase());
  if (announcedCategory && announcedCategory !== format.category) {
    throw new AppError('La signature du fichier ne correspond pas à son type MIME', 415, {
      code: 'MEDIA_MIME_MISMATCH',
    });
  }
  if (!matchesDeclaredFormat(detectedKey, fileName, mimeType)) {
    throw new AppError('La signature du fichier ne correspond pas à son extension ou son type MIME', 415, {
      code: 'MEDIA_FORMAT_MISMATCH',
    });
  }

  return {
    ...format,
    sizeBytes: buffer.length,
  };
}

module.exports = {
  FORMATS,
  FORMAT_EXTENSIONS,
  detectBinary,
  matchesDeclaredFormat,
  validate,
};
