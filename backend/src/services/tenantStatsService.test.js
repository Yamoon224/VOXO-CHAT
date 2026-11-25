jest.mock('../models', () => ({
  sequelize: {
    query: jest.fn(),
    QueryTypes: { SELECT: 'SELECT' },
  },
  KnowledgeBase: { count: jest.fn() },
}));

const { sequelize, KnowledgeBase } = require('../models');
const service = require('./tenantStatsService');

// `type: QueryTypes.SELECT` renvoie un tableau PLAT de lignes, pas le tuple
// `[[rows], meta]` du mode RAW.
const rows = (...values) => sequelize.query.mockResolvedValue(values);

const sqlOf = (index = 0) => sequelize.query.mock.calls[index][0];
const optionsOf = (index = 0) => sequelize.query.mock.calls[index][1];

describe('tenantStatsService', () => {
  const window = {
    tenantId: 'tenant-1',
    from: new Date('2026-07-20T00:00:00Z'),
    to: new Date('2026-08-19T00:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * LE point de ce module, et l'exact inverse de `platformStatsService` : là-bas
   * l'ABSENCE de filtre tenant était la propriété à verrouiller, ici c'est sa
   * PRÉSENCE. Une requête qui l'oublie ne lève aucune erreur — elle sert les
   * chiffres de tous les clients au client qui regarde.
   */
  describe('isolation multi-tenant', () => {
    test('getConversationTotals filters on tenant_id', async () => {
      rows({ conversations: '3', messages: '9' });

      await service.getConversationTotals(window);

      expect(sqlOf()).toContain('c.tenant_id = :tenantId');
      expect(optionsOf().replacements.tenantId).toBe('tenant-1');
    });

    test('getUniqueVisitors filters on tenant_id', async () => {
      rows({ visitors: '4' });

      await service.getUniqueVisitors(window);

      expect(sqlOf()).toContain('c.tenant_id = :tenantId');
    });

    test('getResponseTime filters on tenant_id', async () => {
      rows({ median_seconds: '12' });

      await service.getResponseTime(window);

      expect(sqlOf()).toContain('c.tenant_id = :tenantId');
    });

    test('getSatisfaction filters on tenant_id in both queries', async () => {
      sequelize.query
        .mockResolvedValueOnce([{ sentiment: 'positive', count: '5' }])
        .mockResolvedValueOnce([{ avg_rating: '4' }]);

      await service.getSatisfaction(window);

      expect(sqlOf(0)).toContain('c.tenant_id = :tenantId');
      expect(sqlOf(1)).toContain('c.tenant_id = :tenantId');
    });

    test('getConversationTrend scopes the join to the tenant', async () => {
      rows({ date: '2026-08-18', conversations: '1' });

      await service.getConversationTrend(window);

      expect(sqlOf()).toContain('c.tenant_id = :tenantId');
    });

    test('getKnowledgeBaseSize scopes the count to the tenant', async () => {
      KnowledgeBase.count.mockResolvedValue(7);

      await expect(service.getKnowledgeBaseSize('tenant-1')).resolves.toBe(7);
      expect(KnowledgeBase.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isActive: true },
      });
    });
  });

  describe('série journalière', () => {
    // Postgres ne renvoie aucune ligne pour un jour vide ; sans generate_series
    // le graphique compresserait l'axe au lieu d'afficher un creux.
    test('fills empty days with generate_series', async () => {
      rows({ date: '2026-08-18', conversations: '0' });

      const trend = await service.getConversationTrend(window);

      expect(sqlOf()).toContain('generate_series');
      expect(trend).toEqual([{ date: '2026-08-18', conversations: 0 }]);
    });

    /**
     * Le filtre tenant appartient à la condition de JOIN. Déplacé en WHERE, il
     * éliminerait les lignes où le LEFT JOIN n'a rien trouvé — c'est-à-dire
     * exactement les jours vides que `generate_series` vient de fabriquer.
     */
    test('keeps the tenant filter in the JOIN, never in a WHERE', async () => {
      rows({ date: '2026-08-18', conversations: '0' });

      await service.getConversationTrend(window);

      expect(sqlOf()).toContain('ON c.tenant_id = :tenantId');
      expect(sqlOf()).not.toMatch(/WHERE[\s\S]*tenant_id/);
    });
  });

  describe('délai de réponse', () => {
    /**
     * Une conversation escaladée, où un humain répond trois heures plus tard,
     * suffirait à faire mentir une moyenne sur des milliers d'échanges.
     */
    test('uses the median, never an average', async () => {
      rows({ median_seconds: '12.4' });

      await expect(service.getResponseTime(window)).resolves.toBe(12);
      expect(sqlOf()).toContain('percentile_cont(0.5)');
      expect(sqlOf()).not.toContain('AVG(EXTRACT');
    });

    /**
     * Liste BLANCHE des rôles : une liste noire excluant `internal_note`
     * laisserait passer tout rôle ajouté plus tard et fausserait le chiffre en
     * silence. `internal_note` est une note d'agent humain, pas une réponse.
     */
    test('pairs only user and assistant messages', async () => {
      rows({ median_seconds: '5' });

      await service.getResponseTime(window);

      expect(sqlOf()).toContain(`m.value->>'role' IN ('user', 'assistant')`);
      expect(sqlOf()).toContain(`role = 'user' AND reply_role = 'assistant'`);
    });

    /**
     * Postgres n'a pas de `TRY_CAST` : un `::timestamptz` nu ferait échouer
     * TOUTE la requête sur un seul horodatage mal formé, et les messages
     * d'avant l'ajout du champ n'en ont pas.
     */
    test('guards the timestamp cast against malformed values', async () => {
      rows({ median_seconds: '5' });

      await service.getResponseTime(window);

      expect(sqlOf()).toContain('CASE WHEN');
      expect(sqlOf()).toMatch(/~ '\^\\d\{4\}/);
    });

    // `null` et non `0` : « aucune paire mesurable » n'est pas « réponse
    // instantanée ». L'interface affiche « — ».
    test('returns null when no pair is measurable', async () => {
      rows({ median_seconds: null });

      await expect(service.getResponseTime(window)).resolves.toBeNull();
    });

    test('returns null when the query yields no row at all', async () => {
      sequelize.query.mockResolvedValue([]);

      await expect(service.getResponseTime(window)).resolves.toBeNull();
    });
  });

  describe('requêtes', () => {
    // Les valeurs passent par `replacements`, jamais par interpolation.
    test('passes the window through replacements, never interpolated', async () => {
      rows({ conversations: '0', messages: '0' });

      await service.getConversationTotals(window);

      expect(optionsOf().replacements).toEqual({
        tenantId: 'tenant-1', from: window.from, to: window.to,
      });
      expect(sqlOf()).toContain(':from');
      expect(sqlOf()).not.toContain('2026-07-20');
      expect(sqlOf()).not.toContain('tenant-1');
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

    test('parses aggregate strings into numbers', async () => {
      rows({ conversations: '12', messages: '48' });

      await expect(service.getConversationTotals(window)).resolves.toEqual({
        conversations: 12, messages: 48,
      });
    });

    test('unique visitors coalesce down to the session', async () => {
      rows({ visitors: '9' });

      await expect(service.getUniqueVisitors(window)).resolves.toBe(9);
      expect(sqlOf()).toContain('COUNT(DISTINCT COALESCE(c.user_id, c.user_email, c.session_id))');
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

  describe('getDashboard', () => {
    test('assembles every figure under the names the dashboard expects', async () => {
      sequelize.query
        .mockResolvedValueOnce([{ conversations: '12', messages: '48' }])
        .mockResolvedValueOnce([{ visitors: '7' }])
        .mockResolvedValueOnce([{ median_seconds: '3' }])
        .mockResolvedValueOnce([{ sentiment: 'positive', count: '6' }])
        .mockResolvedValueOnce([{ avg_rating: '4.5' }]);
      KnowledgeBase.count.mockResolvedValue(5);

      await expect(service.getDashboard(window)).resolves.toEqual({
        totalConversations: 12,
        totalMessages: 48,
        uniqueVisitors: 7,
        avgResponseTime: 3,
        knowledgeBaseSize: 5,
        averageRating: 4.5,
        satisfactionRate: 100,
        satisfactionSampleSize: 6,
        sentimentDistribution: { positive: 6, neutral: 0, negative: 0 },
      });
    });
  });
});
