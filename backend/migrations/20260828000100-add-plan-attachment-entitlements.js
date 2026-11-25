'use strict';

/**
 * Droits de pièces jointes par forfait.
 *
 * Les deux options restent activées pour les forfaits existants afin de ne
 * pas interrompre les conversations en cours lors du déploiement. Elles sont
 * ensuite pilotées depuis l'administration des forfaits.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('plans');
    const entitlements = [
      'allow_visitor_attachments',
      'allow_agent_attachments',
    ];

    for (const column of entitlements) {
      if (columns[column]) continue;
      await queryInterface.addColumn('plans', column, {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
  },

  // Les colonnes sont aussi gérées par la migration du 26 août : cette
  // migration ne les retire donc jamais lors d'un rollback.
  async down() {},
};
