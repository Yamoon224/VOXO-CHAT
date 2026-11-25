let mockRedisClient = null;

jest.mock('../config/redis', () => ({
  getRedisClient: () => mockRedisClient,
}));

const deduplicationService = require('./inboundDeduplicationService');

const context = {
  tenantId: 'tenant-1',
  channel: 'telegram',
  externalMessageId: 'message-1',
};

describe('inboundDeduplicationService', () => {
  beforeEach(() => {
    mockRedisClient = null;
    deduplicationService.resetMemory();
  });

  it('deduplicates in memory and can release a failed claim', async () => {
    await expect(deduplicationService.claim(context)).resolves.toBe(true);
    await expect(deduplicationService.claim(context)).resolves.toBe(false);
    await deduplicationService.release(context);
    await expect(deduplicationService.claim(context)).resolves.toBe(true);
  });

  it('uses Redis SET NX with a 24 hour expiration when available', async () => {
    mockRedisClient = {
      status: 'ready',
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };
    await expect(deduplicationService.claim(context)).resolves.toBe(true);
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      expect.stringMatching(/^inbound-message:/),
      '1',
      'EX',
      86400,
      'NX'
    );
  });
});
