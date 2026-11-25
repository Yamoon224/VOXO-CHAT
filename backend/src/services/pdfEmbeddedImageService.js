const crypto = require('crypto');
const sharp = require('sharp');
const pdfjs = require('pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js');
const imageGridService = require('./imageGridService');
const { AppError } = require('../middleware/errorMiddleware');
const { dynamicMessage } = require('../i18n/messages');

const MAX_PAGES = Number.parseInt(process.env.PDF_MAX_PAGES, 10) || 50;
const MAX_IMAGE_PIXELS = 40_000_000;

function loadObject(page, name) {
  return new Promise((resolve, reject) => {
    try {
      const immediate = page.objs.get(name, resolve);
      if (immediate) resolve(immediate);
    } catch (error) {
      reject(error);
    }
  });
}

async function encodeImage(image) {
  const width = Number(image?.width);
  const height = Number(image?.height);
  const data = image?.data;
  if (!width || !height || !data) return null;
  if (width * height > MAX_IMAGE_PIXELS) return null;
  const channels = Math.round(data.length / (width * height));
  if (![1, 3, 4].includes(channels)) return null;
  return sharp(Buffer.from(data), { raw: { width, height, channels } }).png().toBuffer();
}

function imagePlacements(operators) {
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const placements = [];
  operators.fnArray.forEach((operation, index) => {
    const args = operators.argsArray[index] || [];
    if (operation === pdfjs.OPS.save) stack.push([...matrix]);
    if (operation === pdfjs.OPS.restore) matrix = stack.pop() || matrix;
    if (operation === pdfjs.OPS.transform) matrix = pdfjs.Util.transform(matrix, args);
    if (operation === pdfjs.OPS.paintImageXObject) {
      const points = [[matrix[4], matrix[5]], [matrix[0] + matrix[4], matrix[3] + matrix[5]]];
      placements.push({
        name: args[0],
        bounds: {
          left: Math.min(points[0][0], points[1][0]), right: Math.max(points[0][0], points[1][0]),
          bottom: Math.min(points[0][1], points[1][1]), top: Math.max(points[0][1], points[1][1]),
        },
      });
    }
  });
  return placements;
}

function associatedText(textItems, bounds) {
  return textItems.filter(item => {
    const x = item.transform?.[4] || 0;
    const y = item.transform?.[5] || 0;
    return x >= bounds.left - 20 && x <= bounds.right + 20
      && y >= bounds.bottom - 100 && y <= bounds.top + 60;
  }).map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
}

function isProductShape(image) {
  if (!image || image.width < 120 || image.height < 120) return false;
  const ratio = image.width / image.height;
  return ratio >= 0.33 && ratio <= 3;
}

async function pageImages(page, pageNumber) {
  const operators = await page.getOperatorList();
  const textItems = (await page.getTextContent()).items || [];
  const unique = [...new Map(imagePlacements(operators).map(item => [item.name, item])).values()];
  const images = [];
  for (const placement of unique) {
    try {
      const image = await loadObject(page, placement.name);
      if (!isProductShape(image)) continue;
      const buffer = await encodeImage(image);
      if (!buffer) continue;
      images.push({
        pageNumber,
        width: image.width,
        height: image.height,
        buffer,
        hash: crypto.createHash('sha256').update(buffer).digest('hex'),
        nearbyText: associatedText(textItems, placement.bounds),
      });
    } catch (error) {
      console.warn('Image PDF ignorée', { pageNumber, reason: error.message });
    }
  }
  if (images.length === 1 && images[0].width >= 800 && images[0].height >= 800) {
    const cells = await imageGridService.split(images[0].buffer);
    if (cells.length > 1) return Promise.all(cells.map(async (buffer, index) => ({
      pageNumber,
      width: (await sharp(buffer).metadata()).width,
      height: (await sharp(buffer).metadata()).height,
      buffer,
      hash: crypto.createHash('sha256').update(buffer).digest('hex'),
      gridIndex: index,
      nearbyText: images[0].nearbyText,
    })));
  }
  return images;
}

async function extract(buffer) {
  let document;
  try {
    document = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      disableJavaScript: true,
      isEvalSupported: false,
    }).promise;
  } catch {
    throw new AppError('Ce PDF est endommagé ou illisible.', 422, { code: 'PDF_INVALID' });
  }
  if (document.numPages > MAX_PAGES) {
    await document.destroy();
    // Nombre de pages interpolé : texte résolu ici, MESSAGES[code] ne portant
    // qu'une chaîne plate (cf. dynamicMessage, src/i18n/messages.js).
    throw new AppError(
      dynamicMessage({
        fr: `Ce PDF contient ${document.numPages} pages. La limite est de ${MAX_PAGES} pages.`,
        en: `This PDF has ${document.numPages} pages. The limit is ${MAX_PAGES} pages.`,
      }),
      400,
      {
        code: 'PDF_TOO_MANY_PAGES',
        preTranslated: true,
        details: { pageCount: document.numPages, maxPages: MAX_PAGES },
      }
    );
  }
  const images = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      images.push(...await pageImages(page, pageNumber));
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }
  const frequency = images.reduce((map, image) => map.set(image.hash, (map.get(image.hash) || 0) + 1), new Map());
  return images.filter(image => frequency.get(image.hash) === 1);
}

module.exports = {
  extract, pageImages, encodeImage, isProductShape, imagePlacements, associatedText,
  MAX_PAGES, MAX_IMAGE_PIXELS,
};
