jest.mock('../config/config', () => ({
  media: { maxBytes: 1024 },
}));

const mediaValidationService = require('./mediaValidationService');

describe('mediaValidationService', () => {
  it.each([
    [Buffer.from([0xFF, 0xD8, 0xFF, 0x00]), 'image', 'image/jpeg'],
    [Buffer.from('BMimage'), 'image', 'image/bmp'],
    [Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x01]), 'image', 'image/tiff'],
    [Buffer.from('%PDF-1.4\ncontent'), 'document', 'application/pdf'],
    [Buffer.from('OggSvoice'), 'voice', 'audio/ogg'],
    [Buffer.from([0x1A, 0x45, 0xDF, 0xA3, 0x01]), 'voice', 'audio/webm'],
  ])('accepts a valid signed media', (buffer, expectedType, mimeType) => {
    expect(mediaValidationService.validate({
      buffer,
      fileName: `file.${mimeType.split('/')[1]}`,
      mimeType,
      expectedType,
    })).toMatchObject({ category: expectedType });
  });

  it('accepts strict UTF-8 text and markdown', () => {
    expect(mediaValidationService.validate({
      buffer: Buffer.from('# Titre\nContenu en français', 'utf8'),
      fileName: 'readme.md',
      mimeType: 'text/markdown',
      expectedType: 'document',
    })).toMatchObject({ extension: '.md' });
  });

  it('accepts a DOCX container and rejects a generic ZIP archive', () => {
    const docx = Buffer.concat([
      Buffer.from([0x50, 0x4B, 0x03, 0x04]),
      Buffer.from('[Content_Types].xml word/document.xml'),
    ]);
    expect(mediaValidationService.validate({
      buffer: docx,
      fileName: 'document.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      expectedType: 'document',
    })).toMatchObject({ extension: '.docx' });
    expect(() => mediaValidationService.validate({
      buffer: Buffer.concat([Buffer.from([0x50, 0x4B, 0x03, 0x04]), Buffer.from('archive')]),
      fileName: 'archive.docx',
      expectedType: 'document',
    })).toThrow('pas pris en charge');
  });

  it('rejects empty, oversized and spoofed files', () => {
    expect(() => mediaValidationService.validate({
      buffer: Buffer.alloc(0),
      expectedType: 'image',
    })).toThrow('vide');
    expect(() => mediaValidationService.validate({
      buffer: Buffer.alloc(1025, 1),
      expectedType: 'image',
    })).toThrow('taille maximale');
    expect(() => mediaValidationService.validate({
      buffer: Buffer.from('%PDF-1.4'),
      mimeType: 'image/png',
      expectedType: 'image',
    })).toThrow('type annoncé');
  });

  it('rejects an unsupported audio signature', () => {
    expect(() => mediaValidationService.validate({
      buffer: Buffer.from('unsupported voice'),
      fileName: 'voice.aac',
      mimeType: 'audio/aac',
      expectedType: 'voice',
    })).toThrow('pas pris en charge');
  });

  it('rejects spoofed extensions and MIME types within the same category', () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x01]);
    expect(() => mediaValidationService.validate({
      buffer: png,
      fileName: 'photo.jpg',
      mimeType: 'image/png',
      expectedType: 'image',
    })).toThrow('extension');
    expect(() => mediaValidationService.validate({
      buffer: png,
      fileName: 'photo.png',
      mimeType: 'image/jpeg',
      expectedType: 'image',
    })).toThrow('type MIME');
  });
});
