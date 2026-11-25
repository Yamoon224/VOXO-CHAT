const sharp = require('sharp');
const ocrService = require('./ocrService');

jest.setTimeout(120000);

async function createTextImage() {
  const svg = Buffer.from(
    '<svg width="1200" height="320">'
    + '<rect width="100%" height="100%" fill="white"/>'
    + '<text x="55" y="220" font-family="sans-serif" font-size="150" '
    + 'font-weight="bold" fill="black">TEST OCR</text></svg>'
  );
  return sharp(svg).png().toBuffer();
}

describe('ocrService', () => {
  it('cleans extracted text centrally', () => {
    expect(ocrService.cleanOCRText('  Bonjour   monde\r\n\r\n\r\nSuite  '))
      .toBe('Bonjour monde\n\nSuite');
  });

  it('extracts text from a real image fixture', async () => {
    const result = await ocrService.processImage(
      await createTextImage(),
      'fixture.png',
      'image/png'
    );
    expect(result.success).toBe(true);
    expect(result.content.toUpperCase()).toContain('TEST');
    expect(result.metadata.ocrEngine).toBe('tesseract');
  });

  it('reports a truthful OCR health status', async () => {
    const health = await ocrService.healthCheck();
    expect(health).toMatchObject({
      status: 'healthy',
      ocrWorking: true,
    });
  });
});
