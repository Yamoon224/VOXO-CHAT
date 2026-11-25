'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Conversation', 'priority', {
      type: Sequelize.STRING(16), allowNull: false, defaultValue: 'normal',
    });
    await queryInterface.addColumn('Conversation', 'priority_source', {
      type: Sequelize.STRING(16), allowNull: false, defaultValue: 'default',
    });
    await queryInterface.addColumn('Conversation', 'priority_reason', { type: Sequelize.STRING(500), allowNull: true });
    await queryInterface.addColumn('Conversation', 'priority_updated_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.createTable('conversation_labels', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
      name: { type: Sequelize.STRING(40), allowNull: false },
      color: { type: Sequelize.STRING(16), allowNull: false },
      created_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'User', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.createTable('conversation_label_assignments', {
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
      conversation_id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, references: { model: 'Conversation', key: 'id' }, onDelete: 'CASCADE' },
      label_id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, references: { model: 'conversation_labels', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.sequelize.query("ALTER TABLE \"Conversation\" ADD CONSTRAINT conversation_priority_value_check CHECK (priority IN ('normal','important','urgent','critical'))");
    await queryInterface.sequelize.query("ALTER TABLE \"Conversation\" ADD CONSTRAINT conversation_priority_source_check CHECK (priority_source IN ('default','ai','manual'))");
    await queryInterface.sequelize.query("ALTER TABLE conversation_labels ADD CONSTRAINT conversation_label_color_check CHECK (color IN ('slate','blue','green','yellow','orange','red','purple','pink'))");
    await queryInterface.addIndex('Conversation', ['tenant_id', 'priority', 'updated_at'], { name: 'conversation_priority_inbox_idx' });
    await queryInterface.addIndex('conversation_labels', ['tenant_id'], { name: 'conversation_labels_tenant_idx' });
    await queryInterface.sequelize.query('CREATE UNIQUE INDEX conversation_labels_tenant_name_unique ON conversation_labels (tenant_id, LOWER(name))');
    await queryInterface.addIndex('conversation_label_assignments', ['tenant_id', 'label_id', 'conversation_id'], { name: 'conversation_label_filter_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('conversation_label_assignments');
    await queryInterface.dropTable('conversation_labels');
    await queryInterface.removeIndex('Conversation', 'conversation_priority_inbox_idx');
    await queryInterface.removeConstraint('Conversation', 'conversation_priority_source_check');
    await queryInterface.removeConstraint('Conversation', 'conversation_priority_value_check');
    for (const column of ['priority_updated_at', 'priority_reason', 'priority_source', 'priority']) {
      await queryInterface.removeColumn('Conversation', column);
    }
  },
};
