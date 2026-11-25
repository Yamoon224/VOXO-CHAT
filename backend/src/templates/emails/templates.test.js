jest.mock('../../config/config', () => ({
  app: { supportEmail: 'support@voxo.test', frontendUrl: 'https://app.test' },
}));

const templates = require('./index');

const XSS_NAME = '<script>alert(1)</script>';
const XSS_URL = 'https://app.test/auth/reset-password?token=a"b&c=<d>';

// Un cas par template, réutilisé pour les assertions de forme et d'échappement
const TEMPLATE_CASES = [
  ['passwordReset', { firstName: XSS_NAME, resetUrl: XSS_URL, expiresInHours: 1 }],
  ['passwordChanged', { firstName: XSS_NAME }],
  ['teamInvitation', {
    tenantName: XSS_NAME, inviterName: XSS_NAME, invitationUrl: XSS_URL, expiresInHours: 72,
  }],
  ['emailVerification', { firstName: XSS_NAME, verifyUrl: XSS_URL, expiresInHours: 24 }],
  ['invitationAccepted', {
    inviterName: XSS_NAME, memberName: XSS_NAME,
    memberEmail: XSS_NAME, tenantName: XSS_NAME,
  }],
  ['accountDeleted', {
    firstName: XSS_NAME, tenantName: XSS_NAME,
    purgeDate: '5 septembre 2026', companyDeleted: true,
  }],
  ['accountRemoved', {
    firstName: XSS_NAME, tenantName: XSS_NAME, purgeDate: '5 septembre 2026',
  }],
  ['ownershipTransferred', {
    firstName: XSS_NAME, tenantName: XSS_NAME, previousOwnerName: XSS_NAME,
  }],
  ['commercialRequest', {
    tenantName: XSS_NAME, customerName: XSS_NAME, customerPhone: XSS_NAME,
    customerEmail: XSS_NAME, productName: XSS_NAME, quantity: 2, reason: XSS_NAME,
  }],
  ['conversationExport', { tenantName: XSS_NAME, conversationTitle: XSS_NAME }],
  ['humanHandoff', { tenantName: XSS_NAME, conversationTitle: XSS_NAME }],
  ['adminInvitation', { inviterName: XSS_NAME, invitationUrl: XSS_URL, expiresInHours: 72 }],
  ['tenantSuspended', { firstName: XSS_NAME, tenantName: XSS_NAME }],
  ['tenantReactivated', { firstName: XSS_NAME, tenantName: XSS_NAME }],
  ['supportTicketOpened', {
    firstName: XSS_NAME, tenantName: XSS_NAME, authorName: XSS_NAME,
    subject: XSS_NAME, priority: 'high', ticketUrl: XSS_URL,
  }],
  ['supportTicketReplied', {
    firstName: XSS_NAME, adminName: XSS_NAME, subject: XSS_NAME, ticketUrl: XSS_URL,
  }],
];

// Matrice FR/EN : chaque template est rendu dans les deux langues.
const LOCALE_CASES = TEMPLATE_CASES.flatMap(
  ([name, data]) => ['fr', 'en'].map(locale => [name, locale, data])
);

describe('templates emails', () => {
  test('the registry matches the implemented templates', () => {
    expect(Object.keys(templates).sort()).toEqual(TEMPLATE_CASES.map(([name]) => name).sort());
  });

  test.each(LOCALE_CASES)('%s (%s) returns subject, html and text', (name, locale, data) => {
    const rendered = templates[name](data, locale);

    expect(rendered.subject).toEqual(expect.any(String));
    expect(rendered.subject.length).toBeGreaterThan(0);
    expect(rendered.html).toContain('<!DOCTYPE html>');
    expect(rendered.html).toContain(`<html lang="${locale}"`);
    expect(rendered.text).toEqual(expect.any(String));
    expect(rendered.text.length).toBeGreaterThan(0);
  });

  // Un template qui ignorerait `locale` rendrait deux fois le même HTML : c'est
  // exactement ce que cette assertion attrape.
  test.each(TEMPLATE_CASES)('%s renders differently in French and English', (name, data) => {
    const fr = templates[name](data, 'fr');
    const en = templates[name](data, 'en');

    expect(en.html).not.toEqual(fr.html);
    expect(en.text).not.toEqual(fr.text);
  });

  test.each(TEMPLATE_CASES)('%s defaults to French without an explicit locale', (name, data) => {
    expect(templates[name](data)).toEqual(templates[name](data, 'fr'));
  });

  test.each(LOCALE_CASES)('%s (%s) escapes interpolated values', (name, locale, data) => {
    const { html } = templates[name](data, locale);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('escapes URLs too, not just names', () => {
    const { html } = templates.passwordReset({
      firstName: 'Guy',
      resetUrl: XSS_URL,
      expiresInHours: 1,
    });

    expect(html).toContain('token=a&quot;b&amp;c=&lt;d&gt;');
    expect(html).not.toContain('token=a"b');
  });

  test('the plain text part keeps the raw link usable', () => {
    const { text } = templates.passwordReset({
      firstName: 'Guy',
      resetUrl: 'https://app.test/auth/reset-password?token=abc',
      expiresInHours: 1,
    });

    expect(text).toContain('https://app.test/auth/reset-password?token=abc');
  });
});
