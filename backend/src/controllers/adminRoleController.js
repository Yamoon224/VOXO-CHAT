const roleService = require('../services/adminRoleService');
const { successResponse } = require('../utils/responseUtils');

const listRoles = async (req, res, next) => {
  try {
    const roles = await roleService.listRoles();
    successResponse(res, { roles }, 'Rôles récupérés avec succès');
  } catch (error) {
    next(error);
  }
};

const createRole = async (req, res, next) => {
  try {
    const role = await roleService.createRole({
      actor: req.adminUser,
      name: req.body.name,
      permissions: req.body.permissions,
    });
    successResponse(res, role, 'Rôle créé avec succès', 201);
  } catch (error) {
    next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const role = await roleService.updateRole({
      actor: req.adminUser,
      roleId: req.validatedParams.id,
      name: req.body.name,
      permissions: req.body.permissions,
    });
    successResponse(res, role, 'Rôle mis à jour avec succès');
  } catch (error) {
    next(error);
  }
};

const deleteRole = async (req, res, next) => {
  try {
    await roleService.deleteRole({
      actor: req.adminUser,
      roleId: req.validatedParams.id,
    });
    successResponse(res, null, 'Rôle supprimé avec succès');
  } catch (error) {
    next(error);
  }
};

module.exports = { listRoles, createRole, updateRole, deleteRole };
