jest.mock('sharp', () => jest.fn());
jest.mock('./imageGridService', () => ({ split: jest.fn() }));

const pdfjs = require('pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js');
const service = require('./pdfEmbeddedImageService');

describe('pdfEmbeddedImageService layout', () => {
  test('conserve la position des images dans la page', () => {
    const placements = service.imagePlacements({
      fnArray: [pdfjs.OPS.save, pdfjs.OPS.transform, pdfjs.OPS.paintImageXObject, pdfjs.OPS.restore],
      argsArray: [[], [100, 0, 0, 80, 20, 30], ['img1'], []],
    });
    expect(placements).toEqual([{ name: 'img1', bounds: { left: 20, right: 120, bottom: 30, top: 110 } }]);
  });

  test('associe seulement le texte spatialement proche', () => {
    const text = service.associatedText([
      { str: 'PC Pro', transform: [1, 0, 0, 1, 40, 25] },
      { str: 'Autre produit', transform: [1, 0, 0, 1, 500, 500] },
    ], { left: 20, right: 120, bottom: 30, top: 110 });
    expect(text).toBe('PC Pro');
  });
});
