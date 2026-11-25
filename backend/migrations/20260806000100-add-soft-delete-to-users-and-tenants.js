'use strict';

// Soft delete des comptes : la ligne survit 30 jours après la suppression
// (conservation / audit) avant purge définitive par purgeDeletedAccounts.js.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('User', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('Tenant', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Le script de purge balaye exclusivement sur ces colonnes.
    await queryInterface.addIndex('User', ['deleted_at'], {
      name: 'user_deleted_at_idx',
    });
    await queryInterface.addIndex('Tenant', ['deleted_at'], {
      name: 'tenant_deleted_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Tenant', 'tenant_deleted_at_idx');
    await queryInterface.removeIndex('User', 'user_deleted_at_idx');
    await queryInterface.removeColumn('Tenant', 'deleted_at');
    await queryInterface.removeColumn('User', 'deleted_at');
  },
};
