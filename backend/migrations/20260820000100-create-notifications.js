'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
      recipient_type: { type: Sequelize.STRING(16), allowNull: false },
      recipient_id: { type: Sequelize.UUID, allowNull: false },
      type: { type: Sequelize.STRING(80), allowNull: false },
      title: { type: Sequelize.STRING(160), allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },
      url: { type: Sequelize.STRING(500), allowNull: true },
      dedupe_key: { type: Sequelize.STRING(200), allowNull: true },
      read_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('notifications', ['recipient_type', 'recipient_id', 'read_at'], { name: 'notifications_recipient_read_idx' });
    await queryInterface.addIndex('notifications', ['recipient_type', 'recipient_id', 'dedupe_key'], { unique: true, name: 'notifications_dedupe_idx' });
  },
  async down(queryInterface) { await queryInterface.dropTable('notifications'); },
};
