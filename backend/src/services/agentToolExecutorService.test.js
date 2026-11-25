const mockAxios = jest.fn();
jest.mock('../config/config', () => ({ agentAction: { maxToolResultChars: 4096 } }));
jest.mock('axios', () => (...args) => mockAxios(...args));
jest.mock('../utils/cryptoUtils', () => ({ decrypt: jest.fn(() => 'plain-secret') }));
jest.mock('../utils/ssrfGuard', () => ({ assertPublicUrl: jest.fn(async () => {}) }));

const cryptoUtils = require('../utils/cryptoUtils');
const ssrfGuard = require('../utils/ssrfGuard');
const { execute } = require('./agentToolExecutorService');

function makeAction(overrides = {}) {
  return {
    method: 'GET',
    endpointUrl: 'https://api.tenant-business.com/orders/{order_id}',
    headersTemplate: { Authorization: 'Bearer {{secret}}' },
    authSecretEncrypted: 'iv:tag:cipher',
    timeoutMs: 5000,
    ...overrides,
  };
}

describe('agentToolExecutorService.execute', () => {
  beforeEach(() => jest.clearAllMocks());

  test('substitutes path params and never leaks the secret in the returned result', async () => {
    mockAxios.mockResolvedValue({ status: 200, data: { status: 'shipped' } });

    const result = await execute(makeAction(), { order_id: '42' });

    expect(ssrfGuard.assertPublicUrl).toHaveBeenCalledWith('https://api.tenant-business.com/orders/42');
    expect(mockAxios).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://api.tenant-business.com/orders/42',
      headers: { Authorization: 'Bearer plain-secret' },
    }));
    expect(result).toEqual({ success: true, status: 200, data: { status: 'shipped' } });
    expect(JSON.stringify(result)).not.toContain('plain-secret');
  });

  test('sends non-path arguments as query params for GET', async () => {
    mockAxios.mockResolvedValue({ status: 200, data: {} });

    await execute(makeAction({ endpointUrl: 'https://api.tenant-business.com/orders' }), { email: 'a@b.com' });

    expect(mockAxios).toHaveBeenCalledWith(expect.objectContaining({
      params: { email: 'a@b.com' },
      data: undefined,
    }));
  });

  test('sends arguments as a JSON body for POST', async () => {
    mockAxios.mockResolvedValue({ status: 201, data: {} });

    await execute(makeAction({ method: 'POST', endpointUrl: 'https://api.tenant-business.com/orders' }), { amount: 10 });

    expect(mockAxios).toHaveBeenCalledWith(expect.objectContaining({
      data: { amount: 10 },
      params: undefined,
    }));
  });

  test('reports a failed HTTP status as an unsuccessful result without throwing', async () => {
    mockAxios.mockResolvedValue({ status: 404, data: { error: 'not found' } });

    const result = await execute(makeAction(), { order_id: '999' });

    expect(result).toEqual({ success: false, status: 404, data: { error: 'not found' } });
  });

  test('maps a timeout to a structured error instead of throwing', async () => {
    const timeoutError = new Error('timeout of 5000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    mockAxios.mockRejectedValue(timeoutError);

    await expect(execute(makeAction(), { order_id: '1' })).resolves.toEqual({ success: false, error: 'timeout' });
  });

  test('maps a network failure to a structured error instead of throwing', async () => {
    mockAxios.mockRejectedValue(new Error('ENOTFOUND'));

    await expect(execute(makeAction(), { order_id: '1' })).resolves.toEqual({ success: false, error: 'network_error' });
  });

  test('never decrypts a secret when the action has none configured', async () => {
    mockAxios.mockResolvedValue({ status: 200, data: {} });

    await execute(makeAction({ authSecretEncrypted: null, headersTemplate: {} }), { order_id: '1' });

    expect(cryptoUtils.decrypt).not.toHaveBeenCalled();
  });

  test('truncates a verbose tool result with the configured character limit', async () => {
    mockAxios.mockResolvedValue({ status: 200, data: 'x'.repeat(5000) });
    const result = await execute(makeAction(), { order_id: '1' });
    expect(result.data).toContain('truncated tool response');
    expect(result.data.length).toBeGreaterThan(4096);
  });
});
