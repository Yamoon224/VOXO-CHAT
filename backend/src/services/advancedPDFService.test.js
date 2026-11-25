jest.mock('pdf-parse');
jest.mock('./pdfPageOcrService', () => ({ extract: jest.fn(), healthCheck: jest.fn() }));

const pdf = require('pdf-parse');
const pdfPageOcrService = require('./pdfPageOcrService');
const { AdvancedPDFService } = require('./advancedPDFService');

describe('AdvancedPDFService', () => {
  const buffer = Buffer.from('%PDF-1.4 fixture');
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdvancedPDFService();
    service.setLimits({ maxPages: 50 });
  });

  test.each([1, 4, 50])('OCR traite exactement les %i pages réelles', async pageCount => {
    pdf.mockResolvedValue({ numpages: pageCount, text: '', metadata: {} });
    pdfPageOcrService.extract.mockResolvedValue({
      text: 'Contenu OCR exploitable', avgConfidence: 90, failedPages: [],
    });
    const result = await service.processPDF(buffer, 'catalogue.pdf');
    expect(pdfPageOcrService.extract).toHaveBeenCalledWith(buffer, pageCount);
    expect(result.metadata.pageCount).toBe(pageCount);
  });

  test('refuse un PDF trop long avant le rendu', async () => {
    pdf.mockResolvedValue({ numpages: 51, text: '' });
    await expect(service.processPDF(buffer, 'long.pdf')).rejects.toMatchObject({
      code: 'PDF_TOO_MANY_PAGES',
    });
    expect(pdfPageOcrService.extract).not.toHaveBeenCalled();
  });

  test('conserve le nombre réel lors de l’extraction native', async () => {
    pdf.mockResolvedValue({ numpages: 4, text: 'Texte '.repeat(30) });
    const result = await service.processPDF(buffer, 'natif.pdf');
    expect(result.metadata).toMatchObject({ pageCount: 4, extractionMethod: 'direct' });
    expect(pdfPageOcrService.extract).not.toHaveBeenCalled();
  });
});
