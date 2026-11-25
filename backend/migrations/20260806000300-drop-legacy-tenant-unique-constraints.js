'use strict';

// Dette de l'ancien `sync({ alter: true })` : à chaque démarrage, Sequelize
// recréait une contrainte UNIQUE sur `Tenant.domain` et `Tenant.subdomain` sous
// un nouveau nom suffixé (Tenant_domain_key1, _key2, … ~180 de chaque).
//
// Ces contraintes sont globales — sans clause `deleted_at IS NULL` — donc elles
// annulent l'effet des index partiels de 20260806000200 : un tenant supprimé
// continuerait de réserver son sous-domaine à vie. Elles pèsent aussi sur
// chaque INSERT/UPDATE de la table.
//
// La migration 20260806000200 ne visait que les noms non suffixés ; celle-ci
// balaye toute la famille par requête sur le catalogue.
const LEGACY_PATTERNS = ['Tenant_domain_key%', 'Tenant_subdomain_key%'];

async function findLegacyConstraints(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT conname FROM pg_constraint
     WHERE conrelid = '"Tenant"'::regclass
       AND contype = 'u'
       AND (conname LIKE :domainPattern OR conname LIKE :subdomainPattern)`,
    { replacements: { domainPattern: LEGACY_PATTERNS[0], subdomainPattern: LEGACY_PATTERNS[1] } }
  );
  return rows.map(row => row.conname);
}

module.exports = {
  async up(queryInterface) {
    const names = await findLegacyConstraints(queryInterface);
    for (const name of names) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "Tenant" DROP CONSTRAINT IF EXISTS "${name}"`
      );
    }
    console.log(`  ${names.length} contrainte(s) unique(s) héritée(s) supprimée(s) sur Tenant`);
  },

  // Irréversible par choix : recréer des centaines de doublons n'a aucun sens.
  // L'unicité reste garantie par les index partiels de 20260806000200, dont le
  // `down` restaure les index globaux d'origine.
  async down() {
    // no-op
  },
};

module.exports.LEGACY_PATTERNS = LEGACY_PATTERNS;
