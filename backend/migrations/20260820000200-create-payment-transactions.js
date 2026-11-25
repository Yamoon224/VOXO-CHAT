'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payment_transactions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE',
      },
      initiated_by_user_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'User', key: 'id' }, onDelete: 'SET NULL',
      },
      plan_name: { type: Sequelize.STRING(20), allowNull: false },
      amount: { type: Sequelize.INTEGER, allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'XOF' },
      paystack_reference: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'initialized' },
      paystack_data: { type: Sequelize.JSONB, allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('payment_transactions', ['tenant_id', 'status'], {
      name: 'payment_transactions_tenant_status_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payment_transactions');
  },
};
