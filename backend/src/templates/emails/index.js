const passwordReset = require('./passwordReset');
const passwordChanged = require('./passwordChanged');
const teamInvitation = require('./teamInvitation');
const emailVerification = require('./emailVerification');
const invitationAccepted = require('./invitationAccepted');
const accountDeleted = require('./accountDeleted');
const accountRemoved = require('./accountRemoved');
const ownershipTransferred = require('./ownershipTransferred');
const commercialRequest = require('./commercialRequest');
const humanHandoff = require('./humanHandoff');
const conversationExport = require('./conversationExport');
const adminInvitation = require('./adminInvitation');
const tenantSuspended = require('./tenantSuspended');
const tenantReactivated = require('./tenantReactivated');
const supportTicketOpened = require('./supportTicketOpened');
const supportTicketReplied = require('./supportTicketReplied');

/**
 * Registre des templates transactionnels. Chaque template est une fonction
 * `(data) => { subject, html, text }`.
 */
module.exports = {
  passwordReset,
  passwordChanged,
  teamInvitation,
  emailVerification,
  invitationAccepted,
  accountDeleted,
  accountRemoved,
  ownershipTransferred,
  commercialRequest,
  humanHandoff,
  conversationExport,
  adminInvitation,
  tenantSuspended,
  tenantReactivated,
  supportTicketOpened,
  supportTicketReplied,
};
