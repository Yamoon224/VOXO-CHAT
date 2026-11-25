// src/scripts/purgeDeletedAccounts.js
// Purge définitive des comptes et entreprises soft-deletés depuis plus de 30 jours.
// Destiné à un cron externe (quotidien) : le backend n'embarque aucun scheduler.
//   node src/scripts/purgeDeletedAccounts.js
const path = require('path');

// Chemin explicite : config.js appelle dotenv.config() sans `path`, donc le .env
// serait résolu depuis le répertoire courant. On veut un script exécutable de partout.
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('../models');
const accountPurgeService = require('../services/accountPurgeService');

async function main() {
  await sequelize.authenticate();
  const report = await accountPurgeService.purgeExpired();

  console.log('🧹 Purge des comptes supprimés');
  console.log(`   rétention ........... ${report.retentionDays} jours`);
  console.log(`   seuil ............... ${report.cutoff.toISOString()}`);
  console.log(`   entreprises purgées . ${report.tenantsPurged}`);
  console.log(`   comptes purgés ...... ${report.usersPurged}`);

  if (report.errors.length) {
    console.error(`\n❌ ${report.errors.length} échec(s) :`);
    report.errors.forEach(({ type, id, message }) => {
      console.error(`   - ${type} ${id} : ${message}`);
    });
  }
  return report.errors.length === 0;
}

main()
  .then(async (success) => {
    await sequelize.close();
    process.exit(success ? 0 : 1);
  })
  .catch(async (error) => {
    console.error(`\n❌ La purge a échoué : ${error.message}`);
    await sequelize.close().catch(() => {});
    process.exit(1);
  });
