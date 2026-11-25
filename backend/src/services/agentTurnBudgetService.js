const config = require('../config/config');

const SAFETY_MARGIN_RATIO = 0.2;

function serializedLength(value) {
  try { return JSON.stringify(value || '').length; } catch { return String(value || '').length; }
}

function estimateInputTokens(messages, tools) {
  const messageTokens = (messages || []).reduce((total, message) => total + Math.ceil(serializedLength(message) / 3) + 12, 0);
  return messageTokens + (tools ? Math.ceil(serializedLength(tools) / 3) : 0);
}

function usageTokens(completion) {
  return Number.isFinite(completion?.usage?.total_tokens) ? completion.usage.total_tokens : 0;
}

function create() {
  const settings = config.agentAction;
  let tokensUsed = 0;
  let estimatedTokens = 0;
  let llmCalls = 0;

  function prepareCall({ messages, tools, desiredOutputTokens, minimumOutputTokens = 1, reservedTokens = 0 }) {
    const inputTokens = estimateInputTokens(messages, tools);
    const availableWithoutOutput = settings.maxTokensPerTurn - tokensUsed - inputTokens - reservedTokens;
    const maxOutputTokens = Math.min(
      desiredOutputTokens,
      Math.floor((availableWithoutOutput - Math.ceil(inputTokens * SAFETY_MARGIN_RATIO)) / (1 + SAFETY_MARGIN_RATIO)),
    );
    if (maxOutputTokens < minimumOutputTokens) return null;
    const safetyMargin = Math.ceil((inputTokens + maxOutputTokens) * SAFETY_MARGIN_RATIO);
    return { inputTokens, maxOutputTokens, estimatedCost: inputTokens + maxOutputTokens + safetyMargin };
  }

  function recordCompletion(completion, prepared) {
    tokensUsed += usageTokens(completion);
    estimatedTokens += prepared.estimatedCost;
    llmCalls += 1;
  }

  function summary() {
    return { tokensUsed, estimatedTokens, estimateDrift: tokensUsed - estimatedTokens, llmCalls, maxTokensPerTurn: settings.maxTokensPerTurn };
  }

  return { prepareCall, recordCompletion, summary };
}

module.exports = { create, estimateInputTokens, usageTokens };
