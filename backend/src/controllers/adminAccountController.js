const accountService = require('../services/adminAccountService');
const invitationService = require('../services/adminInvitationService');
const sessionService = require('../services/adminAuthSessionService');
const { successResponse } = require('../utils/responseUtils');

const listAdmins = async (req, res, next) => {
  try {
    const data = await accountService.listAdmins(req.validatedQuery);
    successResponse(res, data, 'Comptes administrateurs récupérés avec succès');
  } catch (error) {
    next(error);
  }
};

const inviteAdmin = async (req, res, next) => {
  try {
    const invitation = await invitationService.createInvitation({
      actor: req.adminUser,
      email: req.body.email,
      roleId: req.body.roleId,
    });
    successResponse(res, invitation, 'Invitation envoyée avec succès', 201);
  } catch (error) {
    next(error);
  }
};

const resendInvitation = async (req, res, next) => {
  try {
    const invitation = await invitationService.resendInvitation({
      actor: req.adminUser,
      invitationId: req.validatedParams.id,
    });
    successResponse(res, invitation, 'Invitation renvoyée avec succès');
  } catch (error) {
    next(error);
  }
};

const revokeInvitation = async (req, res, next) => {
  try {
    await invitationService.revokeInvitation({
      actor: req.adminUser,
      invitationId: req.validatedParams.id,
    });
    successResponse(res, null, 'Invitation révoquée avec succès');
  } catch (error) {
    next(error);
  }
};

const updateAdminRole = async (req, res, next) => {
  try {
    const admin = await accountService.updateAdminRole({
      actor: req.adminUser,
      adminId: req.validatedParams.id,
      roleId: req.body.roleId,
    });
    successResponse(res, admin, 'Rôle mis à jour avec succès');
  } catch (error) {
    next(error);
  }
};

const updateAdminStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const admin = await accountService.setStatus({
      actor: req.adminUser,
      adminId: req.validatedParams.id,
      isActive,
    });
    successResponse(res, admin, isActive ? 'Compte débloqué avec succès' : 'Compte bloqué avec succès');
  } catch (error) {
    next(error);
  }
};

const acceptInvitation = async (req, res, next) => {
  try {
    const admin = await invitationService.acceptInvitation({
      token: req.body.token,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      password: req.body.password,
    });
    successResponse(res, sessionService.buildSession(admin), 'Compte administrateur créé avec succès', 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listAdmins,
  inviteAdmin,
  resendInvitation,
  revokeInvitation,
  updateAdminRole,
  updateAdminStatus,
  acceptInvitation,
};
