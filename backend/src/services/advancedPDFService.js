const pdf = require('pdf-parse');
const path = require('path');
const { MAX_FILE_BYTES } = require('../config/fileUploads');
const { AppError } = require('../middleware/errorMiddleware');
const { dynamicMessage } = require('../i18n/messages');
const extractedTextService = require('./extractedTextService');
const pdfPageOcrService = require('./pdfPageOcrService');

const DEFAULT_MAX_PAGES = 50;
const MIN_NATIVE_TEXT = 100;

class AdvancedPDFService {
  constructor() {
    this.maxPages = Number.parseInt(process.env.PDF_MAX_PAGES, 10) || DEFAULT_MAX_PAGES;
  }

  async inspect(buffer) {
    try {
      const data = await pdf(buffer);
      const pageCount = Number(data.numpages) || 0;
      if (pageCount < 1) {
        throw new AppError('Ce PDF ne contient aucune page lisible.', 422, {
          code: 'PDF_INVALID',
        });
      }
      if (pageCount > this.maxPages) {
        // Nombre de pages interpolé : texte résolu ici, MESSAGES[code] ne
        // portant qu'une chaîne plate (cf. dynamicMessage, src/i18n/messages.js).
        throw new AppError(
          dynamicMessage({
            fr: `Ce PDF contient ${pageCount} pages. La limite est de ${this.maxPages} pages.`,
            en: `This PDF has ${pageCount} pages. The limit is ${this.maxPages} pages.`,
          }),
          400,
          {
            code: 'PDF_TOO_MANY_PAGES',
            preTranslated: true,
            details: { pageCount, maxPages: this.maxPages },
          }
        );
      }
      const text = extractedTextService.clean(data.text || '');
      return { pageCount, text, metadata: data.metadata || {}, info: data.info || {} };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Ce PDF est endommagé ou illisible.', 422, {
        code: 'PDF_INVALID',
      });
    }
  }

  async processPDF(buffer, filename) {
    this.assertValidInput(buffer, filename);
    const startedAt = Date.now();
    const inspected = await this.inspect(buffer);

    if (inspected.text.length >= MIN_NATIVE_TEXT) {
      return this.result(filename, buffer, inspected.text, inspected.pageCount, 'direct', startedAt);
    }

    const ocr = await pdfPageOcrService.extract(buffer, inspected.pageCount);
    const content = extractedTextService.clean(ocr.text);
    return this.result(filename, buffer, content, inspected.pageCount, 'ocr', startedAt, {
      avgConfidence: ocr.avgConfidence,
      failedPages: ocr.failedPages,
    });
  }

  result(filename, buffer, content, pageCount, extractionMethod, startedAt, extra = {}) {
    return {
      success: Boolean(content),
      title: this.generateTitle(filename),
      content,
      sourceType: 'upload',
      metadata: {
        originalFileName: filename,
        fileSize: buffer.length,
        pageCount,
        extractionMethod,
        textLength: content.length,
        processingDurationMs: Date.now() - startedAt,
        ...extra,
      },
    };
  }

  assertValidInput(buffer, filename) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new AppError('Le fichier PDF est vide.', 400, { code: 'EMPTY_FILE' });
    }
    if (buffer.length > MAX_FILE_BYTES) {
      throw new AppError('Le fichier PDF est trop volumineux.', 400, { code: 'FILE_TOO_LARGE' });
    }
    if (buffer.subarray(0, 4).toString() !== '%PDF' || !String(filename).toLowerCase().endsWith('.pdf')) {
      throw new AppError('Le fichier ne correspond pas à un PDF valide.', 400, {
        code: 'FILE_SIGNATURE_MISMATCH',
      });
    }
  }

  generateTitle(filename) {
    return path.basename(filename, path.extname(filename))
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, value => value.toUpperCase())
      .slice(0, 100) || 'Document PDF';
  }

  async getPDFMetadata(buffer) {
    try {
      const result = await this.inspect(buffer);
      return {
        pageCount: result.pageCount,
        metadata: result.metadata,
        info: result.info,
        hasText: Boolean(result.text),
        estimatedProcessingTime: Math.ceil(result.pageCount * 2.5),
      };
    } catch (error) {
      return { error: error.message, pageCount: 0, hasText: false, estimatedProcessingTime: 0 };
    }
  }

  setLimits(options = {}) {
    if (options.maxPages) this.maxPages = Math.max(1, Number(options.maxPages));
  }

  getStats() {
    return {
      maxPages: this.maxPages,
      supportedFormats: ['pdf'],
      ocrLanguages: ['fra', 'eng'],
      capabilities: { directExtraction: true, ocrExtraction: true, exactPageCount: true },
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      pdfProcessing: true,
      rendererAvailable: await pdfPageOcrService.healthCheck(),
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new AdvancedPDFService();
module.exports.AdvancedPDFService = AdvancedPDFService;
