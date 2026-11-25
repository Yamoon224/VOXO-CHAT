const crypto = require('crypto');
const { AppError } = require('../middleware/errorMiddleware');
const config = require('../config/config');
const { localizedFrontendUrl } = require('../i18n/url');

// Jeton, durée de vie et sérialisation d'une invitation d'administrateur.
// Volontairement séparé de teamInvitationTokens.js : l'URL et le domaine
// d'acceptation diffèrent, et les deux flux ne doivent pas se contraindre.

const INVITATION_TTL_HOURS = 72;

const normalizeEmail = email => email.trim().toLowerCase();

const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

/** Le jeton en clair ne part que par email ; seule son empreinte est stockée. */
const createToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token) };
};

const buildInvitationUrl = (token, locale = 'fr') => {
  const params = new URLSearchParams({ token });
  return `${localizedFrontendUrl(config.app.frontendUrl, 'admin/auth/accept-invitation', locale)}?${params.toString()}`;
};

const expiresAtFromNow = () => new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);

const assertInvitationAcceptable = (invitation) => {
  if (!invitation || invitation.status !== 'pending') {
    throw new AppError('Invitation invalide ou déjà utilisée', 400, {
      code: 'INVITATION_INVALID',
    });
  }
  if (invitation.expiresAt <= new Date()) {
    throw new AppError('Cette invitation a expiré', 410, { code: 'INVITATION_EXPIRED' });
  }
};

const toPublicInvitation = invitation => ({
  id: invitation.id,
  email: invitation.email,
  roleId: invitation.roleId,
  roleName: invitation.role?.name ?? null,
  status: invitation.status,
  expiresAt: invitation.expiresAt,
  createdAt: invitation.createdAt,
});

module.exports = {
  INVITATION_TTL_HOURS,
  normalizeEmail,
  hashToken,
  createToken,
  buildInvitationUrl,
  expiresAtFromNow,
  assertInvitationAcceptable,
  toPublicInvitation,
};
