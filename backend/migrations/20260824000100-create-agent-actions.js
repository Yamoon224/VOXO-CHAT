'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('agent_actions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenant', key: 'id' },
        onDelete: 'CASCADE',
      },
      // snake_case, exposé au LLM comme nom de fonction (`function.name`).
      name: { type: Sequelize.STRING(64), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      method: { type: Sequelize.STRING(10), allowNull: false },
      endpoint_url: { type: Sequelize.STRING(2048), allowNull: false },
      // JSON Schema des paramètres, réutilisé tel quel comme `function.parameters` OpenAI.
      parameters_schema: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      // Headers statiques avec placeholder `{{secret}}` pour le secret déchiffré à l'exécution.
      headers_template: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      // Chiffré au repos (AES-256-GCM, voir utils/cryptoUtils.js) — jamais en clair en base.
      auth_secret_encrypted: { type: Sequelize.TEXT, allowNull: true },
      timeout_ms: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5000 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('agent_actions', ['tenant_id'], {
      name: 'agent_actions_tenant_id_idx',
    });
    // Le nom sert de clé de fonction LLM par tenant : deux actions ne peuvent
    // pas partager le même nom, sinon l'appel de tool serait ambigu.
    await queryInterface.addConstraint('agent_actions', {
      fields: ['tenant_id', 'name'],
      type: 'unique',
      name: 'agent_action_tenant_name_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('agent_actions');
  },
};
