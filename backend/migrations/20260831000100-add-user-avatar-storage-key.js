'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'avatar_storage_key', {
      type: Sequelize.STRING(500), allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'avatar_storage_key');
  },
};
