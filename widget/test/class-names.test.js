import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

// Le build renomme les classes `vx-*` (widget/vite.config.js). Une classe
// assemblée à l'exécution garde son nom d'origine alors que le CSS est renommé :
// la règle ne s'applique plus dans le bundle, sans qu'aucun test DOM ne le voie.
test('n’assemble jamais un nom de classe vx- à l’exécution', () => {
  const sources = readdirSync(SRC_DIR).filter(name => name.endsWith('.js'));
  assert.ok(sources.length > 0);
  for (const name of sources) {
    const source = readFileSync(join(SRC_DIR, name), 'utf8');
    assert.doesNotMatch(source, /vx-\$\{/, `${name} interpole un nom de classe vx-`);
    assert.doesNotMatch(source, /['"`]vx-[a-z-]*['"`]\s*\+/, `${name} concatène un nom de classe vx-`);
  }
});

test('déclare dans le compacteur toutes les classes de rôle utilisées', () => {
  const config = readFileSync(join(SRC_DIR, '..', 'vite.config.js'), 'utf8');
  for (const role of ['vx-user', 'vx-bot', 'vx-agent']) {
    assert.match(config, new RegExp(`'${role}'`), `${role} absent de INTERNAL_CLASSES`);
  }
});
