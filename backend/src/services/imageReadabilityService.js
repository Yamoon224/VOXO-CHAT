const sharp = require('sharp');
const { AppError } = require('../middleware/errorMiddleware');

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 80;
// Empêche une petite image compressée d'allouer des centaines de Mo au décodage.
const MAX_INPUT_PIXELS = 40_000_000;

function unreadableImageError() {
  return new AppError(
    "Cette image est illisible. Vérifiez qu'elle n'est pas endommagée puis réessayez.",
    422,
    { code: 'IMAGE_UNREADABLE' }
  );
}

/** Force un décodage complet et produit la version bornée envoyée au modèle. */
async function prepareForVision(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw unreadableImageError();
  }

  try {
    return await sharp(buffer, {
      failOn: 'error',
      limitInputPixels: MAX_INPUT_PIXELS,
      sequentialRead: true,
    })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
  } catch {
    throw unreadableImageError();
  }
}

async function assertReadable(buffer) {
  await prepareForVision(buffer);
}

module.exports = {
  assertReadable,
  prepareForVision,
  unreadableImageError,
  MAX_DIMENSION,
  JPEG_QUALITY,
  MAX_INPUT_PIXELS,
};
