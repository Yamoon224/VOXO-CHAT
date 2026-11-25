const adminSupportService = require('../services/adminSupportService');
const { successResponse } = require('../utils/responseUtils');
const supportStatsService = require('../services/supportStatsService');
const { buildWindow } = require('../services/statsWindow');

const listTickets = async (req, res, next) => {
  try {
    const data = await adminSupportService.listTickets({
      ...req.validatedQuery,
      actorId: req.adminUser.id,
    });
    successResponse(res, data, 'Demandes récupérées avec succès');
  } catch (error) {
    next(error);
  }
};

/** Compteur léger pour le badge : évite de dépaginer la liste pour un nombre. */
const countOpenTickets = async (req, res, next) => {
  try {
    const open = await adminSupportService.countOpenTickets();
    successResponse(res, { open }, 'Compteur récupéré avec succès');
  } catch (error) {
    next(error);
  }
};
const getStats = async (req, res, next) => { try { const { from, to, days } = buildWindow(req.validatedQuery.period); successResponse(res, { stats: await supportStatsService.getDashboard({ from, to }), period: req.validatedQuery.period, days }, 'Statistiques support récupérées avec succès'); } catch (error) { next(error); } };

const getTicket = async (req, res, next) => {
  try {
    const ticket = await adminSupportService.getTicketDetail(req.validatedParams.id);
    successResponse(res, ticket, 'Demande récupérée avec succès');
  } catch (error) {
    next(error);
  }
};

const assignTicket = async (req, res, next) => {
  try {
    const ticket = await adminSupportService.assignTicket({
      ticketId: req.validatedParams.id,
      actor: req.adminUser,
      adminId: req.body.adminId,
    });
    successResponse(res, ticket, 'Demande prise en charge avec succès');
  } catch (error) {
    next(error);
  }
};

const releaseTicket = async (req, res, next) => {
  try {
    const ticket = await adminSupportService.releaseTicket({
      ticketId: req.validatedParams.id,
      actor: req.adminUser,
    });
    successResponse(res, ticket, 'Demande libérée avec succès');
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const ticket = await adminSupportService.updateStatus({
      ticketId: req.validatedParams.id,
      status: req.body.status,
    });
    successResponse(res, ticket, 'Statut mis à jour avec succès');
  } catch (error) {
    next(error);
  }
};

const reply = async (req, res, next) => {
  try {
    const ticket = await adminSupportService.reply({
      ticketId: req.validatedParams.id,
      actor: req.adminUser,
      ...req.body,
    });
    successResponse(res, ticket, req.body.internal ? 'Note enregistrée' : 'Réponse envoyée');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listTickets, countOpenTickets, getStats, getTicket, assignTicket, releaseTicket, updateStatus, reply,
};
