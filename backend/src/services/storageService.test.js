const mockListBuckets = jest.fn();
const mockCreateSignedUrl = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      listBuckets: mockListBuckets,
      from: jest.fn(() => ({ createSignedUrl: mockCreateSignedUrl })),
    },
  })),
}));
jest.mock('../config/config', () => ({
  supabase: { url: 'https://storage.test', serviceRoleKey: 'service-role' },
  storage: { bucket: 'voxo-files', signedUrlTtl: 300 },
}));

const storageService = require('./storageService');

describe('storageService.checkAvailability', () => {
  beforeEach(() => jest.clearAllMocks());

  test('confirme la présence du bucket privé', async () => {
    mockListBuckets.mockResolvedValue({
      data: [{ name: 'voxo-files', public: false }],
      error: null,
    });

    await expect(storageService.checkAvailability()).resolves.toEqual({
      available: true,
      isPublic: false,
    });
    expect(storageService.getAvailabilityStatus()).toEqual({ available: true, isPublic: false });
  });

  test('signale un bucket absent sans exposer la configuration', async () => {
    mockListBuckets.mockResolvedValue({ data: [], error: null });

    await expect(storageService.checkAvailability()).resolves.toEqual({
      available: false,
      reason: 'bucket_missing',
    });
  });

  test('traduit un objet absent en erreur de fichier localisée', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { statusCode: 404, code: 'not_found', message: 'Object not found' },
    });

    await expect(storageService.createSignedUrl(
      'tenant-1/conversations/missing.pdf', 'tenant-1'
    )).rejects.toMatchObject({ statusCode: 404, code: 'FILE_NOT_FOUND' });
  });

  test('masque les détails fournisseur lors d’une panne de signature', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { statusCode: 500, code: 'provider_down', message: 'private/path.pdf failed' },
    });

    await expect(storageService.createSignedUrl(
      'tenant-1/conversations/private.pdf', 'tenant-1'
    )).rejects.toMatchObject({ statusCode: 502, code: 'STORAGE_ERROR' });
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('storage_operation_failed'));
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('private.pdf');
    consoleError.mockRestore();
  });
});
