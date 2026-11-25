const mockFindOrCreate = jest.fn();
jest.mock('../models', () => ({
  CommercialRequest: { findOrCreate: mockFindOrCreate },
  KnowledgeBase: { findOne: jest.fn() },
  User: { findAll: jest.fn() },
}));
jest.mock('./emailService', () => ({ sendBestEffort: jest.fn() }));

const service = require('./commercialRequestService');

describe('commercialRequestService', () => {
  test('extrait quantité, téléphone et nom sans exécuter le contenu', () => {
    expect(service.extractQuantity('Je veux 3 unités')).toBe(3);
    expect(service.extractPhone('Jean +225 07 08 09 10 11')).toBe('+2250708091011');
    expect(service.extractName('Mon nom est Jean 0708091011', '0708091011')).toBe('Jean');
  });

  test('demande les coordonnées après la quantité', async () => {
    const response = await service.continueFlow({
      conversation: { metadata: { commercialFlow: { stage: 'quantity', productId: 'p1', reason: 'purchase' } } },
      tenant: { id: 't1' }, text: '2',
    });
    expect(response.response).toContain('nom et un numéro');
    expect(response.commercialAction).toMatchObject({ stage: 'contact', quantity: 2 });
  });

  test('crée une demande idempotente tenant-scopée', async () => {
    mockFindOrCreate.mockResolvedValue([{ id: 'r1', notificationStatus: 'sent' }, false]);
    const response = await service.continueFlow({
      conversation: {
        id: 'c1', userName: 'Jean', metadata: {
          commercialFlow: { stage: 'contact', productId: 'p1', reason: 'purchase', quantity: 2 },
        },
      },
      tenant: { id: 't1' }, text: '0708091011',
    });
    expect(mockFindOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 't1', requestKey: 'c1:p1:purchase' },
    }));
    expect(response.commercialAction.stage).toBe('complete');
  });
});
