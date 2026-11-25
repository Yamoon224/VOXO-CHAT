'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Tenant', 'allowed_app_ids', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.addColumn('Tenant', 'enforce_app_ids', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Tenant', 'enforce_app_ids');
    await queryInterface.removeColumn('Tenant', 'allowed_app_ids');
  },
};
