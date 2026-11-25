'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admin_users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      email: { type: Sequelize.STRING(255), allowNull: false },
      password: { type: Sequelize.STRING(255), allowNull: false },
      first_name: { type: Sequelize.STRING(50), allowNull: false },
      last_name: { type: Sequelize.STRING(50), allowNull: false },
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'admin_roles', key: 'id' },
        onDelete: 'RESTRICT',
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // Index partiel comme sur `User` : un compte supprimé libère son email.
    await queryInterface.addIndex('admin_users', ['email'], {
      unique: true,
      where: { deleted_at: null },
      name: 'admin_users_email_unique_idx',
    });
    await queryInterface.addIndex('admin_users', ['role_id'], {
      name: 'admin_users_role_id_idx',
    });
    await queryInterface.addIndex('admin_users', ['is_active'], {
      name: 'admin_users_is_active_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('admin_users');
  },
};
