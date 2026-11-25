const config = require('../config/config');
const agentActionService = require('./agentActionService');
const agentToolExecutorService = require('./agentToolExecutorService');
const agentTurnBudgetService = require('./agentTurnBudgetService');

const BUDGET_FALLBACK = "Désolé, je ne peux pas traiter cette demande de façon fiable pour le moment. Veuillez réessayer plus tard.";

function toOpenAiTools(actions) {
  return actions.map(action => ({ type: 'function', function: {
    name: action.name, description: action.description, parameters: action.parametersSchema,
  } }));
}

async function loadTools(tenantId, tenantSettings) {
  if (tenantSettings?.chatbot?.options?.features?.agentActions !== true) {
    return { tools: undefined, actionsByName: new Map() };
  }
  const actions = await agentActionService.listActiveByTenant(tenantId);
  if (!actions.length) return { tools: undefined, actionsByName: new Map() };
  return { tools: toOpenAiTools(actions), actionsByName: new Map(actions.map(action => [action.name, action])) };
}

async function resolveToolCalls(toolCalls, actionsByName, remainingCalls, tenantId) {
  const messages = [];
  let executed = 0;
  for (const call of toolCalls) {
    const action = actionsByName.get(call.function.name);
    let args = {};
    try { args = JSON.parse(call.function.arguments || '{}'); } catch { args = {}; }
    let toolResult;
    if (!action) toolResult = { success: false, error: 'unknown_tool' };
    else if (executed >= remainingCalls) toolResult = { success: false, error: 'tool_call_limit_reached' };
    else {
      toolResult = await agentToolExecutorService.execute(action, args);
      executed += 1;
      console.info('agent_tool_execution', { tenantId, actionName: action.name });
    }
    messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(toolResult) });
  }
  return { messages, executed };
}

function finish(content, budget, stopReason, toolCalls, tenantId) {
  const summary = budget.summary();
  console.info('agent_turn_budget', { ...summary, tenantId, stopReason, toolCalls });
  return { content, tokensUsed: summary.tokensUsed, stopReason, toolCalls, llmCalls: summary.llmCalls, budget };
}

async function runWithTools({ messages, tools, actionsByName, callCompletion, tenantId, budget = agentTurnBudgetService.create(), maxOutputTokens = 1000 }) {
  const conversation = [...messages];
  let toolCalls = 0;
  let stopReason = 'max_iterations';

  for (let iteration = 0; iteration < config.agentAction.maxToolIterations; iteration += 1) {
    const prepared = budget.prepareCall({
      messages: conversation,
      tools,
      desiredOutputTokens: maxOutputTokens,
      reservedTokens: config.agentAction.reservedFinalTokens + config.agentAction.reservedCorrectionTokens,
    });
    if (!prepared) { stopReason = 'token_budget'; break; }

    const completion = await callCompletion(conversation, tools, { maxOutputTokens: prepared.maxOutputTokens });
    budget.recordCompletion(completion, prepared);
    const choice = completion.choices[0].message;
    if (!choice.tool_calls?.length) return finish(choice.content, budget, 'answered', toolCalls, tenantId);

    conversation.push(choice);
    const resolved = await resolveToolCalls(choice.tool_calls, actionsByName, config.agentAction.maxToolCallsPerTurn - toolCalls, tenantId);
    toolCalls += resolved.executed;
    conversation.push(...resolved.messages);
    if (toolCalls >= config.agentAction.maxToolCallsPerTurn) {
      stopReason = 'max_tool_calls';
      break;
    }
  }

  const finalPrepared = budget.prepareCall({
    messages: conversation,
    desiredOutputTokens: config.agentAction.reservedFinalTokens,
    minimumOutputTokens: config.agentAction.reservedFinalTokens,
    reservedTokens: config.agentAction.reservedCorrectionTokens,
  });
  if (!finalPrepared) return finish(BUDGET_FALLBACK, budget, 'fallback_no_budget', toolCalls, tenantId);

  const finalCompletion = await callCompletion(conversation, undefined, { maxOutputTokens: finalPrepared.maxOutputTokens });
  budget.recordCompletion(finalCompletion, finalPrepared);
  return finish(finalCompletion.choices[0].message.content, budget, stopReason, toolCalls, tenantId);
}

module.exports = { BUDGET_FALLBACK, loadTools, runWithTools, resolveToolCalls };
