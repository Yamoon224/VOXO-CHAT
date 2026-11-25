'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('message_attachments', {
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
      // Nul le temps de l'upload, avant que le message ne soit créé.
      conversation_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Conversation', key: 'id' },
        onDelete: 'CASCADE',
      },
      // Identifiant du message dans le JSONB Conversation.messages.
      // Nul tant que la pièce n'est pas rattachée : sert d'anti-rejeu.
      message_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      storage_key: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      original_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      mime_type: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      size_bytes: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      extraction_status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
      },
      extraction_method: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      extracted_text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('message_attachments', ['tenant_id'], {
      name: 'message_attachments_tenant_id_idx',
    });
    await queryInterface.addIndex('message_attachments', ['conversation_id'], {
      name: 'message_attachments_conversation_id_idx',
    });
    await queryInterface.addIndex('message_attachments', ['message_id'], {
      name: 'message_attachments_message_id_idx',
    });
    // Sert au balayage des pièces orphelines (uploadées puis jamais envoyées).
    await queryInterface.addIndex('message_attachments', ['created_at'], {
      name: 'message_attachments_orphan_idx',
      where: { message_id: null },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('message_attachments');
  },
};
