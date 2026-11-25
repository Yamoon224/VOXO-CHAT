jest.mock('../config/config', () => ({ agentAction: {
  maxToolIterations: 2, maxTokensPerTurn: 6000, reservedFinalTokens: 512,
  reservedCorrectionTokens: 256, maxToolCallsPerTurn: 4, maxToolResultChars: 4096,
} }));
jest.mock('./agentActionService', () => ({ listActiveByTenant: jest.fn() }));
jest.mock('./agentToolExecutorService', () => ({ execute: jest.fn() }));

const config = require('../config/config');
const agentActionService = require('./agentActionService');
const agentToolExecutorService = require('./agentToolExecutorService');
const { BUDGET_FALLBACK, loadTools, runWithTools } = require('./agentToolLoopService');

const tool = { type: 'function', function: { name: 'check_order_status' } };
const action = { name: 'check_order_status' };
const answer = content => ({ choices: [{ message: { content } }], usage: { total_tokens: 20 } });
const toolCall = id => ({ choices: [{ message: { tool_calls: [{ id, function: { name: 'check_order_status', arguments: '{}' } }] } }], usage: { total_tokens: 20 } });

describe('agentToolLoopService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(config.agentAction, { maxToolIterations: 2, maxTokensPerTurn: 6000, reservedFinalTokens: 512, reservedCorrectionTokens: 256, maxToolCallsPerTurn: 4 });
  });

  test('does not load tools when the tenant has not enabled the feature', async () => {
    const result = await loadTools('tenant-1', { chatbot: { options: { features: { agentActions: false } } } });
    expect(result.tools).toBeUndefined();
    expect(agentActionService.listActiveByTenant).not.toHaveBeenCalled();
  });

  test('returns an answered stop reason without a tool call', async () => {
    const callCompletion = jest.fn().mockResolvedValue(answer('Réponse directe'));
    const result = await runWithTools({ messages: [{ role: 'user', content: 'bonjour' }], tools: [tool], actionsByName: new Map(), callCompletion });
    expect(result).toMatchObject({ content: 'Réponse directe', tokensUsed: 20, stopReason: 'answered', toolCalls: 0, llmCalls: 1 });
    expect(callCompletion).toHaveBeenCalledWith(expect.any(Array), [tool], expect.objectContaining({ maxOutputTokens: 1000 }));
  });

  test('executes a tool and feeds its result back to the final text call', async () => {
    agentToolExecutorService.execute.mockResolvedValue({ success: true, data: { status: 'shipped' } });
    const callCompletion = jest.fn().mockResolvedValueOnce(toolCall('call-1')).mockResolvedValueOnce(answer('Commande expédiée'));
    const result = await runWithTools({ messages: [], tools: [tool], actionsByName: new Map([[action.name, action]]), callCompletion });
    expect(agentToolExecutorService.execute).toHaveBeenCalledWith(action, {});
    expect(callCompletion).toHaveBeenLastCalledWith(expect.any(Array), [tool], expect.any(Object));
    expect(result).toMatchObject({ content: 'Commande expédiée', stopReason: 'answered', toolCalls: 1, llmCalls: 2 });
  });

  test('enforces the total tool-call limit and returns tool errors for excess calls', async () => {
    config.agentAction.maxToolCallsPerTurn = 1;
    agentToolExecutorService.execute.mockResolvedValue({ success: true });
    const first = { choices: [{ message: { tool_calls: [
      { id: 'one', function: { name: action.name, arguments: '{}' } },
      { id: 'two', function: { name: action.name, arguments: '{}' } },
    ] } }], usage: { total_tokens: 10 } };
    const callCompletion = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(answer('Réponse finale'));
    const result = await runWithTools({ messages: [], tools: [tool], actionsByName: new Map([[action.name, action]]), callCompletion });
    expect(agentToolExecutorService.execute).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ stopReason: 'max_tool_calls', toolCalls: 1 });
    const toolMessages = callCompletion.mock.calls[1][0].filter(message => message.role === 'tool');
    expect(JSON.parse(toolMessages[1].content)).toEqual({ success: false, error: 'tool_call_limit_reached' });
  });

  test('falls back without a final LLM call when even the final reserve is unsafe', async () => {
    config.agentAction.maxTokensPerTurn = 1024;
    config.agentAction.reservedFinalTokens = 512;
    config.agentAction.reservedCorrectionTokens = 256;
    const callCompletion = jest.fn();
    const result = await runWithTools({ messages: [{ role: 'user', content: 'x'.repeat(5000) }], tools: [tool], actionsByName: new Map(), callCompletion });
    expect(result).toMatchObject({ content: BUDGET_FALLBACK, stopReason: 'fallback_no_budget', llmCalls: 0 });
    expect(callCompletion).not.toHaveBeenCalled();
  });
});
