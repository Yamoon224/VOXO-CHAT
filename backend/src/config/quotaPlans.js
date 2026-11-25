/**
 * Registre des forfaits et valeurs de repli.
 *
 * Les limites réellement appliquées vivent désormais en base (table `plans`,
 * lue via `services/planService.js`) et sont éditables depuis l'administration.
 * Ce fichier ne garde que :
 *  - la liste des noms, qui reste alignée sur l'ENUM `Tenant.subscription_plan` ;
 *  - un jeu de limites de repli, utilisé uniquement si la ligne correspondante
 *    manque en base — auquel cas `planService` journalise un avertissement
 *    plutôt que de dégrader un client payant en silence.
 *
 * Module pur : ni Sequelize, ni HTTP.
 */

const FALLBACK_LIMITS = {
  free: {
    messagesPerMonth: 100, messagesPerDay: null, maxUsers: null, activeDocuments: 3,
  },
  basic: {
    messagesPerMonth: 500, messagesPerDay: null, maxUsers: null, activeDocuments: 10,
  },
  pro: {
    messagesPerMonth: null, messagesPerDay: null, maxUsers: null, activeDocuments: null,
  },
  enterprise: {
    messagesPerMonth: null, messagesPerDay: null, maxUsers: null, activeDocuments: null,
  },
};

const FALLBACK_FEATURES = {
  free: { leadGeneration: false, analytics: true, customBranding: false, customAiInstructions: false },
  basic: { leadGeneration: true, analytics: true, customBranding: false, customAiInstructions: false },
  pro: { leadGeneration: true, analytics: true, customBranding: false, customAiInstructions: true },
  enterprise: { leadGeneration: true, analytics: true, customBranding: true, customAiInstructions: true },
};

const PLAN_NAMES = Object.keys(FALLBACK_LIMITS);

const DEFAULT_PLAN = 'free';

/** Limites de repli d'un forfait ; retombe sur le forfait par défaut si inconnu. */
function getFallbackPlan(planName) {
  return FALLBACK_LIMITS[planName] || FALLBACK_LIMITS[DEFAULT_PLAN];
}

function getFallbackFeatures(planName) {
  return FALLBACK_FEATURES[planName] || FALLBACK_FEATURES[DEFAULT_PLAN];
}

function isUnlimited(limit) {
  return limit === null || limit === undefined;
}

module.exports = {
  DEFAULT_PLAN,
  PLAN_NAMES,
  // Conservé sous son ancien nom : `adminValidators` et
  // `adminTenantStatusService` en dérivent la liste des forfaits valides.
  quotaPlans: FALLBACK_LIMITS,
  getFallbackPlan,
  getFallbackFeatures,
  isUnlimited,
};
