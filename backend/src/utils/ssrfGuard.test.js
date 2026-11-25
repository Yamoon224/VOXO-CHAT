const mockLookup = jest.fn();
jest.mock('dns', () => ({ promises: { lookup: (...args) => mockLookup(...args) } }));

const { assertPublicUrl } = require('./ssrfGuard');

describe('ssrfGuard.assertPublicUrl', () => {
  beforeEach(() => jest.clearAllMocks());

  test('allows a URL resolving to a public IP', async () => {
    mockLookup.mockResolvedValue([{ address: '203.0.113.10', family: 4 }]);
    await expect(assertPublicUrl('https://api.tenant-business.com/orders/42')).resolves.toBeUndefined();
  });

  test('rejects an invalid URL', async () => {
    await expect(assertPublicUrl('not-a-url')).rejects.toMatchObject({
      statusCode: 400, code: 'AGENT_ACTION_URL_FORBIDDEN',
    });
  });

  test('rejects a non-http(s) scheme', async () => {
    await expect(assertPublicUrl('ftp://example.com/file')).rejects.toMatchObject({
      code: 'AGENT_ACTION_URL_FORBIDDEN',
    });
  });

  test('rejects the literal "localhost" hostname without a DNS lookup', async () => {
    await expect(assertPublicUrl('http://localhost:5000/internal')).rejects.toMatchObject({
      code: 'AGENT_ACTION_URL_FORBIDDEN',
    });
    expect(mockLookup).not.toHaveBeenCalled();
  });

  test('rejects a hostname resolving to a private IP (DNS rebinding style)', async () => {
    mockLookup.mockResolvedValue([{ address: '10.0.0.5', family: 4 }]);
    await expect(assertPublicUrl('https://internal.evil.example/api')).rejects.toMatchObject({
      code: 'AGENT_ACTION_URL_FORBIDDEN',
    });
  });

  test('rejects the cloud metadata address', async () => {
    mockLookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);
    await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data')).rejects.toMatchObject({
      code: 'AGENT_ACTION_URL_FORBIDDEN',
    });
  });

  test('rejects an unresolvable hostname', async () => {
    mockLookup.mockRejectedValue(new Error('ENOTFOUND'));
    await expect(assertPublicUrl('https://does-not-exist.invalid/x')).rejects.toMatchObject({
      code: 'AGENT_ACTION_URL_FORBIDDEN',
    });
  });
});
