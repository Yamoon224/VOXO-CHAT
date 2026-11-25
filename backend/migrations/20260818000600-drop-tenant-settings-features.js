'use strict';

/**
 * Les caractéristiques d'un forfait sont désormais dérivées à la lecture depuis
 * la table `plans`, plus recopiées dans `Tenant.settings.features` à
 * l'inscription.
 *
 * On retire la clé devenue morte : la laisser en base, périmée dès qu'un
 * administrateur édite un forfait mais d'apparence faisant autorité, est
 * précisément le décalage que la dérivation vise à supprimer.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE "Tenant" SET settings = settings - 'features' WHERE settings ? 'features'`
    );
  },

  async down() {
    // Rien à restaurer : la donnée est intégralement dérivable du forfait du
    // tenant, et la recopier réintroduirait le décalage qu'on vient d'éliminer.
  },
};
