'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Conversation', 'title', {
      type: Sequelize.STRING(120), allowNull: true,
    });
    await queryInterface.addColumn('Conversation', 'ended_at', {
      type: Sequelize.DATE, allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('Conversation', 'ended_at');
    await queryInterface.removeColumn('Conversation', 'title');
  },
};
