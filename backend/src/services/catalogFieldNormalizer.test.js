const service = require('./catalogFieldNormalizer');

describe('catalogFieldNormalizer', () => {
  test.each([
    ['84 900 FCFA', 84900],
    ['Prix : 1 995 900 F CFA', 1995900],
    ['649.900 CFA', 649900],
  ])('normalise le prix courant %s', (text, amount) => {
    expect(service.priceFromText(text)).toEqual({ amount, currency: 'XOF' });
  });

  test('écarte les fragments OCR comme titres', () => {
    for (const value of ['=', '-', ' :_ ', '()']) expect(service.meaningfulTitle(value)).toBeNull();
  });

  test('normalise une fiche structurée sans inventer de référence', () => {
    const product = service.normalizeProduct({
      title: 'ASUS Zenbook S OLED',
      sku: null,
      priceAmount: 649900,
      priceCurrency: 'FCFA',
      confidence: { title: 0.95, price: 0.98 },
      specifications: [{ name: 'Mémoire', value: '16 GB DDR5' }],
    }, { ocrText: '', minimumConfidence: 0.75 });
    expect(product).toMatchObject({
      title: 'ASUS Zenbook S OLED', sku: null,
      priceAmount: 649900, priceCurrency: 'XOF', reviewRequired: false,
    });
  });

  test('retrouve les cas Canon et MSI dans un OCR local', () => {
    expect(service.fallbackTitle('Imprimante Canon Pixma TS5340 - WIFI-Copie-Scanner\n84 900 FCFA'))
      .toContain('Canon Pixma TS5340');
    expect(service.fallbackTitle('PC Portable Gaming MSI Pulse 16 AI C1VGKG-010FR\n1 995 900 FCFA'))
      .toContain('MSI Pulse 16 AI C1VGKG-010FR');
  });

  test('rejette un fragment de prix barré pris pour une référence', () => {
    const ocr = 'Imprimante Canon Pixma TS5340\n95 000 FCFA\nMarque & Modèle : Canon Pixma TS5340';
    expect(service.normalizeSku('s5-666-rera', 'Imprimante Canon Pixma TS5340', ocr)).toBe('TS5340');
    expect(service.normalizeSku('C1VGKG-010FR', 'MSI Pulse 16 AI C1VGKG-010FR', '')).toBe('C1VGKG-010FR');
    expect(service.normalizeSku('Zenbook', 'ASUS Zenbook S OLED', '')).toBeNull();
  });

  test('dÃ©duit une rÃ©fÃ©rence longue explicitement visible dans le titre', () => {
    expect(service.normalizeSku(
      null,
      'PC Portable Gaming MSI Pulse 16 AI C1VGKG-010FR',
      'PC Portable Gaming MSI Pulse 16 AI C1VGKG-010FR'
    )).toBe('C1VGKG-010FR');
    expect(service.normalizeSku(
      'CIVGKG-010FR',
      'MSI Pulse 16 AI CIVGKG-010FR',
      'Marque et modÃ¨le : MSI Pulse 16 AI CIVGKG-010FR'
    )).toBe('C1VGKG-010FR');
  });
});
