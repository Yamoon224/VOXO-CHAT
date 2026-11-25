const openaiService = require('./openaiService');

const VALUES = new Set(['normal', 'important', 'urgent', 'critical']);

function conversationText(messages) {
  return (messages || []).filter(item => ['user', 'assistant', 'agent'].includes(item.role))
    .slice(-20).map(item => `${item.role}: ${String(item.content || '').slice(0, 800)}`).join('\n');
}

async function classify(messages) {
  if (!openaiService.isAvailable() || !conversationText(messages)) return null;
  const response = await openaiService.client.chat.completions.create({
    model: openaiService.defaultModel,
    messages: [{
      role: 'system',
      content: 'Classe l urgence opérationnelle de la conversation. Réponds uniquement en JSON: {"priority":"normal|important|urgent|critical","reason":"raison courte en français"}. Critique signifie danger immédiat, fraude, sécurité ou service vital bloqué; urgent exige une action rapide; important mérite une attention accrue; sinon normal.',
    }, { role: 'user', content: conversationText(messages) }],
    max_tokens: 100,
    temperature: 0,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(response.choices[0].message.content);
  if (!VALUES.has(parsed.priority)) return null;
  return { value: parsed.priority, reason: String(parsed.reason || '').slice(0, 500) || null };
}

module.exports = { classify, VALUES };
