jest.mock('./imageExtractor', () => ({
  extract: jest.fn(),
}));

const imageExtractor = require('./imageExtractor');
const extraction = require('./index');

describe('shared extraction dispatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    imageExtractor.extract.mockResolvedValue({
      content: 'Texte OCR',
      extractionMethod: 'tesseract',
      metadata: {},
    });
  });

  it.each([
    ['attachment.bmp', 'image/bmp'],
    ['attachment.tif', 'image/tiff'],
    ['attachment.tiff', 'image/tiff'],
  ])('routes %s through the shared image extractor', async (filename, mimeType) => {
    const buffer = Buffer.from('validated image');
    await expect(extraction.extractText(buffer, filename, mimeType)).resolves.toMatchObject({
      content: 'Texte OCR',
      extractionMethod: 'tesseract',
    });
    expect(imageExtractor.extract).toHaveBeenCalledWith(buffer, filename, mimeType);
  });
});
