const service = require('./imageGridService');

describe('imageGridService helpers', () => {
  test('détecte uniquement les bandes blanches assez larges', () => {
    expect(service.separatorBands(
      [false, true, true, false, true, false, true, true, true, false], 2
    )).toEqual([[1, 3], [6, 9]]);
  });

  test('construit des intervalles de contenu suffisamment grands', () => {
    expect(service.contentIntervals(100, [[30, 35], [65, 70]])).toEqual([
      [0, 30], [35, 65], [70, 100],
    ]);
  });
});
