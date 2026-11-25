const { knowledgeValidators } = require('./knowledgeValidators');

describe('createFromUrlSchema', () => {
  test.each([
    [{ url: 'https://example.com' }, undefined],
    [{ url: 'https://example.com', title: '' }, undefined],
    [{ url: 'https://example.com', title: '   ' }, undefined],
    [{ url: 'https://example.com', title: ' Titre personnalisé ' }, 'Titre personnalisé'],
  ])('normalizes an optional title in %p', (payload, expectedTitle) => {
    const { error, value } = knowledgeValidators.createFromUrlSchema.validate(payload);

    expect(error).toBeUndefined();
    expect(value.title).toBe(expectedTitle);
  });
});
