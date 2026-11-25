'use strict';

/**
 * Le quota journalier utilise une clé de période « YYYY-MM-DD » (10 caractères).
 * La colonne est en varchar(7) : Postgres REJETTE la valeur, il ne la tronque
 * pas — sans cet élargissement, tout comptage journalier échoue en écriture.
 *
 * Les clés mensuelles existantes (« YYYY-MM ») restent valides : on élargit
 * sans rien réécrire.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('tenant_usage', 'period_key', {
      type: Sequelize.STRING(10),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // Rétrécir échouerait si des lignes journalières existent : on les retire
    // d'abord, elles n'ont plus de sens sans le quota journalier.
    await queryInterface.sequelize.query(
      "DELETE FROM tenant_usage WHERE resource_type = 'message_daily'"
    );
    await queryInterface.changeColumn('tenant_usage', 'period_key', {
      type: Sequelize.STRING(7),
      allowNull: false,
    });
  },
};
