const canvas = require('@napi-rs/canvas');
const { AppError } = require('../middleware/errorMiddleware');
const { dynamicMessage } = require('../i18n/messages');

const MAX_PAGES = Number.parseInt(process.env.PDF_MAX_PAGES, 10) || 50;
const RENDER_SCALE = 2;
let pdfjsPromise;

function loadPdfjs() {
  if (!global.DOMMatrix) global.DOMMatrix = canvas.DOMMatrix;
  if (!global.ImageData) global.ImageData = canvas.ImageData;
  if (!global.Path2D) global.Path2D = canvas.Path2D;
  pdfjsPromise ||= import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
}

async function openDocument(buffer) {
  try {
    const pdfjs = await loadPdfjs();
    const task = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      disableFontFace: false,
      useSystemFonts: true,
    });
    return await task.promise;
  } catch {
    throw new AppError('Ce PDF est endommagé ou illisible.', 422, { code: 'PDF_INVALID' });
  }
}

async function renderPage(page, pageNumber) {
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const output = canvas.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvasContext: output.getContext('2d'), viewport }).promise;
  const nativeText = (await page.getTextContent()).items.map(item => item.str).join(' ').trim();
  return {
    pageNumber,
    width: output.width,
    height: output.height,
    buffer: output.toBuffer('image/png'),
    nativeText,
  };
}

async function render(buffer, options = {}) {
  const document = options.document || await openDocument(buffer);
  try {
    if (document.numPages < 1 || document.numPages > MAX_PAGES) {
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
    const pages = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      pages.push(await renderPage(page, number));
      page.cleanup();
    }
    return { pageCount: document.numPages, pages };
  } finally {
    await document.destroy();
  }
}

async function healthCheck() {
  try {
    require.resolve('pdfjs-dist/legacy/build/pdf.mjs');
    return canvas.createCanvas(1, 1).width === 1;
  } catch {
    return false;
  }
}

module.exports = { render, openDocument, renderPage, healthCheck, MAX_PAGES, RENDER_SCALE };
