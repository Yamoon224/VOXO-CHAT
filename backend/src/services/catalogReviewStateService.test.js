const service = require('./catalogReviewStateService');

describe('catalogReviewStateService', () => {
  test.each([
    ['new', 'save', 'saved'],
    ['new', 'validate', 'validated'],
    ['saved', 'save', 'saved'],
    ['saved', 'validate', 'validated'],
    ['validated', 'reopen', 'saved'],
  ])('%s + %s devient %s', (reviewStatus, action, expected) => {
    const result = service.transitionMetadata({ reviewStatus }, action, 'user-a', new Date(0));
    expect(result).toMatchObject({ reviewStatus: expected, reviewRequired: action !== 'validate' });
    expect(result.reviewHistory).toEqual([expect.objectContaining({
      action, from: reviewStatus, to: expected, userId: 'user-a',
    })]);
  });

  test('refuse de retraiter une fiche validée sans réouverture', () => {
    expect(() => service.transitionMetadata({ reviewStatus: 'validated' }, 'save', 'user-a'))
      .toThrow(expect.objectContaining({ code: 'PRODUCT_ALREADY_VALIDATED' }));
    expect(() => service.transitionMetadata({ reviewStatus: 'validated' }, 'validate', 'user-a'))
      .toThrow(expect.objectContaining({ code: 'PRODUCT_ALREADY_VALIDATED' }));
  });

  test('limite l historique aux vingt derniers événements', () => {
    const reviewHistory = Array.from({ length: 20 }, (_, index) => ({ action: `old-${index}` }));
    const result = service.transitionMetadata({ reviewStatus: 'saved', reviewHistory }, 'save', 'user-a');
    expect(result.reviewHistory).toHaveLength(20);
    expect(result.reviewHistory[0]).toEqual({ action: 'old-1' });
  });

  test('déduit les anciens états sans migration', () => {
    expect(service.statusOf({ validatedAt: 'date', validatedBy: 'user' })).toBe('validated');
    expect(service.statusOf({ manuallyCorrected: true, reviewRequired: true })).toBe('saved');
    expect(service.statusOf({ reviewRequired: false })).toBe('new');
  });
});
