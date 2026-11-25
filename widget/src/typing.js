// Aperçu de saisie : diffuse le texte en cours de frappe vers le conseiller.
// N'émet que pendant une prise en charge humaine et si le tenant a activé
// l'option. Rien n'est stocké, ni côté widget ni côté serveur.
const INTERVAL_MS = 300;
const IDLE_MS = 3000;

export function createTypingEmitter(widget) {
  let lastSentAt = 0;
  let pendingTimer = null;
  let idleTimer = null;

  const push = text => {
    const socket = widget.conversationSocket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    if (!widget.config.options.features?.liveTypingPreview) return;
    if (widget.handoffStatus !== 'human') return;
    lastSentAt = Date.now();
    socket.send(JSON.stringify({ type: 'typing', text }));
  };

  const stopTyping = () => {
    clearTimeout(pendingTimer);
    clearTimeout(idleTimer);
    pendingTimer = idleTimer = null;
    push('');
  };

  const notifyTyping = text => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(stopTyping, IDLE_MS);
    const wait = INTERVAL_MS - (Date.now() - lastSentAt);
    if (wait <= 0) return push(text);
    // La dernière frappe d'une rafale doit partir malgré la temporisation,
    // sinon l'aperçu reste figé sur un texte incomplet.
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => push(text), wait);
  };

  return { notifyTyping, stopTyping };
}
