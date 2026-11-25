const planChangeRequestService = require('../services/planChangeRequestService');
const adminSupportService = require('../services/adminSupportService');
const { successResponse } = require('../utils/responseUtils');

const approve = async (req, res, next) => {
  try {
    const ticketId = await planChangeRequestService.approve({
      ticketId: req.validatedParams.id, admin: req.adminUser, ...req.body,
    });
    const ticket = await adminSupportService.getTicketDetail(ticketId);
    successResponse(res, ticket, 'Forfait approuvé avec succès');
  } catch (error) { next(error); }
};

module.exports = { approve };
