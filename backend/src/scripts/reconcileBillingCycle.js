const config = require('../config/config');

// Préparé pour le futur cron externe. Ne traite aucune entreprise tant que le
// parcours Paystack et les notifications ne sont pas activés explicitement.
if (!config.paystack.enabled) {
  console.log('Cycle de facturation Paystack désactivé : aucune action exécutée.');
  process.exit(0);
}

console.error('Le cron de facturation n’est pas encore activé dans cette version.');
process.exitCode = 1;
