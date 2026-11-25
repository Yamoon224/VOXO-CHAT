'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('support_tickets', 'reason', { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'other' });
    await queryInterface.addColumn('support_tickets', 'other_reason', { type: Sequelize.STRING(120), allowNull: true });
    await queryInterface.sequelize.query("UPDATE support_tickets SET other_reason = 'Demande existante' WHERE reason = 'other' AND other_reason IS NULL");
    await queryInterface.addIndex('support_tickets', ['reason'], { name: 'support_tickets_reason_idx' });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('support_tickets', 'support_tickets_reason_idx');
    await queryInterface.removeColumn('support_tickets', 'other_reason');
    await queryInterface.removeColumn('support_tickets', 'reason');
  },
};
