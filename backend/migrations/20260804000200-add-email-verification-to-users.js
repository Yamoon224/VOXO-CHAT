'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('User', 'email_verified_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('User', 'pending_email', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    // Les comptes créés avant l'introduction de la vérification sont considérés
    // vérifiés : sans cela, ce lot enfermerait dehors tous les utilisateurs existants.
    await queryInterface.sequelize.query(
      'UPDATE "User" SET email_verified_at = NOW() WHERE email_verified_at IS NULL'
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('User', 'pending_email');
    await queryInterface.removeColumn('User', 'email_verified_at');
  },
};
