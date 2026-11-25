import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createTypingEmitter } from '../src/typing.js';

function fakeWidget({ liveTypingPreview = true, handoffStatus = 'human', readyState = 1 } = {}) {
  const sent = [];
  return {
    sent,
    handoffStatus,
    config: { options: { features: { liveTypingPreview } } },
    conversationSocket: { readyState, send: raw => sent.push(JSON.parse(raw)) }
  };
}

// Horloge simulée calée sur un temps réaliste : démarrer à l'époque 0 ferait
// croire à l'émetteur qu'une frappe vient d'être envoyée.
function withTimers(run) {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_700_000_000_000 });
  try { run(); } finally { mock.timers.reset(); }
}

test('émet la saisie pendant une prise en charge humaine', () => {
  withTimers(() => {
    const widget = fakeWidget();
    createTypingEmitter(widget).notifyTyping('bonjour');
    assert.deepEqual(widget.sent, [{ type: 'typing', text: 'bonjour' }]);
  });
});

test('reste muet hors prise en charge humaine', () => {
  withTimers(() => {
    for (const handoffStatus of ['ai', 'waiting', 'ended']) {
      const widget = fakeWidget({ handoffStatus });
      createTypingEmitter(widget).notifyTyping('bonjour');
      assert.deepEqual(widget.sent, [], `statut ${handoffStatus}`);
    }
  });
});

test("reste muet quand l'option tenant est désactivée", () => {
  withTimers(() => {
    const widget = fakeWidget({ liveTypingPreview: false });
    createTypingEmitter(widget).notifyTyping('bonjour');
    assert.deepEqual(widget.sent, []);
  });
});

test('reste muet quand la socket est fermée', () => {
  withTimers(() => {
    const widget = fakeWidget({ readyState: 3 });
    createTypingEmitter(widget).notifyTyping('bonjour');
    assert.deepEqual(widget.sent, []);
  });
});

test('temporise la rafale sans perdre la dernière frappe', () => {
  withTimers(() => {
    const widget = fakeWidget();
    const emitter = createTypingEmitter(widget);
    emitter.notifyTyping('b');
    emitter.notifyTyping('bo');
    emitter.notifyTyping('bon');
    assert.deepEqual(widget.sent.map(item => item.text), ['b']);

    mock.timers.tick(300);
    assert.deepEqual(widget.sent.map(item => item.text), ['b', 'bon']);
  });
});

test('émet un arrêt après une inactivité prolongée', () => {
  withTimers(() => {
    const widget = fakeWidget();
    createTypingEmitter(widget).notifyTyping('bonjour');
    mock.timers.tick(3000);
    assert.deepEqual(widget.sent.map(item => item.text), ['bonjour', '']);
  });
});

test('stopTyping annule la frappe en attente et signale la fin', () => {
  withTimers(() => {
    const widget = fakeWidget();
    const emitter = createTypingEmitter(widget);
    emitter.notifyTyping('bon');
    emitter.notifyTyping('bonjo');
    emitter.stopTyping();
    mock.timers.tick(5000);
    assert.deepEqual(widget.sent.map(item => item.text), ['bon', '']);
  });
});
