const { Op } = require('sequelize');
const {
  sequelize,
  User,
  Tenant,
  AuthToken,
  TeamInvitation,
  KnowledgeBase,
  Conversation,
} = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const tenantDeletionService = require('./tenantDeletionService');
const notifier = require('./accountDeletionNotifier');
const { computePurgeAt } = require('./accountRetention');

/**
 * Suppression de compte en soft delete.
 *
 * Le `paranoid` des modèles `User`/`Tenant` fait le gros du travail : dès que
 * `deleted_at` est posé, toutes les requêtes existantes (login, middleware
 * d'auth, disponibilité d'email, liste d'équipe…) ignorent la ligne, et les
 * index uniques partiels libèrent immédiatement l'email et le sous-domaine.
 * La purge définitive intervient 30 jours plus tard (`accountPurgeService`).
 */
class AccountDeletionService {
  /** Un membre ne peut hériter de l'entreprise que s'il peut réellement s'y connecter. */
  async listEligibleOwners(tenantId, currentUserId) {
    return User.findAll({
      where: {
        tenantId,
        isActive: true,
        emailVerifiedAt: { [Op.ne]: null },
        id: { [Op.ne]: currentUserId },
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
      order: [['createdAt', 'ASC']],
    });
  }

  async resolveTenant(user) {
    return user.tenant || Tenant.findByPk(user.tenantId);
  }

  /** Volumétrie affichée avant de confirmer la suppression de l'entreprise. */
  async countCompanyImpact(tenantId) {
    const [membersCount, knowledgeCount, conversationsCount] = await Promise.all([
      User.count({ where: { tenantId } }),
      KnowledgeBase.count({ where: { tenantId } }),
      Conversation.count({ where: { tenantId } }),
    ]);
    return { membersCount, knowledgeCount, conversationsCount };
  }

  /**
   * Ce que le dashboard doit afficher avant confirmation : transfert de
   * propriété requis, ou suppression de l'entreprise entière.
   */
  async getDeletionPreview(user) {
    const tenant = await this.resolveTenant(user);
    const isOwner = user.role === 'owner';
    const eligibleOwners = isOwner ? await this.listEligibleOwners(user.tenantId, user.id) : [];
    const willDeleteCompany = isOwner && eligibleOwners.length === 0;

    return {
      isOwner,
      transferRequired: isOwner && eligibleOwners.length > 0,
      willDeleteCompany,
      tenantName: tenant?.name || null,
      purgeAt: computePurgeAt(),
      eligibleOwners: eligibleOwners.map(member => this.toPublicOwner(member)),
      impact: willDeleteCompany ? await this.countCompanyImpact(user.tenantId) : null,
    };
  }

  toPublicOwner(member) {
    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      role: member.role,
    };
  }

  async assertPassword(user, currentPassword) {
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw new AppError('Mot de passe actuel incorrect', 400, { code: 'INVALID_PASSWORD' });
    }
  }

  /**
   * Soft delete d'un seul compte. Les jetons d'authentification sont détruits
   * pour de bon : un lien de réinitialisation en circulation ne doit pas
   * survivre au compte. Les JWT déjà émis tombent d'eux-mêmes puisque le
   * middleware recharge l'utilisateur en base à chaque requête.
   */
  async softDeleteMember(user, transaction = null) {
    const options = transaction ? { transaction } : {};
    await AuthToken.destroy({ where: { userId: user.id }, force: true, ...options });
    await user.destroy(options);
    return user.deletedAt || new Date();
  }

  /**
   * Soft delete de l'entreprise entière : membres, invitations, abonnement.
   * Les webhooks externes sont coupés tout de suite — laisser un bot répondre
   * pendant 30 jours au nom d'une entreprise supprimée serait inacceptable.
   */
  async softDeleteTenant(tenant) {
    await tenantDeletionService.cleanupExternalChannels(tenant);

    await sequelize.transaction(async (transaction) => {
      const where = { tenantId: tenant.id };
      await TeamInvitation.update(
        { status: 'revoked', revokedAt: new Date() },
        { where: { ...where, status: 'pending' }, transaction }
      );
      const members = await User.findAll({ where, attributes: ['id'], transaction });
      await AuthToken.destroy({
        where: { userId: members.map(member => member.id) },
        force: true,
        transaction,
      });
      await User.destroy({ where, transaction });
      await tenant.destroy({ transaction });
    });

    return new Date();
  }

  assertNewOwner(eligibleOwners, newOwnerId) {
    if (!newOwnerId) {
      throw new AppError(
        'Désignez un nouveau propriétaire avant de supprimer votre compte',
        400,
        {
          code: 'OWNER_TRANSFER_REQUIRED',
          details: { eligibleOwners: eligibleOwners.map(member => this.toPublicOwner(member)) },
        }
      );
    }
    const newOwner = eligibleOwners.find(member => member.id === newOwnerId);
    if (!newOwner) {
      throw new AppError('Ce membre ne peut pas devenir propriétaire du compte', 400, {
        code: 'INVALID_NEW_OWNER',
      });
    }
    return newOwner;
  }

  /** Transfert de propriété puis départ de l'owner sortant, en une transaction. */
  async transferAndDelete({ user, newOwner }) {
    await sequelize.transaction(async (transaction) => {
      await newOwner.update({ role: 'owner' }, { transaction });
      await this.softDeleteMember(user, transaction);
    });
    return new Date();
  }

  async deleteOwnerAccount({ user, tenant, newOwnerId, confirmCompanyDeletion }) {
    const eligibleOwners = await this.listEligibleOwners(user.tenantId, user.id);

    if (eligibleOwners.length === 0) {
      if (confirmCompanyDeletion !== true) {
        throw new AppError(
          'Aucun membre ne peut reprendre le compte : confirmez la suppression de l’entreprise',
          400,
          {
            code: 'COMPANY_DELETION_CONFIRMATION_REQUIRED',
            details: { impact: await this.countCompanyImpact(user.tenantId) },
          }
        );
      }
      const deletedAt = await this.softDeleteTenant(tenant);
      await notifier.notifySelfDeletion({
        user,
        tenantName: tenant?.name,
        deletedAt,
        companyDeleted: true,
      });
      return { scope: 'company', deletedAt };
    }

    const newOwner = this.assertNewOwner(eligibleOwners, newOwnerId);
    const deletedAt = await this.transferAndDelete({ user, newOwner });
    await notifier.notifyOwnershipTransfer({
      newOwner,
      previousOwner: user,
      tenantName: tenant?.name,
    });
    await notifier.notifySelfDeletion({ user, tenantName: tenant?.name, deletedAt });
    return { scope: 'member', deletedAt, newOwnerId: newOwner.id };
  }

  /** Point d'entrée de `DELETE /api/auth/account`. */
  async deleteAccount({ user, currentPassword, newOwnerId, confirmCompanyDeletion }) {
    await this.assertPassword(user, currentPassword);
    const tenant = await this.resolveTenant(user);

    if (user.role === 'owner') {
      const result = await this.deleteOwnerAccount({
        user,
        tenant,
        newOwnerId,
        confirmCompanyDeletion,
      });
      return { ...result, purgeAt: computePurgeAt(result.deletedAt) };
    }

    const deletedAt = await this.softDeleteMember(user);
    await notifier.notifySelfDeletion({ user, tenantName: tenant?.name, deletedAt });
    return { scope: 'member', deletedAt, purgeAt: computePurgeAt(deletedAt) };
  }
}

module.exports = new AccountDeletionService();
module.exports.AccountDeletionService = AccountDeletionService;
