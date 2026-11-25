'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('plans', 'prices', { type: Sequelize.JSONB, allowNull: false, defaultValue: { EUR: null, USD: null, XOF: null } });
    await queryInterface.sequelize.query(`UPDATE plans SET prices = jsonb_build_object(
      'EUR', CASE WHEN price_currency = 'EUR' THEN price_amount ELSE NULL END,
      'USD', CASE WHEN price_currency = 'USD' THEN price_amount ELSE NULL END,
      'XOF', CASE WHEN price_currency = 'XOF' THEN price_amount ELSE NULL END
    )`);
  },
  async down(queryInterface) { await queryInterface.removeColumn('plans', 'prices'); },
};
