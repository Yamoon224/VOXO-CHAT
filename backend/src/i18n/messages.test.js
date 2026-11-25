const fs = require('fs');
const path = require('path');
const { MESSAGES, messageFor, translate, hasMessage, dynamicMessage } = require('./messages');
const { normalizeLocale, requestLocale } = require('./locale');

const SRC_ROOT = path.join(__dirname, '..');

/** Tous les fichiers source de backend/src, hors suites de test. */
function sourceFiles(dir = SRC_ROOT, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, found);
    else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) found.push(full);
  }
  return found;
}

describe('API localization', () => {
  test('every stable code has non-empty French and English copy', () => {
    Object.entries(MESSAGES).forEach(([code, copy]) => {
      expect(code).toMatch(/^[A-Z0-9_]+$/);
      expect(copy.fr).toEqual(expect.any(String));
      expect(copy.en).toEqual(expect.any(String));
      expect(copy.fr.trim()).not.toBe('');
      expect(copy.en.trim()).not.toBe('');
    });
  });

  test('unknown locales and missing English copy fall back to French', () => {
    expect(normalizeLocale('de-DE')).toBe('fr');
    expect(messageFor('USER_NOT_FOUND', 'de')).toBe('Utilisateur introuvable');
  });

  test('stable codes take precedence over legacy phrases', () => {
    expect(translate('arbitrary legacy text', 'en', 'TOKEN_EXPIRED')).toBe('Session expired');
    expect(translate('Email ou mot de passe incorrect', 'en')).toBe('Incorrect email or password');
  });

  test('request locale follows explicit, account, header, French order', () => {
    const get = () => 'fr-FR';
    expect(requestLocale({ query: { locale: 'en' }, user: { preferredLocale: 'fr' }, get })).toBe('en');
    expect(requestLocale({ query: {}, body: {}, user: { preferredLocale: 'en' }, get })).toBe('en');
    expect(requestLocale({ query: {}, body: {}, get: () => 'en-US' })).toBe('en');
    expect(requestLocale({ query: {}, body: {}, get: () => undefined })).toBe('fr');
  });

  test('dynamicMessage resolves a locale pair and falls back to French', () => {
    const copy = { fr: 'Trois pages', en: 'Three pages' };
    expect(dynamicMessage(copy, 'en')).toBe('Three pages');
    expect(dynamicMessage(copy, 'fr')).toBe('Trois pages');
    expect(dynamicMessage(copy, 'de')).toBe('Trois pages');
    expect(dynamicMessage(copy)).toBe('Trois pages');
    expect(dynamicMessage(null, 'en')).toBe(MESSAGES.INTERNAL_ERROR.en);
  });

  // Garde-fou : un `code:` référencé au point de throw mais absent du registre
  // renvoie silencieusement INTERNAL_ERROR au client. Ce test le fait échouer
  // au moment où le code est introduit plutôt qu'en production.
  test('every code referenced in backend/src exists in the registry', () => {
    const CODE_LITERAL = /\bcode:\s*['"]([A-Z0-9_]+)['"]/g;
    const missing = [];

    for (const file of sourceFiles()) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        for (const match of line.matchAll(CODE_LITERAL)) {
          if (!hasMessage(match[1])) {
            missing.push(`${path.relative(SRC_ROOT, file)}:${index + 1} → ${match[1]}`);
          }
        }
      });
    }

    expect(missing).toEqual([]);
  });
});
