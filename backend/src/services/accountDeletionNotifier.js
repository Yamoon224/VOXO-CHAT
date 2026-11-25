const emailService = require('./emailService');
const { computePurgeAt, formatPurgeDate } = require('./accountRetention');

/**
 * Notifications de suppression de compte. Toutes sont « meilleur effort » :
 * une panne du fournisseur d'emails ne doit jamais annuler une suppression
 * déjà committée en base.
 */
class AccountDeletionNotifier {
  fullName(user) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  }

  purgeDate(deletedAt, locale = 'fr') {
    return formatPurgeDate(computePurgeAt(deletedAt), locale);
  }

  /**
   * Chaque notification part dans la langue de SON destinataire
   * (`preferredLocale`), pas dans celle de l'acteur qui a déclenché l'action.
   */
  /** L'utilisateur a supprimé son propre compte. */
  async notifySelfDeletion({ user, tenantName, deletedAt, companyDeleted = false }) {
    const locale = user.preferredLocale || 'fr';
    return emailService.sendAccountDeleted({
      email: user.email,
      firstName: user.firstName,
      tenantName,
      purgeDate: this.purgeDate(deletedAt, locale),
      companyDeleted,
      locale,
    });
  }

  /** Le propriétaire a supprimé le compte d'un membre. */
  async notifyMemberRemoved({ member, tenantName, deletedAt }) {
    const locale = member.preferredLocale || 'fr';
    return emailService.sendAccountRemoved({
      email: member.email,
      firstName: member.firstName,
      tenantName,
      purgeDate: this.purgeDate(deletedAt, locale),
      locale,
    });
  }

  /** Un membre hérite de l'entreprise après le départ du propriétaire. */
  async notifyOwnershipTransfer({ newOwner, previousOwner, tenantName }) {
    return emailService.sendOwnershipTransferred({
      email: newOwner.email,
      firstName: newOwner.firstName,
      tenantName,
      previousOwnerName: this.fullName(previousOwner),
      locale: newOwner.preferredLocale || 'fr',
    });
  }
}

module.exports = new AccountDeletionNotifier();
module.exports.AccountDeletionNotifier = AccountDeletionNotifier;
