'use strict';

const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('channel_users', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        tenant_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'Tenant', key: 'id' },
          onDelete: 'CASCADE',
        },
        channel: {
          type: Sequelize.STRING(32),
          allowNull: false,
        },
        external_user_id: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
      }, { transaction });

      await queryInterface.addConstraint('channel_users', {
        fields: ['channel'],
        type: 'check',
        where: {
          channel: {
            [Sequelize.Op.in]: ['web', 'telegram', 'whatsapp'],
          },
        },
        name: 'channel_users_channel_check',
        transaction,
      });

      await queryInterface.addIndex(
        'channel_users',
        ['tenant_id', 'channel', 'external_user_id'],
        {
          unique: true,
          name: 'channel_users_tenant_channel_external_unique_idx',
          transaction,
        }
      );

      const existingUsers = await queryInterface.sequelize.query(
        `SELECT DISTINCT tenant_id, channel, external_user_id
         FROM "Conversation"
         WHERE external_user_id IS NOT NULL
           AND external_user_id <> ''
           AND channel IN ('web', 'telegram', 'whatsapp')`,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      if (existingUsers.length > 0) {
        const now = new Date();
        await queryInterface.bulkInsert(
          'channel_users',
          existingUsers.map((user) => ({
            id: randomUUID(),
            tenant_id: user.tenant_id,
            channel: user.channel,
            external_user_id: user.external_user_id,
            created_at: now,
            updated_at: now,
          })),
          { transaction }
        );
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('channel_users', { transaction });
    });
  },
};
