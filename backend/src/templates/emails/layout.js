const config = require('../../config/config');

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

/**
 * Échappe toute valeur interpolée dans un template HTML, URLs comprises.
 */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ESCAPE_MAP[character]);
}

function renderButton(url, label) {
  return `<p style="margin:24px 0;">`
    + `<a href="${escapeHtml(url)}" `
    + `style="background:#3b82f6;color:#ffffff;padding:12px 24px;border-radius:6px;`
    + `text-decoration:none;display:inline-block;font-weight:600;">${escapeHtml(label)}</a>`
    + `</p>`;
}

/**
 * Enveloppe un corps HTML déjà échappé dans la mise en page commune.
 */
function renderLayout({ title, body, locale = 'fr' }) {
  const supportEmail = escapeHtml(config.app.supportEmail);
  const help = locale === 'en' ? 'need help? Email us at' : 'besoin d’aide ? Écrivez-nous à';
  return `<!DOCTYPE html><html lang="${locale}"><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width,initial-scale=1"></head>`
    + `<body style="margin:0;padding:24px;background:#f5f5f5;`
    + `font-family:Arial,Helvetica,sans-serif;color:#333333;">`
    + `<div style="max-width:600px;margin:0 auto;background:#ffffff;`
    + `border-radius:8px;padding:32px;">`
    + `<h1 style="font-size:20px;margin:0 0 16px;">${escapeHtml(title)}</h1>`
    + body
    + `<hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0 16px;">`
    + `<p style="font-size:12px;color:#777777;margin:0;">`
    + `Voxo Chat — ${help} `
    + `<a href="mailto:${supportEmail}" style="color:#3b82f6;">${supportEmail}</a>.</p>`
    + `</div></body></html>`;
}

function renderTextFooter(locale = 'fr') {
  const help = locale === 'en' ? 'need help? Email us at' : 'besoin d’aide ? Écrivez-nous à';
  return `\n\nVoxo Chat — ${help} ${config.app.supportEmail}.`;
}

module.exports = { escapeHtml, renderButton, renderLayout, renderTextFooter };
