'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeIndex(
      'message_attachments',
      'message_attachments_orphan_idx'
    );
    await queryInterface.addIndex('message_attachments', ['created_at'], {
      name: 'message_attachments_orphan_idx',
      where: { conversation_id: null },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'message_attachments',
      'message_attachments_orphan_idx'
    );
    await queryInterface.addIndex('message_attachments', ['created_at'], {
      name: 'message_attachments_orphan_idx',
      where: { message_id: null },
    });
  },
};
