'use strict';

// Notifications push mobiles : jetons d'appareils (liés à une session de conversation) et
// identifiants d'envoi du propriétaire (compte de service FCM, clé APNs), ces derniers
// chiffrés au repos dans `mobile_push_secrets`.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('mobile_push_devices', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'Tenant', key: 'id' }, onDelete: 'CASCADE' },
        session_id: { type: Sequelize.STRING(100), allowNull: false },
        platform: { type: Sequelize.STRING(8), allowNull: false },
        token: { type: Sequelize.TEXT, allowNull: false },
        // Empreinte du jeton : un TEXT de 4 Ko ne s'indexe pas, et l'unicité se joue dessus.
        token_hash: { type: Sequelize.STRING(64), allowNull: false },
        locale: { type: Sequelize.STRING(2), allowNull: false, defaultValue: 'fr' },
        app_id: { type: Sequelize.STRING(255), allowNull: true },
        last_seen_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      }, { transaction });
      await queryInterface.addIndex('mobile_push_devices', ['tenant_id', 'token_hash'], {
        unique: true, name: 'mobile_push_devices_tenant_token_unique', transaction,
      });
      await queryInterface.addIndex('mobile_push_devices', ['tenant_id', 'session_id'], {
        name: 'mobile_push_devices_tenant_session', transaction,
      });
      await queryInterface.addColumn('Tenant', 'mobile_push', {
        type: Sequelize.JSONB, allowNull: false, defaultValue: {},
      }, { transaction });
      await queryInterface.addColumn('Tenant', 'mobile_push_secrets', {
        type: Sequelize.TEXT, allowNull: true,
      }, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('Tenant', 'mobile_push_secrets', { transaction });
      await queryInterface.removeColumn('Tenant', 'mobile_push', { transaction });
      await queryInterface.dropTable('mobile_push_devices', { transaction });
    });
  },
};
