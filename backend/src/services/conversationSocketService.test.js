// Intégration du canal conversation : serveur HTTP + `ws` réels, seule la
// couche base de données est simulée. Vérifie le trajet complet d'un aperçu de
// saisie, du widget jusqu'à l'inbox abonnée au même topic.
jest.mock('../models', () => ({ Tenant: { findOne: jest.fn() } }));
jest.mock('./conversationHandoffService', () => ({
  getConversation: jest.fn(),
  handoffView: conversation => ({ status: conversation.handoffStatus }),
}));

const http = require('http');
const { WebSocket } = require('ws');
const { Tenant } = require('../models');
const handoffService = require('./conversationHandoffService');
const events = require('./conversationEventService');
const { attachSocketRouter } = require('./socketRouterService');
const { registerConversationSockets } = require('./conversationSocketService');

const TENANT_ID = 'tenant-1';
const SESSION_ID = 'session-1';

let server;
let port;

function nextEvent(received, predicate) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('aucun événement reçu')), 2000);
    received.push(event => {
      if (!predicate(event)) return false;
      clearTimeout(timer);
      resolve(event);
      return true;
    });
  });
}

function openSocket({ appId, headers } = {}) {
  const query = `tenantId=${TENANT_ID}${appId ? `&appId=${appId}` : ''}`;
  const ws = new WebSocket(`ws://127.0.0.1:${port}/api/widget/conversation/${SESSION_ID}/socket?${query}`, { headers });
  const waiters = [];
  ws.on('message', raw => {
    const event = JSON.parse(raw);
    for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i](event)) waiters.splice(i, 1);
  });
  return { ws, waiters, opened: new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); }) };
}

beforeAll(done => {
  registerConversationSockets();
  server = http.createServer();
  attachSocketRouter(server);
  server.listen(0, '127.0.0.1', () => { port = server.address().port; done(); });
});

// `close` transmet un argument à son callback : on l'absorbe, sinon Jest le lit
// comme une erreur de teardown.
afterAll(done => {
  server.closeAllConnections();
  server.close(() => done());
});

beforeEach(() => {
  jest.clearAllMocks();
  Tenant.findOne.mockResolvedValue({
    id: TENANT_ID,
    settings: { chatbot: { options: { features: { liveTypingPreview: true } } } },
  });
  handoffService.getConversation.mockResolvedValue({ handoffStatus: 'human' });
});

it('relaie la saisie du widget vers les autres abonnés du même topic', async () => {
  const widget = openSocket();
  const inbox = openSocket();
  await Promise.all([widget.opened, inbox.opened]);

  const relayed = nextEvent(inbox.waiters, event => event.type === 'typing');
  widget.ws.send(JSON.stringify({ type: 'typing', text: 'je cherche ma facture' }));

  expect(await relayed).toMatchObject({ type: 'typing', role: 'user', text: 'je cherche ma facture' });
  widget.ws.close();
  inbox.ws.close();
});

it('annonce le statut de handoff dès la connexion', async () => {
  const inbox = openSocket();
  const sync = nextEvent(inbox.waiters, event => event.type === 'conversation.sync');
  await inbox.opened;

  expect(await sync).toEqual({ type: 'conversation.sync', handoff: { status: 'human' } });
  inbox.ws.close();
});

it('accepte la connexion quand la conversation n’existe pas encore, sans relayer de saisie', async () => {
  handoffService.getConversation.mockRejectedValue(new Error('Conversation introuvable'));
  const widget = openSocket();
  const inbox = openSocket();
  await Promise.all([widget.opened, inbox.opened]);

  const received = [];
  inbox.waiters.push(event => { received.push(event); return false; });
  widget.ws.send(JSON.stringify({ type: 'typing', text: 'invisible' }));
  await new Promise(resolve => setTimeout(resolve, 150));

  expect(received.filter(event => event.type === 'typing')).toHaveLength(0);
  widget.ws.close();
  inbox.ws.close();
});

it('refuse la connexion d’un tenant inconnu ou inactif', async () => {
  Tenant.findOne.mockResolvedValue(null);
  await expect(openSocket().opened).rejects.toThrow();
});

it('ne relaie plus la saisie une fois la conversation rendue à l’IA', async () => {
  const widget = openSocket();
  const inbox = openSocket();
  await Promise.all([widget.opened, inbox.opened]);

  const handoffBack = nextEvent(inbox.waiters, event => event.type === 'handoff');
  events.publish(TENANT_ID, SESSION_ID, { type: 'handoff', handoff: { status: 'ai' } });
  await handoffBack;

  const received = [];
  inbox.waiters.push(event => { received.push(event); return false; });
  widget.ws.send(JSON.stringify({ type: 'typing', text: 'invisible' }));
  await new Promise(resolve => setTimeout(resolve, 150));

  expect(received.filter(event => event.type === 'typing')).toHaveLength(0);
  widget.ws.close();
  inbox.ws.close();
});

describe('identifiant d’application (client natif, sans Origin)', () => {
  const withApps = overrides => Tenant.findOne.mockResolvedValue({
    id: TENANT_ID, settings: {}, allowedAppIds: ['com.exemple.app'], enforceAppIds: true, ...overrides,
  });

  it('accepte une application listée', async () => {
    withApps();
    const socket = openSocket({ appId: 'com.exemple.app' });
    await socket.opened;
    socket.ws.close();
  });

  it('refuse, en mode blocage, une application absente de la liste ou sans appId', async () => {
    withApps();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(openSocket({ appId: 'com.autre' }).opened).rejects.toThrow();
    await expect(openSocket().opened).rejects.toThrow();
    warn.mockRestore();
  });

  it('laisse passer en mode observation', async () => {
    withApps({ enforceAppIds: false });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const socket = openSocket({ appId: 'com.autre' });
    await socket.opened;
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    socket.ws.close();
  });

  it('ne touche pas une connexion de navigateur (Origin présent)', async () => {
    withApps();
    const socket = openSocket({ headers: { Origin: 'https://site.test' } });
    await socket.opened;
    socket.ws.close();
  });
});
