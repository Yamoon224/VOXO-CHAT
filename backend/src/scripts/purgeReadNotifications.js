const { closeRedisConnection } = require('../config/redis');
const { sequelize } = require('../config/database');
const { purgeReadBefore } = require('../services/notificationService');

(async () => {
  const removed = await purgeReadBefore(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
  console.log(`Notifications purgÃ©es : ${removed}`);
  await closeRedisConnection();
  await sequelize.close();
})().catch(async error => { console.error('Purge des notifications Ã©chouÃ©e', error.message); process.exitCode = 1; });
