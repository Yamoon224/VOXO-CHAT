const { sequelize } = require('../models');
const service = require('../services/commercialRequestService');

async function run() {
  try {
    const [lock] = await sequelize.query(
      "SELECT pg_try_advisory_lock(hashtext('voxo:retry-commercial-emails')) AS acquired"
    );
    if (!lock[0]?.acquired) return;
    const retried = await service.retryNotifications();
    console.log(`Notifications commerciales retentées : ${retried}`);
    await sequelize.query("SELECT pg_advisory_unlock(hashtext('voxo:retry-commercial-emails'))");
  } finally {
    await sequelize.close();
  }
}

run().catch(error => {
  console.error('Nouvelle tentative des notifications échouée', error.message);
  process.exitCode = 1;
});
