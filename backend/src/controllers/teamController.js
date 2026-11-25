const memberService = require('../services/teamMemberService');
const invitationService = require('../services/teamInvitationService');
const { successResponse } = require('../utils/responseUtils');

const listMembers = async (req, res, next) => {
  try {
    const data = await memberService.listMembers({
      tenantId: req.tenant.id,
      actor: req.user,
      ...req.validatedQuery,
    });
    successResponse(res, data, 'Membres récupérés avec succès');
  } catch (error) {
    next(error);
  }
};

const inviteMember = async (req, res, next) => {
  try {
    const invitation = await invitationService.createInvitation({
      tenant: req.tenant,
      actor: req.user,
      ...req.body,
    });
    successResponse(res, invitation, 'Invitation envoyée avec succès', 201);
  } catch (error) {
    next(error);
  }
};

const resendInvitation = async (req, res, next) => {
  try {
    const invitation = await invitationService.resendInvitation({
      tenant: req.tenant,
      invitationId: req.validatedParams.id,
      actor: req.user,
    });
    successResponse(res, invitation, 'Invitation renvoyée avec succès');
  } catch (error) {
    next(error);
  }
};

const revokeInvitation = async (req, res, next) => {
  try {
    await invitationService.revokeInvitation({
      tenantId: req.tenant.id,
      invitationId: req.validatedParams.id,
      actor: req.user,
    });
    successResponse(res, null, 'Invitation révoquée avec succès');
  } catch (error) {
    next(error);
  }
};

const updateMemberRole = async (req, res, next) => {
  try {
    const member = await memberService.updateRole({
      tenantId: req.tenant.id,
      memberId: req.validatedParams.id,
      actor: req.user,
      role: req.body.role,
    });
    successResponse(res, member, 'Rôle mis à jour avec succès');
  } catch (error) {
    next(error);
  }
};

const updateMemberPermissions = async (req, res, next) => {
  try {
    const member = await memberService.updatePermissions({
      tenantId: req.tenant.id,
      memberId: req.validatedParams.id,
      actor: req.user,
      permissions: req.body.permissions,
    });
    successResponse(res, member, 'Accès mis à jour avec succès');
  } catch (error) {
    next(error);
  }
};

const updateMemberStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const member = await memberService.setMemberStatus({
      // Le tenant complet, pas seulement son identifiant : le contrôle de
      // sièges au déblocage a besoin de son forfait.
      tenant: req.tenant,
      memberId: req.validatedParams.id,
      actor: req.user,
      isActive,
    });
    successResponse(res, member, isActive ? 'Membre débloqué avec succès' : 'Membre bloqué avec succès');
  } catch (error) {
    next(error);
  }
};

const deleteMember = async (req, res, next) => {
  try {
    await memberService.deleteMember({
      tenantId: req.tenant.id,
      memberId: req.validatedParams.id,
      actor: req.user,
      currentPassword: req.body.currentPassword,
      tenantName: req.tenant.name,
    });
    successResponse(res, null, 'Membre supprimé avec succès');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listMembers,
  inviteMember,
  resendInvitation,
  revokeInvitation,
  updateMemberRole,
  updateMemberPermissions,
  updateMemberStatus,
  deleteMember,
};
