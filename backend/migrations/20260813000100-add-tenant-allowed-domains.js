'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Tenant', 'allowed_domains', { type: Sequelize.JSONB, allowNull: false, defaultValue: [] });
    await queryInterface.addColumn('Tenant', 'enforce_domains', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('Tenant', 'enforce_domains');
    await queryInterface.removeColumn('Tenant', 'allowed_domains');
  }
};
