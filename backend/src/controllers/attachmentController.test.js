jest.mock('../models', () => ({
  MessageAttachment: { findOne: jest.fn() },
}));
jest.mock('../services/storageService', () => ({ createSignedUrl: jest.fn() }));
jest.mock('../config/config', () => ({ storage: { signedUrlTtl: 300 } }));

const { MessageAttachment } = require('../models');
const storageService = require('../services/storageService');
const { AppError } = require('../middleware/errorMiddleware');
const { getAttachmentUrl } = require('./attachmentController');

const attachment = {
  id: 'attachment-1',
  storageKey: 'tenant-1/conversations/private.pdf',
  originalName: 'contrat.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 42,
  category: 'document',
};

function responseDouble() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('attachmentController.getAttachmentUrl', () => {
  beforeEach(() => jest.clearAllMocks());

  test('génère un lien uniquement pour une pièce jointe du tenant', async () => {
    MessageAttachment.findOne.mockResolvedValue(attachment);
    storageService.createSignedUrl.mockResolvedValue('https://storage.test/signed');
    const res = responseDouble();

    await getAttachmentUrl({
      params: { attachmentId: attachment.id }, tenant: { id: 'tenant-1' },
    }, res, jest.fn());

    expect(MessageAttachment.findOne).toHaveBeenCalledWith({
      where: { id: attachment.id, tenantId: 'tenant-1' },
    });
    expect(storageService.createSignedUrl).toHaveBeenCalledWith(attachment.storageKey, 'tenant-1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('retourne une erreur localisée sans journaliser la clé de stockage', async () => {
    const error = new AppError('Stockage indisponible.', 502, { code: 'STORAGE_ERROR' });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    MessageAttachment.findOne.mockResolvedValue(attachment);
    storageService.createSignedUrl.mockRejectedValue(error);
    const next = jest.fn();

    await getAttachmentUrl({
      params: { attachmentId: attachment.id }, tenant: { id: 'tenant-1' },
    }, responseDouble(), next);

    expect(next).toHaveBeenCalledWith(error);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('attachment_signed_url_failed'));
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain(attachment.storageKey);
    consoleError.mockRestore();
  });
});
