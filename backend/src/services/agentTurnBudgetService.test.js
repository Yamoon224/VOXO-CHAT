jest.mock('../config/config', () => ({ agentAction: { maxTokensPerTurn: 1000 } }));

const { create, estimateInputTokens } = require('./agentTurnBudgetService');

describe('agentTurnBudgetService', () => {
  test('estimates message and tool payloads conservatively', () => {
    expect(estimateInputTokens([{ role: 'user', content: 'hello' }], [{ type: 'function' }])).toBeGreaterThan(10);
  });

  test('reduces an intermediate output while preserving the reserved final response', () => {
    const budget = create();
    const prepared = budget.prepareCall({ messages: [{ role: 'user', content: 'x'.repeat(1000) }], desiredOutputTokens: 512, reservedTokens: 256 });
    expect(prepared.maxOutputTokens).toBeGreaterThan(0);
    expect(prepared.maxOutputTokens).toBeLessThan(512);
  });

  test('tracks provider usage separately from the estimate', () => {
    const budget = create();
    const prepared = budget.prepareCall({ messages: [], desiredOutputTokens: 100, reservedTokens: 0 });
    budget.recordCompletion({ usage: { total_tokens: 42 } }, prepared);
    expect(budget.summary()).toMatchObject({ tokensUsed: 42, llmCalls: 1 });
  });
});
