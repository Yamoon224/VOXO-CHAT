const { sortMessages, conversationDuration } = require('./conversationChronologyService');

test('calcule la durée en secondes jusqu’à la fin ou la dernière activité', () => {
  expect(conversationDuration({ createdAt: '2026-08-15T10:00:00Z', endedAt: '2026-08-15T10:04:00Z' })).toBe(240);
  expect(conversationDuration({ createdAt: '2026-08-15T10:00:00Z', updatedAt: '2026-08-15T10:00:30Z' })).toBe(30);
  expect(conversationDuration({ createdAt: '2026-08-15T10:00:00Z' })).toBeNull();
  expect(conversationDuration({ createdAt: '2026-08-15T10:00:00Z', updatedAt: '2026-08-15T09:00:00Z' })).toBeNull();
});

test('trie chronologiquement sans déstabiliser les dates égales ou absentes', () => {
  const items = [
    { id: 'late', timestamp: '2026-08-15T12:00:00Z' },
    { id: 'early', timestamp: '2026-08-15T10:00:00Z' },
    { id: 'missing' },
    { id: 'equal', timestamp: '2026-08-15T12:00:00Z' },
  ];
  expect(sortMessages(items).map(item => item.id)).toEqual(['early', 'late', 'missing', 'equal']);
  expect(items.map(item => item.id)).toEqual(['late', 'early', 'missing', 'equal']);
});
