const AdminRole = require('./AdminRole');
const AdminUser = require('./AdminUser');
const AdminInvitation = require('./AdminInvitation');

/**
 * Associations de la plateforme d'administration.
 *
 * Extraites de `models/index.js` pour tenir la limite de 250 lignes. L'absence
 * de toute association vers `Tenant`/`User` est volontaire : les deux identités
 * restent étanches, un compte administrateur n'appartient à aucun tenant.
 */
function defineAdminAssociations() {
  AdminRole.hasMany(AdminUser, { foreignKey: 'roleId', as: 'admins' });
  AdminUser.belongsTo(AdminRole, { foreignKey: 'roleId', as: 'role' });

  AdminRole.hasMany(AdminInvitation, { foreignKey: 'roleId', as: 'invitations' });
  AdminInvitation.belongsTo(AdminRole, { foreignKey: 'roleId', as: 'role' });

  AdminUser.hasMany(AdminInvitation, { foreignKey: 'invitedBy', as: 'sentInvitations' });
  AdminInvitation.belongsTo(AdminUser, { foreignKey: 'invitedBy', as: 'inviter' });
}

module.exports = { defineAdminAssociations, AdminRole, AdminUser, AdminInvitation };
