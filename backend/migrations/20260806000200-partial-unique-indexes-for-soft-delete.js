'use strict';

// Une ligne soft-deletée ne doit plus réserver ses valeurs uniques : sans index
// partiels, un compte supprimé bloquerait à vie la réutilisation de son email.
// SQL brut car Sequelize n'exprime pas proprement `WHERE a IS NOT NULL AND b IS NULL`,
// et défensif car `User`/`Tenant` viennent d'un ancien sync({ alter: true }) :
// selon l'historique, l'unicité est portée par un index OU par une contrainte.
const UP_STATEMENTS = [
  'DROP INDEX IF EXISTS user_email_unique_idx',
  'DROP INDEX IF EXISTS user_tenant_email_unique',
  'ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key"',
  'CREATE UNIQUE INDEX user_email_unique_idx ON "User" (email) WHERE deleted_at IS NULL',
  'CREATE UNIQUE INDEX user_tenant_email_unique ON "User" (tenant_id, email) WHERE deleted_at IS NULL',
  'ALTER TABLE "Tenant" DROP CONSTRAINT IF EXISTS "Tenant_domain_key"',
  'ALTER TABLE "Tenant" DROP CONSTRAINT IF EXISTS "Tenant_subdomain_key"',
  'DROP INDEX IF EXISTS tenant_domain_idx',
  'DROP INDEX IF EXISTS tenant_subdomain_idx',
  'CREATE UNIQUE INDEX tenant_domain_idx ON "Tenant" (domain) WHERE domain IS NOT NULL AND deleted_at IS NULL',
  'CREATE UNIQUE INDEX tenant_subdomain_idx ON "Tenant" (subdomain) WHERE subdomain IS NOT NULL AND deleted_at IS NULL',
];

const DOWN_STATEMENTS = [
  'DROP INDEX IF EXISTS user_email_unique_idx',
  'DROP INDEX IF EXISTS user_tenant_email_unique',
  'CREATE UNIQUE INDEX user_email_unique_idx ON "User" (email)',
  'CREATE UNIQUE INDEX user_tenant_email_unique ON "User" (tenant_id, email)',
  'DROP INDEX IF EXISTS tenant_domain_idx',
  'DROP INDEX IF EXISTS tenant_subdomain_idx',
  'CREATE UNIQUE INDEX tenant_domain_idx ON "Tenant" (domain) WHERE domain IS NOT NULL',
  'CREATE UNIQUE INDEX tenant_subdomain_idx ON "Tenant" (subdomain) WHERE subdomain IS NOT NULL',
];

async function runAll(queryInterface, statements) {
  for (const statement of statements) {
    await queryInterface.sequelize.query(statement);
  }
}

module.exports = {
  async up(queryInterface) {
    await runAll(queryInterface, UP_STATEMENTS);
  },

  async down(queryInterface) {
    await runAll(queryInterface, DOWN_STATEMENTS);
  },
};

module.exports.UP_STATEMENTS = UP_STATEMENTS;
module.exports.DOWN_STATEMENTS = DOWN_STATEMENTS;
