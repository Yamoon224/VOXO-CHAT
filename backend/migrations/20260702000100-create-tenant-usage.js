'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tenant_usage', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Tenant',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      resource_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      period_key: {
        type: Sequelize.STRING(7),
        allowNull: false,
      },
      used: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
    });

    await queryInterface.addIndex('tenant_usage', ['tenant_id', 'resource_type', 'period_key'], {
      unique: true,
      name: 'tenant_usage_unique_period_idx',
    });
    await queryInterface.addIndex('tenant_usage', ['tenant_id'], {
      name: 'tenant_usage_tenant_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tenant_usage');
  },
};
