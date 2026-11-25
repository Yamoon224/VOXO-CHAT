const { EventEmitter } = require('events');
const { getRedisClient, isRedisReady } = require('../config/redis');

const emitter = new EventEmitter();
emitter.setMaxListeners(0);
let publisher;
let subscriber;
const channels = new Map();

function ensureClients() {
  const client = getRedisClient();
  if (!client || publisher) return;
  publisher = client.duplicate();
  subscriber = client.duplicate();
  subscriber.on('message', (channel, raw) => {
    try { emitter.emit(channel, JSON.parse(raw)); } catch { /* message invalide ignore */ }
  });
  publisher.on('error', () => {});
  subscriber.on('error', () => {});
}

function publish(channel, event) {
  if (isRedisReady()) {
    ensureClients();
    if (publisher) return publisher.publish(channel, JSON.stringify(event)).catch(() => emitter.emit(channel, event));
  }
  emitter.emit(channel, event);
  return Promise.resolve();
}

function subscribe(channel, listener) {
  emitter.on(channel, listener);
  if (!channels.has(channel)) {
    channels.set(channel, 1);
    ensureClients();
    if (subscriber) subscriber.subscribe(channel).catch(() => {});
  } else channels.set(channel, channels.get(channel) + 1);
  return () => {
    emitter.off(channel, listener);
    const count = (channels.get(channel) || 1) - 1;
    if (count > 0) return channels.set(channel, count);
    channels.delete(channel);
    if (subscriber) subscriber.unsubscribe(channel).catch(() => {});
  };
}

module.exports = { publish, subscribe };
