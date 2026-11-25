function formatPrice(amount, currency, locale, unavailable) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return unavailable;
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(amount / 100);
}

function fallbackFeatures(plan) {
  return Array.isArray(plan?.features) ? plan.features : [];
}

function localizedFeatures(plan, fallback, copy) {
  if (!plan.features || typeof plan.features !== 'object' || Array.isArray(plan.features)) {
    return fallbackFeatures(fallback);
  }
  const enabled = Object.entries(plan.features)
    .filter(([, value]) => value === true)
    .map(([name]) => copy.features[name] || name);
  return [
    plan.messagesPerMonth == null ? copy.unlimitedMessages : copy.messagesPerMonth(plan.messagesPerMonth),
    plan.activeDocuments == null ? copy.unlimitedDocuments : copy.documents(plan.activeDocuments),
    ...enabled,
  ];
}

function staticPlan(plan) {
  return { ...plan, features: fallbackFeatures(plan) };
}

export function buildLandingPlans({ remotePlans, staticPlans, copy, currency, locale }) {
  const safeRemotePlans = Array.isArray(remotePlans) ? remotePlans : [];
  const safeStaticPlans = Array.isArray(staticPlans) ? staticPlans : [];
  if (safeRemotePlans.length === 0) return safeStaticPlans.map(staticPlan);

  return safeRemotePlans
    .filter(plan => (plan?.name || plan?.id) !== 'enterprise')
    .map((remote, index) => {
      const planId = remote?.name || remote?.id || `plan-${index}`;
      const fallback = safeStaticPlans.find(plan => plan.id === planId) || {};
      return {
        ...fallback,
        id: planId,
        name: fallback.name || remote?.label || planId,
        price: formatPrice(remote?.prices?.[currency], currency, locale, copy.unavailable),
        period: remote?.billingInterval === 'yearly' ? copy.perYear : fallback.period || copy.perMonth,
        tagline: fallback.tagline || copy.fallbackTagline,
        ctaLabel: fallback.ctaLabel || copy.fallbackCta,
        featured: Boolean(fallback.featured || index === 1),
        features: localizedFeatures(remote || {}, fallback, copy),
      };
    });
}
