const ALLOWED_ROLES = new Set(['user', 'assistant', 'system']);

/** Convertit l'historique interne au format strict attendu par les fournisseurs IA. */
function toProviderHistory(messages = []) {
  return messages
    .filter(message => message?.role !== 'internal_note')
    .map(message => {
      if (message.role === 'agent') {
        const name = message.metadata?.agentName || 'un conseiller';
        return { role: 'assistant', content: `[Réponse de ${name}] ${message.content}` };
      }
      return { role: message.role, content: message.content };
    })
    .filter(message => ALLOWED_ROLES.has(message.role) && typeof message.content === 'string' && message.content.trim());
}

module.exports = { toProviderHistory, ALLOWED_ROLES };
