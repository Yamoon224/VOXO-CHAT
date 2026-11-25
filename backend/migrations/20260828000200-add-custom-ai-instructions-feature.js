'use strict';

/**
 * Les caractéristiques de forfait sont stockées dans le JSONB existant. La
 * fonctionnalité reste désactivée partout par défaut, puis ouverte aux deux
 * offres avancées sans modifier les autres caractéristiques administrées.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE plans
      SET features = COALESCE(features, '{}'::jsonb) || '{"customAiInstructions": false}'::jsonb
    `);
    await queryInterface.sequelize.query(`
      UPDATE plans
      SET features = features || '{"customAiInstructions": true}'::jsonb
      WHERE name IN ('pro', 'enterprise')
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE plans
      SET features = COALESCE(features, '{}'::jsonb) - 'customAiInstructions'
    `);
  },
};
