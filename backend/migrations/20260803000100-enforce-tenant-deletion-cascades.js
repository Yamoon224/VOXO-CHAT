'use strict';

const CASCADE_FOREIGN_KEYS = [
  { table: 'User', column: 'tenant_id', targetTable: 'Tenant', targetColumn: 'id', name: 'user_tenant_id_delete_cascade_fk' },
  { table: 'KnowledgeBase', column: 'tenant_id', targetTable: 'Tenant', targetColumn: 'id', name: 'knowledge_base_tenant_id_delete_cascade_fk' },
  { table: 'Conversation', column: 'tenant_id', targetTable: 'Tenant', targetColumn: 'id', name: 'conversation_tenant_id_delete_cascade_fk' },
  { table: 'knowledge_chunks', column: 'tenant_id', targetTable: 'Tenant', targetColumn: 'id', name: 'knowledge_chunks_tenant_id_delete_cascade_fk' },
  { table: 'tenant_usage', column: 'tenant_id', targetTable: 'Tenant', targetColumn: 'id', name: 'tenant_usage_tenant_id_delete_cascade_fk' },
  { table: 'crawl_jobs', column: 'tenant_id', targetTable: 'Tenant', targetColumn: 'id', name: 'crawl_jobs_tenant_id_delete_cascade_fk' },
  { table: 'knowledge_chunks', column: 'knowledge_base_id', targetTable: 'KnowledgeBase', targetColumn: 'id', name: 'knowledge_chunks_knowledge_base_id_delete_cascade_fk' },
];

async function replaceForeignKey(queryInterface, definition, onDelete) {
  const references = await queryInterface.getForeignKeyReferencesForTable(definition.table);
  const matchingConstraints = [...new Set(
    references
      .filter((reference) => reference.columnName === definition.column)
      .map((reference) => reference.constraintName)
      .filter(Boolean)
  )];

  for (const constraintName of matchingConstraints) {
    await queryInterface.removeConstraint(definition.table, constraintName);
  }

  await queryInterface.addConstraint(definition.table, {
    fields: [definition.column],
    type: 'foreign key',
    name: definition.name,
    references: {
      table: definition.targetTable,
      field: definition.targetColumn,
    },
    onDelete,
    onUpdate: 'CASCADE',
  });
}

module.exports = {
  async up(queryInterface) {
    for (const definition of CASCADE_FOREIGN_KEYS) {
      await replaceForeignKey(queryInterface, definition, 'CASCADE');
    }
  },

  async down(queryInterface) {
    for (const definition of [...CASCADE_FOREIGN_KEYS].reverse()) {
      await replaceForeignKey(queryInterface, definition, 'NO ACTION');
    }
  },
};

module.exports.CASCADE_FOREIGN_KEYS = CASCADE_FOREIGN_KEYS;
