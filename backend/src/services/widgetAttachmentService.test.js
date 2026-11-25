jest.mock('../models', () => ({
  MessageAttachment: {
    findAll: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('./storageService', () => ({
  remove: jest.fn(async () => 1),
  isConfigured: jest.fn(() => true),
  upload: jest.fn(),
  download: jest.fn(),
}));
jest.mock('./fileValidationService', () => ({ validateUpload: jest.fn() }));
jest.mock('./extraction', () => ({ extractText: jest.fn() }));
jest.mock('./quotaService', () => ({ assertCanSendMessage: jest.fn() }));
jest.mock('./imageReadabilityService', () => ({ assertReadable: jest.fn() }));

const { MessageAttachment } = require('../models');
const storageService = require('./storageService');
const fileValidationService = require('./fileValidationService');
const imageReadabilityService = require('./imageReadabilityService');
const extraction = require('./extraction');
const service = require('./widgetAttachmentService');

describe('widgetAttachmentService.purgeOrphans', () => {
  beforeEach(() => jest.clearAllMocks());

  test('supprime les uploads sans conversation, réservations incluses', async () => {
    const orphan = {
      tenantId: 'tenant-1',
      storageKey: 'tenant-1/conversations/file.pdf',
      messageId: 'reserved-message',
      conversationId: null,
      destroy: jest.fn(async () => undefined),
    };
    MessageAttachment.findAll.mockResolvedValue([orphan]);

    await expect(service.purgeOrphans()).resolves.toBe(1);

    const where = MessageAttachment.findAll.mock.calls[0][0].where;
    expect(where.conversationId).toBeNull();
    expect(storageService.remove).toHaveBeenCalledWith(orphan.storageKey, orphan.tenantId);
    expect(orphan.destroy).toHaveBeenCalled();
  });

  test('conserve la ligne pour réessayer quand la suppression du stockage échoue', async () => {
    const orphan = {
      tenantId: 'tenant-1',
      storageKey: 'tenant-1/conversations/file.pdf',
      destroy: jest.fn(async () => undefined),
    };
    MessageAttachment.findAll.mockResolvedValue([orphan]);
    storageService.remove.mockResolvedValueOnce(0);

    await expect(service.purgeOrphans()).resolves.toBe(0);

    expect(orphan.destroy).not.toHaveBeenCalled();
  });
});

describe('widgetAttachmentService images', () => {
  const tenant = { id: 'tenant-1' };
  const upload = {
    buffer: Buffer.from('image'),
    originalname: 'photo.png',
    mimetype: 'image/png',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    storageService.isConfigured.mockReturnValue(true);
    fileValidationService.validateUpload.mockReturnValue({
      filename: 'photo.png',
      extension: '.png',
      mimeType: 'image/png',
      category: 'image',
      size: upload.buffer.length,
    });
    storageService.upload.mockResolvedValue('tenant-1/conversations/photo.png');
    extraction.extractText.mockResolvedValue({ content: '', extractionMethod: 'tesseract' });
    MessageAttachment.create.mockImplementation(async values => values);
  });

  test('ingère une image sans OCR ni lecture visuelle', async () => {
    await expect(service.receive(tenant, upload)).resolves.toMatchObject({
      extractionStatus: 'pending',
      category: 'image',
    });
    expect(imageReadabilityService.assertReadable).not.toHaveBeenCalled();
    expect(extraction.extractText).not.toHaveBeenCalled();
    expect(storageService.upload).toHaveBeenCalled();
  });

  test('ne lit le contenu qu’au moment où l’IA doit répondre', async () => {
    const attachment = {
      id: 'attachment-1', category: 'image', extractionStatus: 'pending',
      storageKey: 'tenant-1/conversations/photo.png', originalName: 'photo.png', mimeType: 'image/png',
      update: jest.fn(async values => Object.assign(attachment, values)),
    };
    storageService.download.mockResolvedValue(upload.buffer);
    extraction.extractText.mockResolvedValue({ content: '', extractionMethod: 'tesseract' });

    await service.prepareForAi('tenant-1', [attachment]);

    expect(imageReadabilityService.assertReadable).toHaveBeenCalledWith(upload.buffer);
    expect(extraction.extractText).toHaveBeenCalledWith(upload.buffer, 'photo.png', 'image/png');
    expect(attachment.update).toHaveBeenCalledWith(expect.objectContaining({ extractionStatus: 'empty' }));
  });

  test('rend une panne de relecture réessayable au lieu de déclarer l’image illisible', async () => {
    storageService.download.mockRejectedValueOnce(new Error('bucket unavailable'));
    await expect(service.loadImageBuffers('tenant-1', [{
      id: 'attachment-1',
      category: 'image',
      storageKey: 'tenant-1/conversations/photo.png',
    }])).rejects.toMatchObject({ code: 'IMAGE_RETRIEVAL_FAILED', statusCode: 503 });
  });
});
