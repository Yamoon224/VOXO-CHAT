const crypto = require('crypto');
const { PaymentTransaction } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');

class PaymentTransactionService {
  buildReference() {
    return `voxo_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  async createInitialized({ tenantId, userId, plan }) {
    const xofAmount = plan.prices?.XOF ?? (plan.priceCurrency === 'XOF' ? plan.priceAmount : null);
    if (xofAmount == null || xofAmount <= 0) {
      throw new AppError('Le forfait ne peut pas encore être payé en ligne', 409, {
        code: 'PAYMENT_PLAN_NOT_READY',
      });
    }
    return PaymentTransaction.create({
      tenantId, initiatedByUserId: userId, planName: plan.name, amount: xofAmount,
      currency: 'XOF', paystackReference: this.buildReference(), status: 'initialized',
    });
  }

  async markPaidByReference(reference, paystackData) {
    const transaction = await PaymentTransaction.findOne({ where: { paystackReference: reference } });
    if (!transaction) throw new AppError('Transaction de paiement introuvable', 404, { code: 'PAYMENT_NOT_FOUND' });
    if (transaction.status === 'paid') return { transaction, duplicate: true };
    await transaction.update({ status: 'paid', paidAt: new Date(), paystackData });
    return { transaction, duplicate: false };
  }
}

module.exports = new PaymentTransactionService();
