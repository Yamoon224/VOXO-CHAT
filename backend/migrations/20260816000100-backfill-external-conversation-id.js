'use strict';

// Les conversations de canal créées avant l'unification des métadonnées entrantes portent le
// destinataire sous `metadata.chatId`. Les réponses des conseillers, qui lisent
// `metadata.externalConversationId`, n'étaient donc jamais livrées sur ces conversations.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE "Conversation"
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{externalConversationId}',
        to_jsonb(COALESCE(metadata->>'chatId', external_user_id))
      )
      WHERE channel <> 'web'
        AND (metadata->>'externalConversationId') IS NULL
        AND COALESCE(metadata->>'chatId', external_user_id) IS NOT NULL
    `);
  },

  // Champ dérivé et idempotent : le retirer casserait à nouveau la livraison sortante
  // pour les conversations concernées, sans rien restaurer d'utile.
  async down() {},
};
