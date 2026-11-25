'use strict';

// Accès par ressource, attribués par le propriétaire à chaque membre.
//
// On ne stocke QUE la surcharge : `{}` signifie « préréglage du rôle », et le
// niveau effectif est recalculé à chaque lecture par src/config/permissions.js.
// C'est ce qui permet à un membre rétrogradé de retomber dans les clous sans
// réécriture, et de faire évoluer les préréglages sans migration de données.
//
// Pas d'index : la colonne n'est jamais un critère de filtre, elle est
// uniquement lue avec la ligne à laquelle elle appartient. Un index GIN
// coûterait en écriture sans rien apporter en lecture.
//
// Pas de backfill non plus : les préréglages owner/admin reproduisent l'accès
// actuel à l'identique. Seuls les membres « user » changent, ce qui est
// précisément l'objet de la fonctionnalité.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('User', 'permission_overrides', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });

    // L'invitation transporte les accès choisis jusqu'à la création du compte.
    await queryInterface.addColumn('team_invitations', 'permission_overrides', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('team_invitations', 'permission_overrides');
    await queryInterface.removeColumn('User', 'permission_overrides');
  },
};
