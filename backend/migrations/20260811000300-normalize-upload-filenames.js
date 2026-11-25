const { normalizeFilenameEncoding } = require('../src/utils/filenameEncoding');

const TABLES = ['knowledge_assets', 'message_attachments'];

async function repairTable(queryInterface, tableName, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT id, original_name FROM ${tableName} WHERE original_name IS NOT NULL`,
    { transaction }
  );
  for (const row of rows) {
    const originalName = normalizeFilenameEncoding(row.original_name);
    if (originalName === row.original_name) continue;
    await queryInterface.bulkUpdate(
      tableName, { original_name: originalName }, { id: row.id }, { transaction }
    );
  }
}

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      for (const tableName of TABLES) {
        await repairTable(queryInterface, tableName, transaction);
      }
    });
  },

  async down() {
    // Nettoyage de données volontairement irréversible : réintroduire le
    // mojibake risquerait d'endommager des noms qui étaient déjà valides.
  },
};
