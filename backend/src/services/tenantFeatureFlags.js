const planService = require('./planService');
const { DEFAULT_PLAN } = require('../config/quotaPlans');

/**
 * Caractéristiques ouvertes par un forfait.
 *
 * Elles sont désormais DÉRIVÉES à la lecture depuis la table `plans`, jamais
 * recopiées dans `Tenant.settings`. C'était la source d'un décalage silencieux :
 * un tenant gardait indéfiniment les caractéristiques figées à son inscription,
 * même après un changement de forfait ou une édition du forfait lui-même.
 */

/** Applique l'échéance comme le fait quotaService : un forfait expiré retombe. */
function resolvePlanName(tenant) {
  const plan = tenant?.subscriptionPlan || DEFAULT_PLAN;
  const expiresAt = tenant?.subscriptionExpiresAt;
  if (expiresAt && new Date(expiresAt) <= new Date()) return DEFAULT_PLAN;
  return plan;
}

async function computeFeatures(planName) {
  return planService.getFeatures(planName || DEFAULT_PLAN);
}

/** Caractéristiques effectives d'un tenant, échéance comprise. */
async function computeTenantFeatures(tenant) {
  return computeFeatures(resolvePlanName(tenant));
}

module.exports = { computeFeatures, computeTenantFeatures, resolvePlanName };
