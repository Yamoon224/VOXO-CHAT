import assert from 'node:assert/strict';
import test from 'node:test';
import * as fr from './landing-pricing.mjs';
import * as en from './landing-pricing-en.mjs';
import { buildLandingPlans } from './landing-plan-view.mjs';
import { getPublicPlans } from './public-plans.mjs';

const remotePlan = (name, features) => ({
  name,
  label: name,
  prices: { EUR: 2900, USD: 3200, XOF: 2000000 },
  messagesPerMonth: 500,
  activeDocuments: 10,
  features,
  billingInterval: 'monthly',
});

function build(remotePlans, catalog = fr, locale = 'fr') {
  return buildLandingPlans({
    remotePlans,
    staticPlans: catalog.PRICING_PLANS,
    copy: catalog.PRICING_COPY,
    currency: 'EUR',
    locale,
  });
}

test('normalise les fonctionnalités distantes et retire enterprise de la grille', () => {
  const plans = build([
    remotePlan('free', { analytics: true }),
    remotePlan('basic', { analytics: true, leadGeneration: true }),
    remotePlan('pro', { customAiInstructions: true }),
    remotePlan('enterprise', { customBranding: true }),
  ]);

  assert.deepEqual(plans.map(plan => plan.id), ['free', 'basic', 'pro']);
  assert.ok(plans.every(plan => Array.isArray(plan.features)));
  assert.ok(plans[1].features.includes('Capture de prospects'));
  assert.match(plans[1].price, /29/);
});

test('utilise les fonctionnalités statiques pour les formes distantes invalides', () => {
  for (const value of [undefined, null, [], 'analytics']) {
    const [plan] = build([remotePlan('free', value)]);
    assert.deepEqual(plan.features, fr.PRICING_PLANS[0].features);
  }

  const [unknown] = build([remotePlan('custom', null)]);
  assert.deepEqual(unknown.features, []);
});

test('conserve les cartes statiques et leurs prix sans données distantes', () => {
  const plans = build(null);
  assert.deepEqual(plans.map(plan => plan.id), ['free', 'basic', 'pro']);
  assert.equal(plans[1].price, '29 €');
  assert.ok(plans.every(plan => Array.isArray(plan.features)));
});

test('localise les fonctionnalités générées en français et en anglais', () => {
  const [french] = build([remotePlan('free', { analytics: true })]);
  const [english] = build([remotePlan('free', { analytics: true })], en, 'en');

  assert.ok(french.features.includes('500 messages par mois'));
  assert.ok(english.features.includes('500 messages per month'));
  assert.ok(english.features.includes('Advanced analytics'));
});

test('retourne un tableau vide pour une réponse API sans liste de forfaits', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ data: { plans: {} } }) });
  try {
    assert.deepEqual(await getPublicPlans(), []);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
