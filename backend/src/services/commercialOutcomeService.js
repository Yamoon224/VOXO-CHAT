const { CommercialRequest } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');

const FINAL = ['successful', 'failed', 'cancelled'];

class CommercialOutcomeService {
  async update({ tenantId, requestId, payload }) {
    const request = await CommercialRequest.findOne({ where: { id: requestId, tenantId } });
    if (!request) throw new AppError('Demande commerciale introuvable', 404, { code: 'COMMERCIAL_REQUEST_NOT_FOUND' });
    const outcomeStatus = payload.outcomeStatus ?? request.outcomeStatus;
    const changes = { ...payload, outcomeStatus, resolvedAt: FINAL.includes(outcomeStatus) ? (request.resolvedAt || new Date()) : null };
    if (payload.amount !== undefined && (payload.category || request.category) !== 'order') throw new AppError('Le montant est réservé aux commandes', 400, { code: 'COMMERCIAL_AMOUNT_CATEGORY_INVALID' });
    await request.update(changes);
    return request;
  }
}

module.exports = new CommercialOutcomeService();
