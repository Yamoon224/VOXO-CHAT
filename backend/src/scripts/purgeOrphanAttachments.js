// src/scripts/purgeOrphanAttachments.js
// Supprime les pièces jointes uploadées depuis le widget mais jamais envoyées
// (message abandonné, onglet fermé). Destiné à un cron externe horaire :
// le backend n'embarque aucun scheduler.
//   node src/scripts/purgeOrphanAttachments.js
const path = require('path');

// Chemin explicite : config.js appelle dotenv.config() sans `path`, donc le .env
// serait résolu depuis le répertoire courant. On veut un script exécutable de partout.
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('../models');
const widgetAttachmentService = require('../services/widgetAttachmentService');

async function main() {
  await sequelize.authenticate();
  const [rows] = await sequelize.query(
    "SELECT pg_try_advisory_lock(hashtext('voxo:purge-widget-attachments')) AS acquired"
  );
  if (!rows[0]?.acquired) {
    console.log('ℹ️ Une purge des pièces jointes est déjà en cours.');
    return 0;
  }

  let removed;
  try {
    removed = await widgetAttachmentService.purgeOrphans();
  } finally {
    await sequelize.query(
      "SELECT pg_advisory_unlock(hashtext('voxo:purge-widget-attachments'))"
    );
  }

  console.log('🧹 Purge des pièces jointes orphelines');
  console.log(`   ancienneté minimale . ${widgetAttachmentService.ORPHAN_TTL_MS / 60000} minutes`);
  console.log(`   pièces supprimées ... ${removed}`);
  return removed;
}

main()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`\n❌ La purge a échoué : ${error.message}`);
    await sequelize.close().catch(() => {});
    process.exit(1);
  });
