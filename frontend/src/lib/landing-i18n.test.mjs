import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import * as frContent from './landing-content.mjs';
import * as enContent from './landing-content-en.mjs';
import * as frFeatures from './landing-features.mjs';
import * as enFeatures from './landing-features-en.mjs';
import * as frPricing from './landing-pricing.mjs';
import * as enPricing from './landing-pricing-en.mjs';
import { FAQ_ITEMS as frFaq } from './landing-faq.mjs';
import { FAQ_ITEMS as enFaq } from './landing-faq-en.mjs';

const shape = value => {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, shape(value[key])]));
  }
  return typeof value;
};

test('les catalogues de landing français et anglais ont la même structure', () => {
  for (const [fr, en] of [[frContent, enContent], [frFeatures, enFeatures], [frPricing, enPricing], [frFaq, enFaq]]) {
    assert.deepEqual(shape(en), shape(fr));
  }
  assert.equal(frFaq.length, enFaq.length);
});

test('chaque capture française possède une variante anglaise', () => {
  for (const name of ['analytics', 'channels', 'inbox', 'knowledge', 'settings', 'widget']) {
    assert.ok(existsSync(join(process.cwd(), 'public', 'landing', `${name}-en.png`)), `${name}-en.png manquant`);
  }
});

test('les composants anglais ne réintroduisent pas de contenu français codé en dur', () => {
  const files = ['LandingFaq.jsx', 'LandingFooter.jsx', 'LandingPricing.jsx', 'PricingCard.jsx'];
  const forbidden = ['D’autres questions', 'Tous droits réservés', 'Le plus choisi', 'Commencer gratuitement', 'Mot de passe oublié'];
  const source = files.map(file => readFileSync(join(process.cwd(), 'src', 'components', 'landing', file), 'utf8')).join('\n');
  for (const phrase of forbidden) assert.equal(source.includes(phrase), false, `Texte codé en dur: ${phrase}`);
});

test('les catalogues next-intl français et anglais ont les mêmes clés', () => {
  const flatten = (value, prefix = '') => Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child) ? flatten(child, path) : [path];
  });
  const fr = JSON.parse(readFileSync(join(process.cwd(), 'src', 'messages', 'fr.json'), 'utf8'));
  const en = JSON.parse(readFileSync(join(process.cwd(), 'src', 'messages', 'en.json'), 'utf8'));
  assert.deepEqual(flatten(en).sort(), flatten(fr).sort());
});
