const events = require('./conversationEventService');

// Aperçu de saisie du visiteur : le texte en cours de frappe ne transite que sur
// le canal temps réel de la conversation. Il n'est jamais écrit en base ni
// journalisé, et n'est diffusé que pendant une prise en charge humaine.
const MAX_TEXT_LENGTH = 500;
const MIN_INTERVAL_MS = 200;
const MAX_FRAME_BYTES = 2048;

function createTypingState(handoffStatus, typingEnabled) {
  return { typingEnabled: typingEnabled === true, handoffStatus: handoffStatus || null, lastEmittedAt: 0 };
}

// Le statut de handoff arrive déjà sur le topic de la conversation : on le suit
// en mémoire plutôt que d'interroger la base à chaque frappe.
function trackHandoff(state, event) {
  if (event?.handoff?.status) state.handoffStatus = event.handoff.status;
}

function accepts(state, raw, now) {
  if (!state.typingEnabled || state.handoffStatus !== 'human') return false;
  if (raw.length > MAX_FRAME_BYTES) return false;
  return now - state.lastEmittedAt >= MIN_INTERVAL_MS;
}

function readTypingText(raw) {
  let payload;
  try { payload = JSON.parse(raw); } catch { return null; }
  if (payload?.type !== 'typing' || typeof payload.text !== 'string') return null;
  return payload.text.slice(0, MAX_TEXT_LENGTH);
}

function attachTypingInbound(ws, context, state) {
  ws.on('message', raw => {
    const now = Date.now();
    // Les trames refusées sont ignorées en silence : un client qui inonde ne
    // doit ni remonter d'erreur exploitable ni atteindre le bus d'événements.
    if (!accepts(state, raw, now)) return;
    const text = readTypingText(raw);
    if (text === null) return;
    state.lastEmittedAt = now;
    events.publish(context.tenantId, context.sessionId, {
      type: 'typing', role: 'user', text, at: new Date().toISOString()
    });
  });
}

module.exports = { createTypingState, trackHandoff, attachTypingInbound, MAX_TEXT_LENGTH, MIN_INTERVAL_MS };
