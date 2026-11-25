const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  jest.resetModules();
});

describe('agent action budget configuration', () => {
  test('uses safe defaults for invalid values', () => {
    process.env.AGENT_ACTION_MAX_TOKENS_PER_TURN = 'invalid';
    process.env.AGENT_ACTION_RESERVED_FINAL_TOKENS = 'invalid';
    process.env.AGENT_ACTION_RESERVED_CORRECTION_TOKENS = 'invalid';
    jest.resetModules();
    const config = require('./config');
    expect(config.agentAction).toMatchObject({
      maxTokensPerTurn: 6000,
      reservedFinalTokens: 512,
      reservedCorrectionTokens: 256,
    });
  });

  test('caps reserves so their sum cannot exceed the turn budget', () => {
    process.env.AGENT_ACTION_MAX_TOKENS_PER_TURN = '1024';
    process.env.AGENT_ACTION_RESERVED_FINAL_TOKENS = '9999';
    process.env.AGENT_ACTION_RESERVED_CORRECTION_TOKENS = '9999';
    jest.resetModules();
    const config = require('./config');
    const budget = config.agentAction;
    expect(budget.reservedFinalTokens + budget.reservedCorrectionTokens).toBeLessThanOrEqual(budget.maxTokensPerTurn);
  });
});
