const renderer = require('./pdfCatalogRenderer');

function documentWithPages(pageCount) {
  return {
    numPages: pageCount,
    getPage: jest.fn().mockImplementation(async pageNumber => ({
      getViewport: () => ({ width: 200, height: 200 }),
      render: () => ({ promise: Promise.resolve() }),
      getTextContent: async () => ({ items: [{ str: `Page ${pageNumber}` }] }),
      cleanup: jest.fn(),
    })),
    destroy: jest.fn().mockResolvedValue(undefined),
  };
}

describe('pdfCatalogRenderer', () => {
  test('confirme la disponibilitÃ© du moteur PDF.js/Canvas embarquÃ©', async () => {
    await expect(renderer.healthCheck()).resolves.toBe(true);
  });

  test('rend exactement les quatre pages réelles', async () => {
    const document = documentWithPages(4);
    const result = await renderer.render(Buffer.from('%PDF'), { document });
    expect(result.pageCount).toBe(4);
    expect(result.pages.map(page => page.pageNumber)).toEqual([1, 2, 3, 4]);
    expect(result.pages.every(page => page.buffer.length > 0)).toBe(true);
    expect(document.getPage).toHaveBeenCalledTimes(4);
  });

  test('refuse le PDF avant rendu lorsqu’il dépasse la limite', async () => {
    const document = documentWithPages(renderer.MAX_PAGES + 1);
    await expect(renderer.render(Buffer.from('%PDF'), { document }))
      .rejects.toMatchObject({ code: 'PDF_TOO_MANY_PAGES' });
    expect(document.getPage).not.toHaveBeenCalled();
  });
});
