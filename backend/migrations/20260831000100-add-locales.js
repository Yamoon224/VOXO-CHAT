'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const definition = {
      type: Sequelize.STRING(2),
      allowNull: false,
      defaultValue: 'fr',
    };
    await queryInterface.addColumn('User', 'preferred_locale', definition);
    await queryInterface.addColumn('admin_users', 'preferred_locale', definition);
    await queryInterface.addColumn('team_invitations', 'locale', definition);
    await queryInterface.addColumn('admin_invitations', 'locale', definition);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('admin_invitations', 'locale');
    await queryInterface.removeColumn('team_invitations', 'locale');
    await queryInterface.removeColumn('admin_users', 'preferred_locale');
    await queryInterface.removeColumn('User', 'preferred_locale');
  },
};
