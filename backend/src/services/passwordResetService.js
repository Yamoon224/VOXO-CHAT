const { User, Tenant } = require('../models');
const config = require('../config/config');
const { AppError } = require('../middleware/errorMiddleware');
const authTokenService = require('./authTokenService');
const emailService = require('./emailService');
const { localizedFrontendUrl } = require('../i18n/url');

const RESET_TTL_HOURS = 1;

class PasswordResetService {
  buildResetUrl(token, locale) {
    const params = new URLSearchParams({ token });
    return `${localizedFrontendUrl(config.app.frontendUrl, 'auth/reset-password', locale)}?${params.toString()}`;
  }

  /**
   * Émet un jeton de réinitialisation et envoie l'email.
   * L'envoi est « meilleur effort » : la réponse HTTP ne doit jamais laisser
   * deviner si le compte existe, y compris quand le fournisseur est en panne.
   */
  async requestReset(user) {
    const { token } = await authTokenService.issue(
      user.id,
      authTokenService.TOKEN_TYPES.PASSWORD_RESET
    );

    return emailService.sendBestEffort({
      to: user.email,
      template: 'passwordReset',
      data: {
        firstName: user.firstName,
        resetUrl: this.buildResetUrl(token, user.preferredLocale),
        expiresInHours: RESET_TTL_HOURS,
      }, locale: user.preferredLocale,
    });
  }

  /**
   * Consomme le jeton, applique le nouveau mot de passe et notifie l'utilisateur.
   */
  async confirmReset({ token, newPassword }) {
    const { userId } = await authTokenService.consume(
      token,
      authTokenService.TOKEN_TYPES.PASSWORD_RESET
    );

    // L'entreprise est jointe comme au login : un jeton émis avant le blocage
    // ne doit pas permettre de continuer à manipuler le compte après coup.
    const user = await User.findOne({
      where: { id: userId, isActive: true },
      include: [{ model: Tenant, as: 'tenant', where: { isActive: true } }],
    });
    if (!user) {
      throw new AppError('Compte introuvable ou désactivé', 404, { code: 'USER_NOT_FOUND' });
    }

    user.password = newPassword; // Le hash est fait par le hook beforeUpdate
    await user.save();
    await this.notifyPasswordChanged(user);

    return user;
  }

  async notifyPasswordChanged(user) {
    return emailService.sendPasswordChanged({
      email: user.email,
      firstName: user.firstName,
      locale: user.preferredLocale,
    });
  }
}

module.exports = new PasswordResetService();
