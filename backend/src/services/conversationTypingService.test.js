jest.mock('./conversationEventService', () => ({ publish: jest.fn() }));

const events = require('./conversationEventService');
const service = require('./conversationTypingService');

const CONTEXT = { tenantId: 'tenant-1', sessionId: 'session-1' };

function fakeSocket() {
  const handlers = {};
  return {
    on: (name, handler) => { handlers[name] = handler; },
    send: raw => handlers.message(Buffer.from(raw)),
  };
}

function attach(state) {
  const ws = fakeSocket();
  service.attachTypingInbound(ws, CONTEXT, state);
  return ws;
}

const humanState = () => service.createTypingState('human', true);
const typingFrame = (text = 'bonjour') => JSON.stringify({ type: 'typing', text });

describe('conversationTypingService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('diffuse la saisie pendant une prise en charge humaine', () => {
    attach(humanState()).send(typingFrame('bonj'));
    expect(events.publish).toHaveBeenCalledWith('tenant-1', 'session-1', expect.objectContaining({
      type: 'typing', role: 'user', text: 'bonj',
    }));
  });

  it('ne diffuse jamais un événement porteur de message, pour ne pas déclencher la priorisation', () => {
    attach(humanState()).send(typingFrame());
    expect(events.publish.mock.calls[0][2]).not.toHaveProperty('message');
  });

  it('refuse la diffusion hors prise en charge humaine', () => {
    for (const status of ['ai', 'waiting', 'ended', null]) {
      attach(service.createTypingState(status, true)).send(typingFrame());
    }
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("refuse la diffusion quand le tenant n'a pas activé l'option", () => {
    attach(service.createTypingState('human', false)).send(typingFrame());
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('tronque le texte au-delà de la limite', () => {
    attach(humanState()).send(typingFrame('a'.repeat(service.MAX_TEXT_LENGTH + 50)));
    expect(events.publish.mock.calls[0][2].text).toHaveLength(service.MAX_TEXT_LENGTH);
  });

  it('ignore les trames non conformes', () => {
    const ws = attach(humanState());
    ws.send('pas du json');
    ws.send(JSON.stringify({ type: 'message', text: 'coucou' }));
    ws.send(JSON.stringify({ type: 'typing', text: { injection: true } }));
    ws.send(JSON.stringify({ type: 'typing' }));
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('ignore une trame surdimensionnée', () => {
    attach(humanState()).send(typingFrame('a'.repeat(5000)));
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('limite la cadence par socket', () => {
    const now = jest.spyOn(Date, 'now');
    const ws = attach(humanState());
    now.mockReturnValue(1000);
    ws.send(typingFrame('a'));
    now.mockReturnValue(1000 + service.MIN_INTERVAL_MS - 1);
    ws.send(typingFrame('ab'));
    expect(events.publish).toHaveBeenCalledTimes(1);
    now.mockReturnValue(1000 + service.MIN_INTERVAL_MS);
    ws.send(typingFrame('abc'));
    expect(events.publish).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });

  it('suit le statut de handoff qui transite sur le canal', () => {
    const state = service.createTypingState('ai', true);
    const ws = attach(state);
    ws.send(typingFrame());
    expect(events.publish).not.toHaveBeenCalled();

    service.trackHandoff(state, { type: 'handoff', handoff: { status: 'human' } });
    ws.send(typingFrame());
    expect(events.publish).toHaveBeenCalledTimes(1);

    service.trackHandoff(state, { type: 'handoff', handoff: { status: 'ai' } });
    ws.send(typingFrame());
    expect(events.publish).toHaveBeenCalledTimes(1);
  });

  it('laisse le statut inchangé sur un événement sans handoff', () => {
    const state = service.createTypingState('human', true);
    service.trackHandoff(state, { type: 'message', message: { role: 'user' } });
    expect(state.handoffStatus).toBe('human');
  });
});
