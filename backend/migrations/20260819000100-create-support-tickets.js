'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('support_tickets', {
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
      // L'auteur peut avoir été supprimé sans que le ticket perde son sens.
      opened_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'User', key: 'id' },
        onDelete: 'SET NULL',
      },
      subject: { type: Sequelize.STRING(120), allowNull: false },
      status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'open' },
      priority: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'normal' },
      assigned_admin_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'admin_users', key: 'id' },
        onDelete: 'SET NULL',
      },
      last_message_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // Tri par défaut de la boîte de réception : les demandes ouvertes, la plus
    // récemment active en tête.
    await queryInterface.addIndex('support_tickets', ['status', 'last_message_at'], {
      name: 'support_tickets_inbox_idx',
    });
    await queryInterface.addIndex('support_tickets', ['tenant_id'], {
      name: 'support_tickets_tenant_idx',
    });
    await queryInterface.addIndex('support_tickets', ['assigned_admin_id'], {
      name: 'support_tickets_assignee_idx',
    });

    await queryInterface.createTable('support_messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      ticket_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'support_tickets', key: 'id' },
        onDelete: 'CASCADE',
      },
      // `tenant` ou `admin` : deux espaces d'identifiants distincts, d'où
      // l'absence de clé étrangère sur `author_id`.
      author_type: { type: Sequelize.STRING(16), allowNull: false },
      author_id: { type: Sequelize.UUID, allowNull: true },
      author_name: { type: Sequelize.STRING(120), allowNull: false },
      // `internal_note` ne doit JAMAIS sortir vers le client : le filtrage se
      // fait dans la requête côté service, pas à l'affichage.
      role: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'message' },
      content: { type: Sequelize.TEXT, allowNull: false },
      client_message_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('support_messages', ['ticket_id', 'created_at'], {
      name: 'support_messages_thread_idx',
    });
    // Vraie contrainte d'unicité, et non un simple index : c'est elle qui rend
    // l'idempotence fiable face à deux envois concurrents. `conversation_alerts`
    // s'était contenté d'un index non-unique, ce qui ne garantit rien.
    await queryInterface.addIndex('support_messages', ['ticket_id', 'client_message_id'], {
      unique: true,
      name: 'support_messages_idempotency_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('support_messages');
    await queryInterface.dropTable('support_tickets');
  },
};
