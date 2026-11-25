jest.mock('../models', () => ({ Plan: { findAll: jest.fn() } }));
jest.mock('../utils/channelLogger', () => ({ logChannelEvent: jest.fn() }));

const { Plan } = require('../models');
const { logChannelEvent } = require('../utils/channelLogger');
const planService = require('./planService');

const row = (name, overrides = {}) => ({
  get: () => ({
    id: `id-${name}`,
    name,
    label: name,
    priceAmount: 0,
    priceCurrency: 'EUR',
    messagesPerMonth: 42,
    messagesPerDay: null,
    maxUsers: null,
    activeDocuments: 7,
    features: { leadGeneration: true },
    ...overrides,
  }),
  name,
});

describe('planService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    planService.invalidate();
    Plan.findAll.mockResolvedValue([row('free'), row('basic'), row('pro'), row('enterprise')]);
  });

  test('reads the plans from the database', async () => {
    await expect(planService.getLimits('free')).resolves.toMatchObject({
      messagesPerMonth: 42, activeDocuments: 7,
    });
  });

  /**
   * Le cache est ce qui évite une requête par message entrant : sans lui, le
   * chemin chaud paierait une lecture pour quatre lignes qui bougent rarement.
   */
  test('serves repeated reads from cache instead of querying again', async () => {
    await planService.getLimits('free');
    await planService.getLimits('basic');
    await planService.getFeatures('pro');

    expect(Plan.findAll).toHaveBeenCalledTimes(1);
  });

  test('queries again once the cache is invalidated', async () => {
    await planService.getLimits('free');
    planService.invalidate();
    await planService.getLimits('free');

    expect(Plan.findAll).toHaveBeenCalledTimes(2);
  });

  describe('repli', () => {
    beforeEach(() => {
      Plan.findAll.mockResolvedValue([row('free')]);
    });

    test('falls back to the configured limits when a plan row is missing', async () => {
      await expect(planService.getLimits('pro')).resolves.toMatchObject({
        messagesPerMonth: null, activeDocuments: null,
      });
    });

    // Un forfait absent dégraderait sinon un client payant en silence.
    test('logs the missing plan rather than degrading silently', async () => {
      await planService.getLimits('enterprise');

      expect(logChannelEvent).toHaveBeenCalledWith(
        'error',
        'plan.missing_in_database',
        expect.objectContaining({ plan: 'enterprise' })
      );
    });

    test('falls back to the default plan for an unknown name', async () => {
      await expect(planService.getLimits('platine')).resolves.toMatchObject({
        messagesPerMonth: 100,
      });
    });

    test('still lists the four plans when the table is incomplete', async () => {
      const plans = await planService.listPlans();

      expect(plans.map(plan => plan.name)).toEqual(['free', 'basic', 'pro', 'enterprise']);
    });
  });
});
