jest.mock('../models', () => ({ PaymentTransaction: { create: jest.fn(), findOne: jest.fn() } }));

const { PaymentTransaction } = require('../models');
const service = require('./paymentTransactionService');

describe('paymentTransactionService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('freezes the XOF price when preparing a payment transaction', async () => {
    PaymentTransaction.create.mockResolvedValue({ id: 'payment-1' });
    await service.createInitialized({ tenantId: 'tenant-1', userId: 'owner-1', plan: { name: 'pro', priceAmount: 9900, priceCurrency: 'EUR', prices: { EUR: 9900, USD: 10900, XOF: 500000 } } });
    expect(PaymentTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1', planName: 'pro', amount: 500000, currency: 'XOF', status: 'initialized',
    }));
  });

  test('rejects a plan before its XOF price is ready', async () => {
    await expect(service.createInitialized({ tenantId: 'tenant-1', plan: { name: 'pro', priceAmount: 100, priceCurrency: 'EUR' } }))
      .rejects.toMatchObject({ code: 'PAYMENT_PLAN_NOT_READY' });
  });

  test('does not process an already paid transaction twice', async () => {
    const transaction = { status: 'paid', update: jest.fn() };
    PaymentTransaction.findOne.mockResolvedValue(transaction);
    await expect(service.markPaidByReference('ref-1', {})).resolves.toMatchObject({ duplicate: true });
    expect(transaction.update).not.toHaveBeenCalled();
  });
});
