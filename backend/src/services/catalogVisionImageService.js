const sharp = require('sharp');
const imageReadabilityService = require('./imageReadabilityService');

const MAX_DIMENSION = 2200;

async function prepare(buffer) {
  await imageReadabilityService.assertReadable(buffer);
  return sharp(buffer, {
    failOn: 'error',
    limitInputPixels: imageReadabilityService.MAX_INPUT_PIXELS,
    sequentialRead: true,
  }).rotate().resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  }).jpeg({ quality: 88 }).toBuffer();
}

async function toDataUrl(buffer) {
  const prepared = await prepare(buffer);
  return `data:image/jpeg;base64,${prepared.toString('base64')}`;
}

module.exports = { prepare, toDataUrl, MAX_DIMENSION };
