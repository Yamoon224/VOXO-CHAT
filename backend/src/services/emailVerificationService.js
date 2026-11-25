const { Op } = require('sequelize');
const { User, Tenant } = require('../models');
const config = require('../config/config');
const { AppError } = require('../middleware/errorMiddleware');
const authTokenService = require('./authTokenService');
const emailService = require('./emailService');
const { localizedFrontendUrl } = require('../i18n/url');

const VERIFICATION_TTL_HOURS = 24;

class EmailVerificationService {
  buildVerifyUrl(token, locale) {
    const params = new URLSearchParams({ token });
    return `${localizedFrontendUrl(config.app.frontendUrl, 'auth/verify-email', locale)}?${params.toString()}`;
  }

  /** L'adresse à confirmer est la nouvelle si un changement est en attente. */
  getTargetEmail(user) {
    return user.pendingEmail || user.email;
  }

  /**
   * Émet un jeton de vérification et envoie l'email en « meilleur effort ».
   * Retourne false si le fournisseur est indisponible : l'inscription reste
   * valide et l'utilisateur pourra demander un renvoi.
   */
  async sendVerification(user) {
    const { token } = await authTokenService.issue(
      user.id,
      authTokenService.TOKEN_TYPES.EMAIL_VERIFICATION
    );

    return emailService.sendEmailVerification({
      email: this.getTargetEmail(user),
      firstName: user.firstName,
      verifyUrl: this.buildVerifyUrl(token, user.preferredLocale),
      expiresInHours: VERIFICATION_TTL_HOURS,
      locale: user.preferredLocale,
    });
  }

  /**
   * Consomme le jeton, bascule l'adresse en attente le cas échéant et marque
   * le compte vérifié. Retourne l'utilisateur et son tenant.
   */
  async confirmVerification(token) {
    const { userId } = await authTokenService.consume(
      token,
      authTokenService.TOKEN_TYPES.EMAIL_VERIFICATION
    );

    const user = await User.findOne({
      where: { id: userId, isActive: true },
      include: [{ model: Tenant, as: 'tenant', where: { isActive: true } }],
    });
    if (!user) {
      throw new AppError('Compte introuvable ou désactivé', 404, { code: 'USER_NOT_FOUND' });
    }

    const updates = { emailVerifiedAt: new Date() };
    if (user.pendingEmail) {
      updates.email = user.pendingEmail;
      updates.pendingEmail = null;
    }
    await user.update(updates);

    return { user, tenant: user.tenant };
  }

  /**
   * Renvoie un lien de vérification.
   *
   * Distingue deux issues que l'appelant doit traiter différemment :
   * - 'skipped' : aucun compte à notifier. La réponse HTTP doit rester neutre
   *   pour ne pas révéler l'existence du compte.
   * - 'failed'  : le compte existe mais le fournisseur est indisponible. Le
   *   signaler ne fuite rien, la panne étant indépendante du compte, et évite
   *   d'afficher un faux succès à l'utilisateur.
   */
  async resendVerification(email) {
    const user = await User.findOne({
      where: {
        isActive: true,
        [Op.or]: [{ email }, { pendingEmail: email }],
      },
    });

    if (!user) return 'skipped';
    if (user.emailVerifiedAt && !user.pendingEmail) return 'skipped';

    const sent = await this.sendVerification(user);
    return sent ? 'sent' : 'failed';
  }

  /**
   * Vérifie qu'aucun autre compte du tenant n'utilise cette adresse, ni comme
   * email de connexion ni comme adresse en attente de confirmation.
   */
  async assertEmailAvailable(user, email) {
    const existingUser = await User.findOne({
      where: {
        tenantId: user.tenantId,
        id: { [Op.ne]: user.id },
        [Op.or]: [{ email }, { pendingEmail: email }],
      },
    });

    if (existingUser) {
      throw new AppError('Cet email est déjà utilisé', 409, { code: 'EMAIL_ALREADY_USED' });
    }
  }

  /**
   * Démarre un changement d'adresse : la nouvelle est mise en attente et
   * l'ancienne reste utilisable pour se connecter jusqu'à confirmation.
   */
  async requestEmailChange(user, newEmail) {
    await this.assertEmailAvailable(user, newEmail);
    await user.update({ pendingEmail: newEmail });
    return this.sendVerification(user);
  }
}

module.exports = new EmailVerificationService();
