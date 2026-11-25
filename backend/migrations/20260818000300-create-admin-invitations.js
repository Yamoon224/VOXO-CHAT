'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admin_invitations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      email: { type: Sequelize.STRING(255), allowNull: false },
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'admin_roles', key: 'id' },
        onDelete: 'RESTRICT',
      },
      token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      invited_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'admin_users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      accepted_at: { type: Sequelize.DATE, allowNull: true },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('admin_invitations', ['status'], {
      name: 'admin_invitations_status_idx',
    });
    await queryInterface.addIndex('admin_invitations', ['email'], {
      unique: true,
      where: { status: 'pending' },
      name: 'admin_invitations_unique_pending_email_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('admin_invitations');
  },
};
