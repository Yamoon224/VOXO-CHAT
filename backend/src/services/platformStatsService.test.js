jest.mock('../models', () => ({
  sequelize: {
    query: jest.fn(),
    QueryTypes: { SELECT: 'SELECT' },
  },
}));

const { sequelize } = require('../models');
const service = require('./platformStatsService');

// `type: QueryTypes.SELECT` renvoie un tableau PLAT de lignes, pas le tuple
// `[[rows], meta]` du mode RAW. S'y tromper produit des échecs déroutants.
const rows = (...values) => sequelize.query.mockResolvedValue(values);

const sqlOf = (index = 0) => sequelize.query.mock.calls[index][0];
const optionsOf = (index = 0) => sequelize.query.mock.calls[index][1];

describe('platformStatsService', () => {
  const window = { from: new Date('2026-07-20T00:00:00Z'), to: new Date('2026-08-19T00:00:00Z') };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildWindow', () => {
    test('spans the requested number of days', () => {
      const { from, to, days } = service.buildWindow('7d');

      expect(days).toBe(7);
      expect((to - from) / 86_400_000).toBe(7);
    });

    test('falls back to 30 days for an unknown period', () => {
      expect(service.buildWindow('bogus').days).toBe(30);
      expect(service.buildWindow().days).toBe(30);
    });

    test('aligns on whole UTC days', () => {
      const { from, to } = service.buildWindow('30d');

      expect(from.getUTCHours()).toBe(0);
      expect(to.getUTCHours()).toBe(0);
    });
  });

  /**
   * LE point de ce module. `Conversation` n'est pas `paranoid` et la suppression
   * d'un tenant est douce, donc la cascade SQL ne part jamais : sans cette
   * jointure, les conversations d'une entreprise supprimée seraient comptées
   * pour toujours. Ces tests verrouillent le filtre.
   */
  describe('filtre de suppression douce', () => {
    test('getConversationTotals joins Tenant on deleted_at IS NULL', async () => {
      rows({ conversations: '3', messages: '9' });

      await service.getConversationTotals(window);

      expect(sqlOf()).toContain('JOIN "Tenant"');
      expect(sqlOf()).toContain('deleted_at IS NULL');
    });

    test('getActiveChatbots joins Tenant on deleted_at IS NULL', async () => {
      rows({ active_chatbots: '2' });

      await service.getActiveChatbots(window);

      expect(sqlOf()).toContain('deleted_at IS NULL');
    });

    test('getSatisfaction joins Tenant on deleted_at IS NULL in both queries', async () => {
      sequelize.query
        .mockResolvedValueOnce([{ sentiment: 'positive', count: '5' }])
        .mockResolvedValueOnce([{ avg_rating: '4' }]);

      await service.getSatisfaction(window);

      expect(sqlOf(0)).toContain('deleted_at IS NULL');
      expect(sqlOf(1)).toContain('deleted_at IS NULL');
    });

    test('getConversationTrend excludes conversations of deleted tenants', async () => {
      rows({ date: '2026-08-18', conversations: '1' });

      await service.getConversationTrend(window);

      expect(sqlOf()).toContain('deleted_at IS NULL');
    });

    // En SQL brut, la portée `paranoid` de l'ORM sur `User` est perdue : la
    // condition doit être écrite à la main, sur l'utilisateur ET son entreprise.
    test('getAccountTotals filters deleted users and deleted tenants', async () => {
      rows({ tenants: '5', active_tenants: '4', users: '9' });

      await service.getAccountTotals();

      expect(sqlOf()).toContain('u.deleted_at IS NULL');
      expect(sqlOf()).toContain('t.deleted_at IS NULL');
    });
  });

  describe('requêtes', () => {
    // Les valeurs passent par `replacements`, jamais par interpolation.
    test('passes the window through replacements, never interpolated', async () => {
      rows({ conversations: '0', messages: '0' });

      await service.getConversationTotals(window);

      expect(optionsOf().replacements).toEqual({ from: window.from, to: window.to });
      expect(sqlOf()).toContain(':from');
      expect(sqlOf()).not.toContain('2026-07-20');
    });

    /**
     * Le prédicat porte sur la colonne brute et non sur `date_trunc(...)`,
     * pour rester indexable quand le volume le justifiera.
     */
    test('keeps the date predicate sargable', async () => {
      rows({ conversations: '0', messages: '0' });

      await service.getConversationTotals(window);

      expect(sqlOf()).toContain('c.created_at >= :from');
      expect(sqlOf()).not.toMatch(/date_trunc\([^)]*\)\s*>=/);
    });

    test('active chatbots count distinct tenants, not conversations', async () => {
      rows({ active_chatbots: '2' });

      await expect(service.getActiveChatbots(window)).resolves.toBe(2);
      expect(sqlOf()).toContain('COUNT(DISTINCT c.tenant_id)');
      expect(sqlOf()).toContain('t.is_active = true');
    });

    test('parses aggregate strings into numbers', async () => {
      rows({ conversations: '12', messages: '48' });

      await expect(service.getConversationTotals(window)).resolves.toEqual({
        conversations: 12, messages: 48,
      });
    });

    // Postgres ne renvoie aucune ligne pour un jour vide ; sans generate_series
    // le graphique compresserait l'axe au lieu d'afficher un creux.
    test('the trend fills empty days with generate_series', async () => {
      rows({ date: '2026-08-18', conversations: '0' });

      const trend = await service.getConversationTrend(window);

      expect(sqlOf()).toContain('generate_series');
      expect(trend).toEqual([{ date: '2026-08-18', conversations: 0 }]);
    });

    test('satisfaction reuses the shared formula and reports the sample size', async () => {
      sequelize.query
        .mockResolvedValueOnce([
          { sentiment: 'positive', count: '8' },
          { sentiment: 'negative', count: '2' },
          { sentiment: 'inconnu', count: '50' },
        ])
        .mockResolvedValueOnce([{ avg_rating: '4.2' }]);

      await expect(service.getSatisfaction(window)).resolves.toMatchObject({
        sampleSize: 10,
        rate: 80,
        averageRating: 4.2,
      });
    });
  });
});
