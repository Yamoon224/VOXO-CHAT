const sharp = require('sharp');
const path = require('path');
const pdfRenderer = require('./pdfCatalogRenderer');
const imageExtractor = require('./extraction/imageExtractor');
const visionExtraction = require('./catalogVisionExtractionService');
const partialCandidates = require('./catalogPartialCandidateService');

const BOUNDARY_RATIO = 0.42;

async function ocr(buffer, label) {
  const result = await imageExtractor.extract(buffer, label, 'image/png');
  return {
    text: result.content || '',
    confidence: Number(result.metadata?.ocrConfidence) || 0,
    method: result.extractionMethod,
  };
}

async function boundary(previous, next) {
  const width = Math.min(previous.width, next.width);
  const previousHeight = Math.round(previous.height * BOUNDARY_RATIO);
  const nextHeight = Math.round(next.height * BOUNDARY_RATIO);
  const top = await sharp(previous.buffer).extract({
    left: 0, top: previous.height - previousHeight, width, height: previousHeight,
  }).toBuffer();
  const bottom = await sharp(next.buffer).extract({ left: 0, top: 0, width, height: nextHeight }).toBuffer();
  const buffer = await sharp({
    create: { width, height: previousHeight + nextHeight, channels: 3, background: 'white' },
  }).composite([{ input: top, top: 0, left: 0 }, { input: bottom, top: previousHeight, left: 0 }])
    .png().toBuffer();
  return {
    buffer, width, height: previousHeight + nextHeight,
    pageNumber: previous.pageNumber,
    sourcePages: [previous.pageNumber, next.pageNumber],
    kind: 'boundary',
  };
}

async function crop(buffer, region) {
  if (!region) return null;
  const metadata = await sharp(buffer).metadata();
  const left = Math.max(0, Math.floor(region.x * metadata.width));
  const top = Math.max(0, Math.floor(region.y * metadata.height));
  const width = Math.min(metadata.width - left, Math.ceil(region.width * metadata.width));
  const height = Math.min(metadata.height - top, Math.ceil(region.height * metadata.height));
  if (width < 80 || height < 80) return null;
  return sharp(buffer).extract({ left, top, width, height }).png().toBuffer();
}

async function analyzeUnit(unit, mode) {
  const recognized = await ocr(unit.buffer, `${unit.kind || mode}-${unit.pageNumber}.png`);
  const result = await visionExtraction.extract(unit.buffer, recognized.text, {
    mode,
    label: unit.kind === 'boundary'
      ? `Jonction des pages ${unit.sourcePages.join(' et ')}`
      : `Page ${unit.pageNumber}`,
  });
  const products = [];
  for (const product of result.products) {
    const assetBuffer = await crop(unit.buffer, product.sourceRegion).catch(() => null);
    products.push({
      ...product,
      pageNumber: unit.pageNumber,
      sourcePages: unit.sourcePages || [unit.pageNumber],
      assetBuffer,
      extraction: {
        model: result.model,
        usedFallback: result.usedFallback,
        ocrConfidence: recognized.confidence,
        ocrMethod: recognized.method,
      },
    });
  }
  return products;
}

function candidateKey(product) {
  const title = String(product.title || '').toLowerCase().replace(/[^a-z0-9à-ÿ]+/g, ' ').trim();
  const details = String(product.description || product.specifications?.[0]?.value || '')
    .toLowerCase().replace(/[^a-z0-9à-ÿ]+/g, ' ').trim().slice(0, 80);
  return `${title}:${product.sku || ''}:${product.priceAmount ?? ''}:${details}`;
}

function quality(product) {
  return (product.assetBuffer ? 3 : 0) + (product.reviewRequired ? 0 : 3)
    + Math.min(product.specifications?.length || 0, 10)
    + Math.min(String(product.title || '').length / 100, 2);
}

function titleTokens(title) {
  return new Set(String(title || '').toLowerCase().match(/[a-z0-9]{2,}/g) || []);
}

function sameCandidate(left, right) {
  if (left.priceAmount == null || right.priceAmount == null) return candidateKey(left) === candidateKey(right);
  if (left.priceAmount !== right.priceAmount || left.priceCurrency !== right.priceCurrency) return false;
  const leftTokens = titleTokens(left.title);
  const rightTokens = titleTokens(right.title);
  const intersection = [...leftTokens].filter(token => rightTokens.has(token)).length;
  const smallest = Math.min(leftTokens.size, rightTokens.size);
  return smallest > 0 && intersection / smallest >= 0.65;
}

function mergeCandidate(preferred, alternate) {
  const longerTitle = String(alternate.title || '').length > String(preferred.title || '').length
    ? alternate.title : preferred.title;
  return {
    ...preferred,
    title: longerTitle,
    sku: preferred.sku || alternate.sku,
    description: String(preferred.description || '').length >= String(alternate.description || '').length
      ? preferred.description : alternate.description,
    specifications: (preferred.specifications?.length || 0) >= (alternate.specifications?.length || 0)
      ? preferred.specifications : alternate.specifications,
    sourcePages: [...new Set([...(preferred.sourcePages || []), ...(alternate.sourcePages || [])])].sort(),
  };
}

function deduplicate(products) {
  const selected = [];
  for (const product of products.filter(partialCandidates.hasUsefulData)) {
    const index = selected.findIndex(current => sameCandidate(current, product));
    if (index < 0) {
      selected.push(product);
      continue;
    }
    const current = selected[index];
    selected[index] = quality(product) > quality(current)
      ? mergeCandidate(product, current) : mergeCandidate(current, product);
  }
  return selected;
}

async function analyzePdf(buffer) {
  const rendered = await pdfRenderer.render(buffer);
  const units = rendered.pages.map(page => ({ ...page, kind: 'page', sourcePages: [page.pageNumber] }));
  for (let index = 0; index < rendered.pages.length - 1; index += 1) {
    units.push(await boundary(rendered.pages[index], rendered.pages[index + 1]));
  }
  const queue = [...units];
  const collected = [];
  const worker = async () => {
    while (queue.length) collected.push(...await analyzeUnit(queue.shift(), 'pdf'));
  };
  await Promise.all([worker(), worker()]);
  return {
    pageCount: rendered.pageCount,
    products: partialCandidates.prepareCandidates(deduplicate(collected)),
  };
}

async function analyzeImage(buffer, filename) {
  const metadata = await sharp(buffer).metadata();
  const products = await analyzeUnit({
    buffer, width: metadata.width, height: metadata.height,
    pageNumber: 1, sourcePages: [1], kind: 'image', filename,
  }, 'image');
  return {
    pageCount: 1,
    products: partialCandidates.prepareCandidates(deduplicate(products)).map(product => ({
      ...product, assetBuffer: product.assetBuffer || buffer,
    })),
  };
}

async function analyze(file) {
  return path.extname(file.filename).toLowerCase() === '.pdf'
    ? analyzePdf(file.buffer)
    : analyzeImage(file.buffer, file.filename);
}

module.exports = {
  analyze, analyzePdf, analyzeImage, analyzeUnit, boundary, crop,
  deduplicate, candidateKey, sameCandidate, mergeCandidate,
};
