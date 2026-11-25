const satisfaction = require('./satisfactionStats');

const row = (sentiment, count) => ({ sentiment, count: String(count) });

describe('satisfactionStats.summarize', () => {
  test('computes the rate from known sentiments', () => {
    const result = satisfaction.summarize([
      row('positive', 8), row('neutral', 1), row('negative', 1),
    ]);

    expect(result).toMatchObject({
      distribution: { positive: 8, neutral: 1, negative: 1 },
      sampleSize: 10,
      rate: 80,
    });
  });

  /**
   * Régression du bug historique : le dénominateur additionnait TOUS les
   * libellés renvoyés par la base, y compris ceux que le numérateur ignorait.
   * Un libellé inattendu dégonflait donc silencieusement le taux.
   */
  test('an unknown label neither inflates the denominator nor the distribution', () => {
    const withUnknown = satisfaction.summarize([
      row('positive', 8), row('neutral', 1), row('negative', 1), row('POSITIVE', 40),
    ]);
    const without = satisfaction.summarize([
      row('positive', 8), row('neutral', 1), row('negative', 1),
    ]);

    expect(withUnknown).toEqual(without);
    expect(withUnknown.rate).toBe(80);
  });

  // Un `sentiment` nul remontait du JSON `null` que l'ancien filtre SQL
  // laissait passer ; il ne doit peser sur rien.
  test('a null sentiment is ignored entirely', () => {
    const result = satisfaction.summarize([row('positive', 5), row(null, 7)]);

    expect(result.sampleSize).toBe(5);
    expect(result.rate).toBe(100);
  });

  test('the distribution always sums to the sample size', () => {
    const { distribution, sampleSize } = satisfaction.summarize([
      row('positive', 3), row('neutral', 2), row('negative', 4), row('inconnu', 9),
    ]);

    const sum = distribution.positive + distribution.neutral + distribution.negative;
    expect(sum).toBe(sampleSize);
  });

  describe('seuil d’échantillon', () => {
    // Publier « 100 % » à partir d'un seul avis serait trompeur.
    test('returns no rate below the minimum sample size', () => {
      const result = satisfaction.summarize([row('positive', 1)]);

      expect(result.sampleSize).toBe(1);
      expect(result.rate).toBeNull();
    });

    test('publishes the rate once the sample is large enough', () => {
      const result = satisfaction.summarize([row('positive', satisfaction.MIN_SAMPLE_SIZE)]);

      expect(result.rate).toBe(100);
    });

    test('returns no rate at all when there is no data', () => {
      expect(satisfaction.summarize([])).toMatchObject({ sampleSize: 0, rate: null });
      expect(satisfaction.summarize()).toMatchObject({ sampleSize: 0, rate: null });
    });
  });
});

describe('satisfactionStats.averageRating', () => {
  test('rounds to one decimal', () => {
    expect(satisfaction.averageRating('4.26')).toBe(4.3);
  });

  // « Aucune note » et « moyenne de zéro » étaient indiscernables auparavant.
  test('distinguishes no rating from a zero average', () => {
    expect(satisfaction.averageRating(null)).toBeNull();
    expect(satisfaction.averageRating(undefined)).toBeNull();
    expect(satisfaction.averageRating('0')).toBe(0);
  });
});

describe('satisfactionStats — fragment SQL', () => {
  /**
   * Le filtre doit porter sur la valeur extraite. `IS NOT NULL` sur
   * `metadata->'feedbackSentiment'` ne détecte pas un JSON `null`, et
   * l'opérateur d'existence `?` pas davantage.
   */
  test('filters on the extracted value, not on key presence', () => {
    expect(satisfaction.SENTIMENT_FILTER).toContain("->>'sentiment'");
    expect(satisfaction.SENTIMENT_FILTER).toContain('IN (');
    expect(satisfaction.SENTIMENT_FILTER).not.toContain('IS NOT NULL');
  });

  test('restricts to the three known labels', () => {
    satisfaction.SENTIMENTS.forEach((label) => {
      expect(satisfaction.SENTIMENT_FILTER).toContain(`'${label}'`);
    });
  });
});
