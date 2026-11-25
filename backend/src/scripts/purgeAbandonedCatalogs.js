const { sequelize } = require('../models');
const catalogPurgeService = require('../services/catalogPurgeService');

async function run() {
  try {
    const [lock] = await sequelize.query(
      "SELECT pg_try_advisory_lock(hashtext('voxo:purge-catalog-drafts')) AS acquired"
    );
    if (!lock[0]?.acquired) return;
    const purged = await catalogPurgeService.purgeAbandoned();
    console.log(`Brouillons de catalogue purgés : ${purged}`);
    await sequelize.query("SELECT pg_advisory_unlock(hashtext('voxo:purge-catalog-drafts'))");
  } finally {
    await sequelize.close();
  }
}

run().catch(error => {
  console.error('Purge des catalogues échouée', error.message);
  process.exitCode = 1;
});
