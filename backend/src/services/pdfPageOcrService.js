const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const pdf2pic = require('pdf2pic');
const sharp = require('sharp');
const tesseractWorkerService = require('./tesseractWorkerService');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const OCR_PARAMETERS = { tessedit_pageseg_mode: '3' };
const MAX_PAGE_PIXELS = 40_000_000;

async function prepareImage(buffer) {
  const image = sharp(buffer, {
    failOn: 'error',
    limitInputPixels: MAX_PAGE_PIXELS,
    sequentialRead: true,
  });
  const metadata = await image.metadata();
  // Erreur interne : elle est rattrapée et seulement journalisée par extract()
  // ci-dessous, elle n'atteint jamais le client — pas de code i18n à lui donner.
  if (!metadata.width || !metadata.height) throw new Error('Empty page render');
  return image.greyscale().normalize().sharpen().png().toBuffer();
}

async function recognize(buffer) {
  const worker = await tesseractWorkerService.createWorker('fra+eng');
  try {
    await worker.setParameters(OCR_PARAMETERS);
    const { data } = await worker.recognize(buffer);
    return { text: String(data.text || '').trim(), confidence: Number(data.confidence) || 0 };
  } finally {
    await worker.terminate().catch(() => {});
  }
}

async function renderPage(convert, pageNumber) {
  const rendered = await convert(pageNumber, { responseType: 'buffer' });
  if (!Buffer.isBuffer(rendered?.buffer) || rendered.buffer.length === 0) {
    // Erreur interne rattrapée par extract() : journalisée, jamais renvoyée.
    throw new Error('The PDF engine produced an empty page');
  }
  return prepareImage(rendered.buffer);
}

async function extract(buffer, pageCount) {
  const sessionDir = await fs.mkdtemp(path.join(os.tmpdir(), 'voxo-pdf-'));
  const sourcePath = path.join(sessionDir, 'document.pdf');
  const results = [];
  try {
    await fs.writeFile(sourcePath, buffer);
    const convert = pdf2pic.fromPath(sourcePath, {
      density: 200,
      saveFilename: 'page',
      savePath: sessionDir,
      format: 'png',
      width: 2000,
      height: 2000,
      quality: 80,
    });

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      try {
        const image = await renderPage(convert, pageNumber);
        results.push({ pageNumber, success: true, ...(await recognize(image)) });
      } catch (error) {
        console.warn('PDF OCR page échouée', { pageNumber, reason: error.message });
        results.push({ pageNumber, success: false, text: '', confidence: 0 });
      }
    }
  } finally {
    await fs.rm(sessionDir, { recursive: true, force: true }).catch(() => {});
  }

  const successful = results.filter(result => result.success);
  const text = successful
    .filter(result => result.text)
    .map(result => `--- Page ${result.pageNumber} ---\n${result.text}`)
    .join('\n\n');
  const avgConfidence = successful.length
    ? successful.reduce((sum, result) => sum + result.confidence, 0) / successful.length
    : 0;
  return {
    text,
    avgConfidence,
    failedPages: results.filter(result => !result.success).map(result => result.pageNumber),
  };
}

async function healthCheck() {
  for (const command of ['gm', 'magick']) {
    try {
      await execFileAsync(command, ['-version'], { timeout: 3000, windowsHide: true });
      return true;
    } catch {
      // Tester le moteur suivant.
    }
  }
  return false;
}

module.exports = { extract, healthCheck, prepareImage, renderPage, recognize, MAX_PAGE_PIXELS };
