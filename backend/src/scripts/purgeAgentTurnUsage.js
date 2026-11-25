const { sequelize } = require('../models');
const { purgeExpired } = require('../services/agentUsageService');

purgeExpired().then(async count => {
  console.log(`Purge agentique terminée : ${count} entrée(s) supprimée(s).`);
  await sequelize.close();
}).catch(async error => {
  console.error('Purge agentique échouée:', error.message);
  await sequelize.close();
  process.exitCode = 1;
});
