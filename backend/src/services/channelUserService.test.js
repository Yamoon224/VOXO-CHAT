jest.mock('../models', () => ({
  ChannelUser: {
    findOrCreate: jest.fn(),
    findOne: jest.fn(),
  },
}));

const { ChannelUser } = require('../models');
const service = require('./channelUserService');

describe('channelUserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates or reuses a mapping with the complete tenant-aware identity', async () => {
    const mapping = {
      id: 'mapping-1',
      tenantId: 'tenant-1',
      channel: 'telegram',
      externalUserId: 'external-1',
    };
    ChannelUser.findOrCreate.mockResolvedValue([mapping, true]);

    await expect(service.resolveChannelUser(mapping)).resolves.toBe(mapping);
    expect(ChannelUser.findOrCreate).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        channel: 'telegram',
        externalUserId: 'external-1',
      },
      defaults: {
        tenantId: 'tenant-1',
        channel: 'telegram',
        externalUserId: 'external-1',
      },
    });
  });

  test('keeps the same external identity isolated by tenant and channel', async () => {
    ChannelUser.findOrCreate.mockImplementation(async ({ where }) => [{ ...where }, true]);

    const tenantOne = await service.resolveChannelUser({
      tenantId: 'tenant-1',
      channel: 'telegram',
      externalUserId: 'shared-id',
    });
    const tenantTwo = await service.resolveChannelUser({
      tenantId: 'tenant-2',
      channel: 'telegram',
      externalUserId: 'shared-id',
    });
    const whatsapp = await service.resolveChannelUser({
      tenantId: 'tenant-1',
      channel: 'whatsapp',
      externalUserId: 'shared-id',
    });

    expect(tenantOne).not.toEqual(tenantTwo);
    expect(tenantOne).not.toEqual(whatsapp);
    expect(ChannelUser.findOrCreate).toHaveBeenCalledTimes(3);
    for (const [call] of ChannelUser.findOrCreate.mock.calls) {
      expect(call.where).toEqual(expect.objectContaining({
        tenantId: expect.any(String),
        channel: expect.any(String),
        externalUserId: 'shared-id',
      }));
    }
  });

  test('recovers the winning row after a concurrent unique collision', async () => {
    const collision = Object.assign(new Error('duplicate'), {
      name: 'SequelizeUniqueConstraintError',
    });
    const mapping = { id: 'mapping-winner' };
    ChannelUser.findOrCreate.mockRejectedValue(collision);
    ChannelUser.findOne.mockResolvedValue(mapping);

    await expect(service.resolveChannelUser({
      tenantId: 'tenant-1',
      channel: 'telegram',
      externalUserId: 'external-1',
    })).resolves.toBe(mapping);
    expect(ChannelUser.findOne).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        channel: 'telegram',
        externalUserId: 'external-1',
      },
    });
  });

  test('rejects incomplete or unsupported identities before querying', async () => {
    await expect(service.resolveChannelUser({
      tenantId: 'tenant-1',
      channel: 'email',
      externalUserId: 'external-1',
    })).rejects.toThrow('Unsupported channel');
    expect(ChannelUser.findOrCreate).not.toHaveBeenCalled();
  });
});
