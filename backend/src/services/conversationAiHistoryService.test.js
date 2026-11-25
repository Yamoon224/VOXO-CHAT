const { toProviderHistory } = require('./conversationAiHistoryService');

describe('conversationAiHistoryService', () => {
  test('normalise les messages conseiller et exclut les notes internes', () => {
    expect(toProviderHistory([
      { role: 'user', content: 'Bonjour' },
      { role: 'agent', content: 'Nous avons du stock', metadata: { agentName: 'Awa' } },
      { role: 'internal_note', content: 'Ne pas partager' },
      { role: 'unknown', content: 'Ignoré' },
    ])).toEqual([
      { role: 'user', content: 'Bonjour' },
      { role: 'assistant', content: '[Réponse de Awa] Nous avons du stock' },
    ]);
  });
});
