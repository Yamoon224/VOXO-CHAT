const supportTicketService = require('../services/supportTicketService');
const { successResponse } = require('../utils/responseUtils');

const listTickets = async (req, res, next) => {
  try {
    const tickets = await supportTicketService.listTickets(req.tenant.id);
    successResponse(res, { tickets }, 'Demandes récupérées avec succès');
  } catch (error) {
    next(error);
  }
};

const getTicket = async (req, res, next) => {
  try {
    const ticket = await supportTicketService.getTicketDetail(
      req.tenant.id, req.validatedParams.id, req.user
    );
    successResponse(res, ticket, 'Demande récupérée avec succès');
  } catch (error) {
    next(error);
  }
};

const createTicket = async (req, res, next) => {
  try {
    const ticket = await supportTicketService.createTicket({
      tenant: req.tenant,
      actor: req.user,
      ...req.body,
    });
    successResponse(res, ticket, 'Demande envoyée avec succès', 201);
  } catch (error) {
    next(error);
  }
};

const replyToTicket = async (req, res, next) => {
  try {
    const ticket = await supportTicketService.replyToTicket({
      tenant: req.tenant,
      actor: req.user,
      ticketId: req.validatedParams.id,
      ...req.body,
    });
    successResponse(res, ticket, 'Message envoyé avec succès');
  } catch (error) {
    next(error);
  }
};

module.exports = { listTickets, getTicket, createTicket, replyToTicket };
