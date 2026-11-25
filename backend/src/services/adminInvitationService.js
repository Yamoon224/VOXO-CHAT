const { AdminInvitation, AdminUser, AdminRole, sequelize } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const { hasPermission } = require('../config/adminPermissions');
const emailService = require('./emailService');
const roleService = require('./adminRoleService');
const tokens = require('./adminInvitationTokens');

const { INVITATION_TTL_HOURS } = tokens;

class AdminInvitationService {
  /**
   * Inviter suppose `admins:write`. Inviter SUR le rôle système suppose en plus
   * d'être soi-même super administrateur : sinon un rôle personnalisé disposant
   * de `admins:write` pourrait se fabriquer un complice tout-puissant.
   */
  assertCanInvite(actor, targetRole) {
    if (!hasPermission(actor, 'admins', 'write')) {
      throw new AppError('Vous n\'avez pas les droits nécessaires pour inviter un administrateur', 403, {
        code: 'ADMIN_PERMISSION_DENIED',
      });
    }
    if (targetRole.isSystem && !actor.role?.isSystem) {
      throw new AppError(
        'Seul un super administrateur peut attribuer le rôle super administrateur',
        403,
        { code: 'ADMIN_SYSTEM_ROLE_REQUIRED' }
      );
    }
  }

  async assertEmailAvailable(email, transaction = null) {
    const existing = await AdminUser.findOne({
      where: { email },
      ...(transaction && { transaction }),
    });
    if (existing) {
      throw new AppError('Un compte administrateur utilise déjà cet email', 409, {
        code: 'EMAIL_ALREADY_USED',
      });
    }
  }

  async listPendingInvitations() {
    const invitations = await AdminInvitation.findAll({
      where: { status: 'pending' },
      include: [{ model: AdminRole, as: 'role' }],
      order: [['createdAt', 'DESC']],
    });
    return invitations.map(invitation => tokens.toPublicInvitation(invitation));
  }

  async createInvitation({ actor, email, roleId }) {
    const role = await roleService.getRoleOrFail(roleId);
    this.assertCanInvite(actor, role);

    const normalizedEmail = tokens.normalizeEmail(email);
    await this.assertEmailAvailable(normalizedEmail);

    const duplicate = await AdminInvitation.findOne({
      where: { email: normalizedEmail, status: 'pending' },
    });
    if (duplicate && duplicate.expiresAt > new Date()) {
      throw new AppError('Une invitation est déjà en attente pour cet email', 409, {
        code: 'INVITATION_ALREADY_PENDING',
      });
    }
    if (duplicate) await duplicate.update({ status: 'revoked', revokedAt: new Date() });

    const { token, tokenHash } = tokens.createToken();
    const invitation = await AdminInvitation.create({
      email: normalizedEmail,
      roleId: role.id,
      tokenHash,
      status: 'pending',
      expiresAt: tokens.expiresAtFromNow(),
      invitedBy: actor.id,
      locale: actor.preferredLocale || 'fr',
    });

    try {
      await this.sendInvitation({ invitation, token, actor });
    } catch (error) {
      await invitation.destroy();
      throw error;
    }

    invitation.role = role;
    return tokens.toPublicInvitation(invitation);
  }

  async sendInvitation({ invitation, token, actor }) {
    await emailService.sendAdminInvitation({
      email: invitation.email,
      inviterName: `${actor.firstName} ${actor.lastName}`.trim(),
      invitationUrl: tokens.buildInvitationUrl(token, invitation.locale),
      expiresInHours: INVITATION_TTL_HOURS,
      locale: invitation.locale,
    });
  }

  async getPendingInvitationOrFail(invitationId) {
    const invitation = await AdminInvitation.findOne({
      where: { id: invitationId },
      include: [{ model: AdminRole, as: 'role' }],
    });
    if (!invitation) {
      throw new AppError('Invitation introuvable', 404, { code: 'INVITATION_NOT_FOUND' });
    }
    if (invitation.status !== 'pending') {
      throw new AppError('Cette invitation n\'est plus en attente', 409, {
        code: 'INVITATION_NOT_PENDING',
      });
    }
    return invitation;
  }

  async resendInvitation({ actor, invitationId }) {
    const invitation = await this.getPendingInvitationOrFail(invitationId);
    this.assertCanInvite(actor, invitation.role);
    await this.assertEmailAvailable(invitation.email);

    // Persister avant d'envoyer : un token émis par email doit toujours être
    // celui stocké en base. En cas d'échec d'envoi, on restaure l'ancien.
    const previous = { tokenHash: invitation.tokenHash, expiresAt: invitation.expiresAt };
    const { token, tokenHash } = tokens.createToken();
    await invitation.update({ tokenHash, expiresAt: tokens.expiresAtFromNow() });

    try {
      await this.sendInvitation({ invitation, token, actor });
    } catch (error) {
      await invitation.update(previous);
      throw error;
    }
    return tokens.toPublicInvitation(invitation);
  }

  async revokeInvitation({ actor, invitationId }) {
    const invitation = await this.getPendingInvitationOrFail(invitationId);
    this.assertCanInvite(actor, invitation.role);
    await invitation.update({ status: 'revoked', revokedAt: new Date() });
  }

  async acceptInvitation({ token, firstName, lastName, password }) {
    const transaction = await sequelize.transaction();
    try {
      const invitation = await AdminInvitation.findOne({
        where: { tokenHash: tokens.hashToken(token) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      tokens.assertInvitationAcceptable(invitation);
      await this.assertEmailAvailable(invitation.email, transaction);

      const admin = await AdminUser.create({
        email: invitation.email,
        firstName,
        lastName,
        password,
        roleId: invitation.roleId,
        preferredLocale: invitation.locale || 'fr',
      }, { transaction });

      await invitation.update({ status: 'accepted', acceptedAt: new Date() }, { transaction });
      await transaction.commit();

      // Rechargé avec son rôle : `toJSON` en dérive les permissions effectives.
      return AdminUser.findByPk(admin.id, { include: [{ model: AdminRole, as: 'role' }] });
    } catch (error) {
      await transaction.rollback();
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new AppError('Un compte administrateur utilise déjà cet email', 409, {
          code: 'EMAIL_ALREADY_USED',
        });
      }
      throw error;
    }
  }
}

module.exports = new AdminInvitationService();
