'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('IntegrationConnector', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
      provider: { type: Sequelize.ENUM('wordpress', 'microsoft365'), allowNull: false },
      status: { type: Sequelize.ENUM('connected', 'syncing', 'error', 'disconnected'), allowNull: false, defaultValue: 'disconnected' },
      config: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} }, credentials: { type: Sequelize.TEXT },
      sync_frequency: { type: Sequelize.ENUM('manual', 'daily', 'weekly'), allowNull: false, defaultValue: 'daily' },
      last_synced_at: { type: Sequelize.DATE }, last_error: { type: Sequelize.STRING(500) },
      created_at: { type: Sequelize.DATE, allowNull: false }, updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('IntegrationConnector', ['tenant_id', 'provider'], { unique: true, name: 'integration_connector_tenant_provider_idx' });
    await queryInterface.createTable('IntegrationSyncJob', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false }, tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
      connector_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'IntegrationConnector', key: 'id' }, onDelete: 'CASCADE' },
      status: { type: Sequelize.ENUM('running', 'completed', 'failed'), allowNull: false, defaultValue: 'running' }, summary: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} }, error: { type: Sequelize.STRING(500) },
      started_at: { type: Sequelize.DATE, allowNull: false }, completed_at: { type: Sequelize.DATE }, created_at: { type: Sequelize.DATE, allowNull: false }, updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('IntegrationSyncJob', ['tenant_id', 'connector_id', 'created_at'], { name: 'integration_sync_job_connector_idx' });
    await queryInterface.addColumn('KnowledgeBase', 'external_id', { type: Sequelize.STRING(255), allowNull: true });
    await queryInterface.addColumn('KnowledgeBase', 'source_provider', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn('KnowledgeBase', 'source_updated_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addIndex('KnowledgeBase', ['tenant_id', 'source_provider', 'external_id'], { unique: true, name: 'knowledge_external_source_idx', where: { external_id: { [Sequelize.Op.ne]: null } } });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('KnowledgeBase', 'knowledge_external_source_idx');
    await queryInterface.removeColumn('KnowledgeBase', 'source_updated_at'); await queryInterface.removeColumn('KnowledgeBase', 'source_provider'); await queryInterface.removeColumn('KnowledgeBase', 'external_id');
    await queryInterface.dropTable('IntegrationSyncJob'); await queryInterface.dropTable('IntegrationConnector');
  },
};
