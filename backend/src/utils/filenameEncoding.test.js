const { normalizeFilenameEncoding } = require('./filenameEncoding');

describe('normalizeFilenameEncoding', () => {
  test.each([
    ['ordinateurs.pdf', 'ordinateurs.pdf'],
    ["Capture d'Ã©cran.png", "Capture d'écran.png"],
    ['AperÃƒÂ§u.pdf', 'Aperçu.pdf'],
    ['Offre â€“ aoÃ»t.pdf', 'Offre – août.pdf'],
    ['Lâ€™offre spÃ©ciale.pdf', 'L’offre spéciale.pdf'],
  ])('normalise %s', (input, expected) => {
    expect(normalizeFilenameEncoding(input)).toBe(expected);
  });

  test('préserve un nom légitime et normalise sa forme Unicode', () => {
    expect(normalizeFilenameEncoding('Ãrvore.pdf')).toBe('Ãrvore.pdf');
    expect(normalizeFilenameEncoding('e\u0301cran.pdf')).toBe('écran.pdf');
  });

  test('est idempotent', () => {
    const repaired = normalizeFilenameEncoding("Capture d'Ã©cran.png");
    expect(normalizeFilenameEncoding(repaired)).toBe(repaired);
  });
});
