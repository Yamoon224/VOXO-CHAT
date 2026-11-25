const { Op } = require('sequelize');
const { AgentTurnUsage } = require('../models');

const DAY_MS = 24 * 60 * 60 * 1000;

function periodStart(days) { return new Date(Date.now() - (days - 1) * DAY_MS); }

function parseQuery(query = {}) {
  const days = [7, 30, 90].includes(Number(query.days)) ? Number(query.days) : 30;
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || 20));
  return { days, page, pageSize, start: periodStart(days) };
}

function summaryFrom(rows) {
  return rows.reduce((summary, row) => ({
    tokensUsed: summary.tokensUsed + row.tokensUsed,
    estimatedTokens: summary.estimatedTokens + row.estimatedTokens,
    llmCalls: summary.llmCalls + row.llmCalls,
    toolCalls: summary.toolCalls + row.toolCalls,
    limitedTurns: summary.limitedTurns + (row.stopReason === 'answered' ? 0 : 1),
    fallbackTurns: summary.fallbackTurns + (row.stopReason === 'fallback_no_budget' ? 1 : 0),
  }), { tokensUsed: 0, estimatedTokens: 0, llmCalls: 0, toolCalls: 0, limitedTurns: 0, fallbackTurns: 0 });
}

async function report(tenantId, query) {
  const { days, page, pageSize, start } = parseQuery(query);
  const where = { tenantId, createdAt: { [Op.gte]: start } };
  const [allRows, history] = await Promise.all([
    AgentTurnUsage.findAll({ where, attributes: ['tokensUsed', 'estimatedTokens', 'llmCalls', 'toolCalls', 'stopReason', 'createdAt'], order: [['createdAt', 'ASC']] }),
    AgentTurnUsage.findAndCountAll({ where, order: [['createdAt', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize }),
  ]);
  const daily = new Map();
  allRows.forEach(row => {
    const day = row.createdAt.toISOString().slice(0, 10);
    const current = daily.get(day) || { date: day, tokensUsed: 0, toolCalls: 0, turns: 0 };
    current.tokensUsed += row.tokensUsed;
    current.toolCalls += row.toolCalls;
    current.turns += 1;
    daily.set(day, current);
  });
  return {
    days, summary: summaryFrom(allRows), daily: [...daily.values()],
    history: history.rows.map(row => ({ id: row.id, tokensUsed: row.tokensUsed, estimatedTokens: row.estimatedTokens, llmCalls: row.llmCalls, toolCalls: row.toolCalls, stopReason: row.stopReason, correctionSkipped: row.correctionSkipped, createdAt: row.createdAt })),
    pagination: { page, pageSize, total: history.count },
  };
}

async function record(tenantId, usage) {
  return AgentTurnUsage.create({ tenantId, tokensUsed: usage.tokensUsed || 0, estimatedTokens: usage.estimatedTokens || 0, llmCalls: usage.llmCalls || 0, toolCalls: usage.toolCalls || 0, stopReason: usage.stopReason || 'answered', correctionSkipped: Boolean(usage.correctionSkipped) });
}

async function purgeExpired() {
  return AgentTurnUsage.destroy({ where: { createdAt: { [Op.lt]: periodStart(91) } } });
}

module.exports = { parseQuery, report, record, purgeExpired };
