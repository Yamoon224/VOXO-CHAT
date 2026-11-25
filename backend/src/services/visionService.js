// Prépare les images validées pour les appels multimodaux.
const imageReadabilityService = require('./imageReadabilityService');

const VISION_PATTERNS = [
  /gpt-4o/i,
  /gpt-4\.\d/i,
  /gpt-5/i,
  /gpt-4-turbo/i,
  /claude-3/i,
  /claude-[45]/i,
  /gemini/i,
  /llama-3\.2-(11|90)b-vision/i,
  /pixtral/i,
  /qwen.*-vl/i,
];

function supportsVision(model) {
  return Boolean(model) && VISION_PATTERNS.some(pattern => pattern.test(model));
}

async function toDataUrl(buffer) {
  const prepared = await imageReadabilityService.prepareForVision(buffer);
  return `data:image/jpeg;base64,${prepared.toString('base64')}`;
}

/** Retourne l'état réel de préparation, sans repli OCR silencieux. */
async function buildUserContent(text, imageBuffers = []) {
  const parts = [];
  let unreadableCount = 0;

  for (const buffer of imageBuffers) {
    try {
      const url = await toDataUrl(buffer);
      parts.push({ type: 'image_url', image_url: { url } });
    } catch (error) {
      if (error.code !== 'IMAGE_UNREADABLE') throw error;
      unreadableCount += 1;
    }
  }

  if (imageBuffers.length > 0 && parts.length === 0) {
    throw imageReadabilityService.unreadableImageError();
  }

  return {
    content: parts.length > 0
      ? [{ type: 'text', text: text || 'Décris et analyse la ou les images jointes.' }, ...parts]
      : null,
    hasReadableImage: parts.length > 0,
    visionUsed: parts.length > 0,
    unreadableCount,
  };
}

module.exports = { supportsVision, buildUserContent, toDataUrl, VISION_PATTERNS };
