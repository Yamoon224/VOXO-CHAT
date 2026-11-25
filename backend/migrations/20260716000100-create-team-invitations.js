'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('User', ['email'], {
      unique: true,
      name: 'user_email_unique_idx',
    });

    await queryInterface.createTable('team_invitations', {
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
      email: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.STRING(20), allowNull: false },
      token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      invited_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'User', key: 'id' },
        onDelete: 'RESTRICT',
      },
      accepted_at: { type: Sequelize.DATE, allowNull: true },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('team_invitations', ['tenant_id', 'status'], {
      name: 'team_invitations_tenant_status_idx',
    });
    await queryInterface.addIndex('team_invitations', ['tenant_id', 'email'], {
      name: 'team_invitations_tenant_email_idx',
    });
    await queryInterface.addIndex('team_invitations', ['tenant_id', 'email'], {
      unique: true,
      where: { status: 'pending' },
      name: 'team_invitations_unique_pending_email_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('team_invitations');
    await queryInterface.removeIndex('User', 'user_email_unique_idx');
  },
};
