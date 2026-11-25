'use strict';

// Valeurs de départ : reprises telles quelles de `config/quotaPlans.js`
// (limites), `services/tenantFeatureFlags.js` (caractéristiques) et du
// formulaire d'inscription (prix, jusqu'ici uniquement côté client).
// `messagesPerDay` et `maxUsers` sont nouveaux : laissés illimités pour ne
// restreindre aucun client existant tant qu'un administrateur ne le décide pas.
const SEED = [
  {
    name: 'free', label: 'Gratuit', price: 0, sort: 1,
    messagesPerMonth: 100, messagesPerDay: null, maxUsers: null, activeDocuments: 3,
    features: { leadGeneration: false, analytics: true, customBranding: false },
  },
  {
    name: 'basic', label: 'Basique', price: 2900, sort: 2,
    messagesPerMonth: 500, messagesPerDay: null, maxUsers: null, activeDocuments: 10,
    features: { leadGeneration: true, analytics: true, customBranding: false },
  },
  {
    name: 'pro', label: 'Pro', price: 9900, sort: 3,
    messagesPerMonth: null, messagesPerDay: null, maxUsers: null, activeDocuments: null,
    features: { leadGeneration: true, analytics: true, customBranding: false },
  },
  {
    name: 'enterprise', label: 'Entreprise', price: 29900, sort: 4,
    messagesPerMonth: null, messagesPerDay: null, maxUsers: null, activeDocuments: null,
    features: { leadGeneration: true, analytics: true, customBranding: true },
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('plans', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      // Correspond à une valeur de l'ENUM `Tenant.subscription_plan`. Pas de
      // clé étrangère : l'ENUM reste la référence, cette table ne porte que
      // les paramètres éditables du forfait.
      name: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      label: { type: Sequelize.STRING(40), allowNull: false },
      // En centimes : jamais un flottant pour de la monnaie.
      price_amount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      price_currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'EUR' },
      // NULL = illimité, comme dans quotaPlans.js.
      messages_per_month: { type: Sequelize.INTEGER, allowNull: true },
      messages_per_day: { type: Sequelize.INTEGER, allowNull: true },
      max_users: { type: Sequelize.INTEGER, allowNull: true },
      active_documents: { type: Sequelize.INTEGER, allowNull: true },
      features: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // `ON CONFLICT DO NOTHING` : un rejeu de la migration ne doit jamais
    // écraser un prix ou une limite ajustés depuis l'administration.
    for (const plan of SEED) {
      await queryInterface.sequelize.query(
        `INSERT INTO plans (
           id, name, label, price_amount, price_currency,
           messages_per_month, messages_per_day, max_users, active_documents,
           features, sort_order, created_at, updated_at
         ) VALUES (
           gen_random_uuid(), :name, :label, :price, 'EUR',
           :messagesPerMonth, :messagesPerDay, :maxUsers, :activeDocuments,
           CAST(:features AS jsonb), :sort, NOW(), NOW()
         )
         ON CONFLICT (name) DO NOTHING`,
        { replacements: { ...plan, features: JSON.stringify(plan.features) } }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('plans');
  },
};
