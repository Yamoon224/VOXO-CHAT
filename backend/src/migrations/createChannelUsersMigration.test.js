const migration = require('../../migrations/20260719000100-create-channel-users');

function createQueryInterface(existingUsers = []) {
  const transaction = { id: 'transaction-1' };
  return {
    transaction,
    queryInterface: {
      sequelize: {
        transaction: jest.fn(async (callback) => callback(transaction)),
        query: jest.fn(async () => existingUsers),
      },
      createTable: jest.fn(async () => undefined),
      addConstraint: jest.fn(async () => undefined),
      addIndex: jest.fn(async () => undefined),
      bulkInsert: jest.fn(async () => undefined),
      dropTable: jest.fn(async () => undefined),
    },
  };
}

const Sequelize = {
  UUID: 'UUID',
  UUIDV4: 'UUIDV4',
  STRING: jest.fn((length) => `STRING(${length})`),
  DATE: 'DATE',
  fn: jest.fn((name) => name),
  Op: { in: Symbol('in') },
  QueryTypes: { SELECT: 'SELECT' },
};

describe('create-channel-users migration', () => {
  test('creates the constrained mapping table and backfills distinct identities', async () => {
    const existingUsers = [
      {
        tenant_id: 'tenant-1',
        channel: 'telegram',
        external_user_id: 'external-1',
      },
      {
        tenant_id: 'tenant-2',
        channel: 'telegram',
        external_user_id: 'external-1',
      },
    ];
    const { queryInterface, transaction } = createQueryInterface(existingUsers);

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.createTable).toHaveBeenCalledWith(
      'channel_users',
      expect.objectContaining({
        tenant_id: expect.objectContaining({
          allowNull: false,
          onDelete: 'CASCADE',
        }),
        channel: expect.objectContaining({ allowNull: false }),
        external_user_id: expect.objectContaining({ allowNull: false }),
      }),
      { transaction }
    );
    expect(queryInterface.addConstraint).toHaveBeenCalledWith(
      'channel_users',
      expect.objectContaining({
        type: 'check',
        name: 'channel_users_channel_check',
        transaction,
      })
    );
    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      'channel_users',
      ['tenant_id', 'channel', 'external_user_id'],
      expect.objectContaining({
        unique: true,
        name: 'channel_users_tenant_channel_external_unique_idx',
        transaction,
      })
    );
    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT DISTINCT tenant_id, channel, external_user_id'),
      { type: 'SELECT', transaction }
    );
    expect(queryInterface.bulkInsert).toHaveBeenCalledWith(
      'channel_users',
      [
        expect.objectContaining(existingUsers[0]),
        expect.objectContaining(existingUsers[1]),
      ],
      { transaction }
    );
  });

  test('skips an empty backfill and drops only channel_users on rollback', async () => {
    const { queryInterface, transaction } = createQueryInterface();

    await migration.up(queryInterface, Sequelize);
    expect(queryInterface.bulkInsert).not.toHaveBeenCalled();

    await migration.down(queryInterface);
    expect(queryInterface.dropTable).toHaveBeenCalledWith('channel_users', { transaction });
  });
});
