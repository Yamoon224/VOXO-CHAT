const Tenant = require('./Tenant');
const User = require('./User');
const { AdminUser } = require('./adminAssociations');
const SupportTicket = require('./SupportTicket');
const SupportMessage = require('./SupportMessage');

/**
 * Associations du support.
 *
 * C'est le SEUL endroit où les deux mondes d'identité se croisent
 * légitimement : un ticket appartient à une entreprise (`Tenant`/`User`) et
 * peut être pris en charge par un compte de la plateforme (`AdminUser`).
 * Ailleurs, les deux restent volontairement étanches.
 *
 * Les auteurs de messages, eux, ne sont PAS associés : `SupportMessage`
 * porterait deux clés étrangères mutuellement exclusives selon `authorType`,
 * ce qu'aucun schéma relationnel ne sait exprimer proprement. Le nom de
 * l'auteur est figé à l'écriture pour que le fil reste lisible.
 */
function defineSupportAssociations() {
  Tenant.hasMany(SupportTicket, {
    foreignKey: 'tenantId', as: 'supportTickets', onDelete: 'CASCADE',
  });
  SupportTicket.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

  SupportTicket.belongsTo(User, { foreignKey: 'openedByUserId', as: 'openedBy' });
  SupportTicket.belongsTo(AdminUser, { foreignKey: 'assignedAdminId', as: 'assignedAdmin' });

  SupportTicket.hasMany(SupportMessage, {
    foreignKey: 'ticketId', as: 'messages', onDelete: 'CASCADE',
  });
  SupportMessage.belongsTo(SupportTicket, { foreignKey: 'ticketId', as: 'ticket' });
}

module.exports = { defineSupportAssociations, SupportTicket, SupportMessage };
