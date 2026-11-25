const { SupportTicket } = require('../models');
const { AppError } = require('./errorMiddleware');

async function requireAssignedSupportTicket(req, res, next) {
  try {
    const ticket = await SupportTicket.findByPk(req.validatedParams.id);
    if (!ticket) return next(new AppError('Demande introuvable', 404, { code: 'SUPPORT_TICKET_NOT_FOUND' }));
    if (ticket.assignedAdminId && ticket.assignedAdminId !== req.adminUser.id) {
      return next(new AppError('Cette demande est suivie par un autre administrateur', 403, {
        code: 'SUPPORT_TICKET_ASSIGNED_TO_OTHER_ADMIN',
      }));
    }
    req.supportTicket = ticket;
    return next();
  } catch (error) { return next(error); }
}

module.exports = { requireAssignedSupportTicket };
