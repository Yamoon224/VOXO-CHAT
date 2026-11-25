const { Op } = require('sequelize');
const { TeamInvitation, User, Tenant, sequelize } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const { sanitizeOverrides } = require('../config/permissions');
const emailService = require('./emailService');
const permissionService = require('./teamPermissionService');
const quotaService = require('./quotaService');
const tokens = require('./teamInvitationTokens');

const { INVITATION_TTL_HOURS } = tokens;

// Les utilitaires de jeton sont appelés directement sur `tokens` : les méthodes
// de façade qui existaient ici n'étaient que de l'indirection, sans appelant
// externe.
class TeamInvitationService {
  /**
   * La recherche est volontairement globale : `User.email` porte un index unique
   * sur toute la plateforme. Se limiter au tenant laissait passer l'invitation
   * d'une adresse déjà prise ailleurs, et l'échec retombait sur l'invité au
   * moment de créer son compte, après qu'il ait tout saisi.
   *
   * `tenantId` ne filtre plus, il sert à choisir le message.
   */
  async assertEmailAvailable(tenantId, email, transaction = null) {
    const user = await User.findOne({
      where: { [Op.or]: [{ email }, { pendingEmail: email }] },
      ...(transaction && { transaction }),
    });
    if (!user) return;

    if (user.tenantId === tenantId) {
      throw new AppError('Cette personne fait déjà partie de votre équipe', 409, {
        code: 'MEMBER_ALREADY_EXISTS',
      });
    }

    // Le tenant d'accueil n'est pas nommé : l'invitant n'a pas à le connaître.
    throw new AppError(
      'Cet email est déjà utilisé par un compte existant. Choisissez une autre adresse.',
      409,
      { code: 'EMAIL_ALREADY_USED' }
    );
  }

  /**
   * L'entreprise doit être active ET avoir un siège libre pour accueillir un
   * nouveau membre. `paranoid` couvre la suppression, `isActive` le blocage.
   *
   * Le verrou sur la ligne du tenant est indispensable au décompte des sièges :
   * sans lui, deux invités acceptant simultanément verrouillent des lignes
   * d'invitation DIFFÉRENTES et franchiraient tous deux la limite.
   */
  async assertTenantAcceptsMembers(tenantId, transaction = null) {
    const tenant = await Tenant.findOne({
      where: { id: tenantId, isActive: true },
      ...(transaction && { transaction, lock: transaction.LOCK.UPDATE }),
    });
    if (!tenant) {
      throw new AppError('Cette entreprise n’accepte plus de nouveaux membres', 403, {
        code: 'TENANT_INACTIVE',
      });
    }

    // L'invitation en cours compte déjà comme un siège occupé : on vérifie
    // simplement que le total reste dans la limite, sans en réserver un de plus.
    await quotaService.assertCanAddMember(tenant, 0, transaction ? { transaction } : {});
    return tenant;
  }

  async findPendingInvitation(tenantId, email) {
    return TeamInvitation.findOne({
      where: { tenantId, email, status: 'pending' },
      order: [['createdAt', 'DESC']],
    });
  }

  async createInvitation({ tenant, actor, email, role, permissions }) {
    permissionService.assertCanInvite(actor, role);
    const permissionOverrides = sanitizeOverrides(permissions);
    permissionService.assertCanAssignPermissions(actor, role, permissionOverrides);

    const normalizedEmail = tokens.normalizeEmail(email);
    await this.assertEmailAvailable(tenant.id, normalizedEmail);
    // L'invitation à venir occupera un siège dès son émission : on le réserve
    // ici, sinon plusieurs invitations simultanées dépasseraient la limite.
    await quotaService.assertCanAddMember(tenant, 1);

    const duplicate = await this.findPendingInvitation(tenant.id, normalizedEmail);
    if (duplicate && duplicate.expiresAt > new Date()) {
      throw new AppError('Une invitation est déjà en attente pour cet email', 409, {
        code: 'INVITATION_ALREADY_PENDING',
      });
    }
    if (duplicate) await duplicate.update({ status: 'revoked', revokedAt: new Date() });

    const { token, tokenHash } = tokens.createToken();
    let invitation;
    try {
      invitation = await TeamInvitation.create({
        tenantId: tenant.id,
        email: normalizedEmail,
        role,
        permissionOverrides,
        tokenHash,
        status: 'pending',
        expiresAt: tokens.expiresAtFromNow(),
        invitedBy: actor.id,
        locale: actor.preferredLocale || 'fr',
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new AppError('Une invitation est déjà en attente pour cet email', 409, {
          code: 'INVITATION_ALREADY_PENDING',
        });
      }
      throw error;
    }

    try {
      await this.sendInvitation({ invitation, token, tenant, actor });
    } catch (error) {
      await invitation.destroy();
      throw error;
    }
    return tokens.toPublicInvitation(invitation);
  }

  async sendInvitation({ invitation, token, tenant, actor }) {
    const inviterName = `${actor.firstName} ${actor.lastName}`.trim();
    await emailService.sendTeamInvitation({
      email: invitation.email,
      tenantName: tenant.name,
      inviterName,
      invitationUrl: tokens.buildInvitationUrl(tenant.id, token, invitation.locale),
      expiresInHours: INVITATION_TTL_HOURS,
      locale: invitation.locale,
    });
  }

  async getManageableInvitation(tenantId, invitationId, actor) {
    permissionService.assertCanManageTeam(actor);
    const invitation = await TeamInvitation.findOne({
      where: { id: invitationId, tenantId },
    });
    if (!invitation) {
      throw new AppError('Invitation introuvable', 404, { code: 'INVITATION_NOT_FOUND' });
    }
    permissionService.assertCanInvite(actor, invitation.role);
    return invitation;
  }

  async resendInvitation({ tenant, invitationId, actor }) {
    const invitation = await this.getManageableInvitation(tenant.id, invitationId, actor);
    if (invitation.status !== 'pending') {
      throw new AppError('Cette invitation ne peut plus être renvoyée', 409, {
        code: 'INVITATION_NOT_PENDING',
      });
    }
    await this.assertEmailAvailable(tenant.id, invitation.email);
    const previous = { tokenHash: invitation.tokenHash, expiresAt: invitation.expiresAt };
    const { token, tokenHash } = tokens.createToken();

    // Persister avant d'envoyer : un token émis par email doit toujours être
    // celui stocké en base. En cas d'échec d'envoi, on restaure l'ancien.
    await invitation.update({ tokenHash, expiresAt: tokens.expiresAtFromNow() });
    try {
      await this.sendInvitation({ invitation, token, tenant, actor });
    } catch (error) {
      await invitation.update(previous);
      throw error;
    }
    return tokens.toPublicInvitation(invitation);
  }

  async revokeInvitation({ tenantId, invitationId, actor }) {
    const invitation = await this.getManageableInvitation(tenantId, invitationId, actor);
    if (invitation.status !== 'pending') {
      throw new AppError('Cette invitation ne peut plus être révoquée', 409, {
        code: 'INVITATION_NOT_PENDING',
      });
    }
    await invitation.update({ status: 'revoked', revokedAt: new Date() });
  }

  async acceptInvitation({ tenantId, token, firstName, lastName, password }) {
    const transaction = await sequelize.transaction();
    try {
      const invitation = await TeamInvitation.findOne({
        where: { tenantId, tokenHash: tokens.hashToken(token) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      tokens.assertInvitationAcceptable(invitation);
      // Cette route est publique et montée hors `extractTenantFromRequest` :
      // sans cette vérification, une entreprise bloquée ou supprimée
      // continuerait de gagner des membres qui ne pourraient jamais se connecter.
      await this.assertTenantAcceptsMembers(tenantId, transaction);
      await this.assertEmailAvailable(tenantId, invitation.email, transaction);
      const user = await User.create({
        tenantId,
        email: invitation.email,
        firstName,
        lastName,
        password,
        role: invitation.role,
        // Les accès choisis à l'invitation suivent le membre sur son compte.
        permissionOverrides: sanitizeOverrides(invitation.permissionOverrides),
        // Recevoir l'invitation à cette adresse vaut preuve de possession
        emailVerifiedAt: new Date(),
        preferredLocale: invitation.locale || 'fr',
      }, { transaction });
      await invitation.update({ status: 'accepted', acceptedAt: new Date() }, { transaction });
      await transaction.commit();

      // Hors transaction et best effort : un échec d'email ne doit jamais
      // annuler la création du membre.
      await this.notifyInviter({ invitation, member: user });

      return user.toJSON();
    } catch (error) {
      await transaction.rollback();
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new AppError('Un compte utilise déjà cet email', 409, {
          code: 'EMAIL_ALREADY_USED',
        });
      }
      throw error;
    }
  }

  async notifyInviter({ invitation, member }) {
    try {
      const inviter = await User.findOne({
        where: { id: invitation.invitedBy, tenantId: invitation.tenantId, isActive: true },
        include: [{ model: Tenant, as: 'tenant' }],
      });
      if (!inviter) return false;

      return await emailService.sendInvitationAccepted({
        email: inviter.email,
        inviterName: `${inviter.firstName} ${inviter.lastName}`.trim(),
        memberName: `${member.firstName} ${member.lastName}`.trim(),
        memberEmail: member.email,
        tenantName: inviter.tenant?.name || '',
        locale: inviter.preferredLocale || 'fr',
      });
    } catch (error) {
      return false;
    }
  }
}

module.exports = new TeamInvitationService();
