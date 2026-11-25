import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { WIDGET_CSS } from '../src/styles.js';

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://client.test/' });
  Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true, writable: true },
    document: { value: dom.window.document, configurable: true, writable: true },
    navigator: { value: dom.window.navigator, configurable: true },
    localStorage: { value: dom.window.localStorage, configurable: true, writable: true },
    Element: { value: dom.window.Element, configurable: true, writable: true },
    CSSStyleSheet: { value: dom.window.CSSStyleSheet, configurable: true, writable: true },
    requestAnimationFrame: { value: callback => callback(), configurable: true, writable: true }
  });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  dom.window.fetch = async () => ({ ok: true, json: async () => ({ success: true, data: {} }) });
  globalThis.fetch = dom.window.fetch;
  return dom;
}

async function createWidget(overrides = {}, beforeInit = null) {
  const { ChatBotWidget } = await import('../src/widget.js');
  const widget = new ChatBotWidget({
    tenantId: 'tenant-test',
    apiUrl: 'https://api.test/api',
    name: 'VOXO Support',
    welcomeMessage: 'Bonjour depuis VOXO',
    ...overrides
  });
  widget.api.getTenantSettings = async () => ({ success: true, data: { chatbot: {} } });
  widget.api.getQuickReplies = async () => ({ success: true, data: { suggestions: ['Tarifs'] } });
  widget.api.sendMessage = async () => ({
    success: true,
    data: {
      sessionId: widget.sessionId,
      response: 'Réponse VOXO',
      suggestions: [],
      userMessageId: '11111111-1111-4111-8111-111111111111',
      assistantMessageId: '22222222-2222-4222-8222-222222222222'
    }
  });
  widget.api.sendMessageFeedback = async () => ({ success: true, data: {} });
  widget.api.endConversation = async () => ({ success: true, data: { status: 'ended' } });
  widget.api.endConversationForInactivity = async () => ({ success: true, data: { status: 'ended' } });
  widget.api.healthCheck = async () => ({ success: true, data: { status: 'healthy' } });
  beforeInit?.(widget);
  await widget.init();
  return widget;
}

test('mounts the three view states inside one open shadow root', async () => {
  const dom = installDom();
  const widget = await createWidget();
  const host = document.getElementById('voxo-chat');

  assert.equal(host.parentElement, document.body);
  assert.ok(host.shadowRoot);
  assert.equal(widget.chatWindow.getAttribute('role'), 'dialog');
  assert.equal(widget.chatWindow.getAttribute('aria-modal'), 'false');
  assert.equal(widget.messages[0].metadata.isWelcome, true);
  assert.equal(widget.messagesContainer.querySelectorAll('.vx-suggestions button').length, 1);

  widget.open();
  assert.equal(widget.chatWindow.dataset.view, 'prechat');
  widget.setUserInfo('Ada Lovelace', 'ada@example.com');
  assert.equal(widget.chatWindow.dataset.view, 'chat');
  widget.minimize();
  assert.equal(widget.chatWindow.dataset.minimized, 'true');

  widget.destroy();
  dom.window.close();
});

test('does not request history for a fresh serverless session', async () => {
  const dom = installDom();
  const widget = await createWidget({}, instance => {
    instance.connectConversationSocket = () => {};
  });
  let historyCalls = 0;
  widget.api.getConversationHistory = async () => {
    historyCalls++;
    return { success: true, data: { messages: [] } };
  };

  widget.applyConversationEvent({ type: 'conversation.sync' });
  await Promise.resolve();

  assert.equal(widget.serverConversationExists, false);
  assert.equal(historyCalls, 0);
  widget.destroy();
  dom.window.close();
});

test('deduplicates history synchronization for an existing conversation', async () => {
  const dom = installDom();
  const widget = await createWidget({}, instance => {
    instance.connectConversationSocket = () => {};
  });
  widget.serverConversationExists = true;
  let historyCalls = 0;
  widget.api.getConversationHistory = async () => {
    historyCalls++;
    await Promise.resolve();
    return { success: true, data: { messages: [] } };
  };

  widget.applyConversationEvent({ type: 'conversation.sync' });
  widget.applyConversationEvent({ type: 'conversation.sync' });
  while (widget.conversationSyncInProgress) await Promise.resolve();

  assert.equal(historyCalls, 1);
  widget.destroy();
  dom.window.close();
});

test('rotates only a missing restored conversation and keeps its welcome message', async () => {
  const dom = installDom();
  const widget = await createWidget({}, instance => {
    instance.connectConversationSocket = () => {};
  });
  const staleSessionId = widget.sessionId;
  widget.serverConversationExists = true;
  widget.addMessage('user', 'Ancienne question', [], { serverId: 'message-1' });
  let socketReconnects = 0;
  widget.connectConversationSocket = () => { socketReconnects++; };
  widget.api.getConversationHistory = async () => {
    const error = new Error('Conversation introuvable.');
    error.status = 404;
    error.code = 'CONVERSATION_NOT_FOUND';
    throw error;
  };

  await widget.syncActiveConversation();

  assert.notEqual(widget.sessionId, staleSessionId);
  assert.equal(widget.serverConversationExists, false);
  assert.equal(widget.messages.length, 1);
  assert.equal(widget.messages[0].metadata.isWelcome, true);
  assert.equal(socketReconnects, 1);
  widget.destroy();
  dom.window.close();
});

test('keeps the active session when history fails transiently', async () => {
  const dom = installDom();
  const widget = await createWidget({}, instance => {
    instance.connectConversationSocket = () => {};
  });
  const sessionId = widget.sessionId;
  widget.serverConversationExists = true;
  widget.logSocketError = () => {};
  widget.api.getConversationHistory = async () => {
    const error = new Error('Stockage indisponible');
    error.status = 500;
    throw error;
  };

  await widget.syncActiveConversation();

  assert.equal(widget.sessionId, sessionId);
  assert.equal(widget.serverConversationExists, true);
  widget.destroy();
  dom.window.close();
});

test('tracks honest delivery states and retries with the same client message ID', async () => {
  const dom = installDom();
  const widget = await createWidget();
  widget.setUserInfo('Ada Lovelace', 'ada@example.com');
  let attempts = 0;
  const clientIds = [];
  widget.api.sendMessage = async payload => {
    attempts++;
    clientIds.push(payload.clientMessageId);
    if (attempts === 1) throw new Error('network');
    return {
      success: true,
      data: {
        sessionId: widget.sessionId,
        response: 'Récupérée',
        suggestions: [],
        userMessageId: payload.clientMessageId,
        assistantMessageId: '33333333-3333-4333-8333-333333333333'
      }
    };
  };

  await widget.sendMessage('Message fragile');
  const failed = widget.messages.find(message => message.text === 'Message fragile');
  assert.equal(failed.deliveryStatus, 'failed');
  await widget.retryMessage(failed.id);
  assert.equal(failed.deliveryStatus, 'answered');
  assert.equal(widget.serverConversationExists, true);
  assert.equal(clientIds[0], clientIds[1]);
  assert.equal(widget.messages.filter(message => message.text === 'Message fragile').length, 1);
  assert.ok(widget.messageNodes.has(failed.id));

  widget.destroy();
  dom.window.close();
});

test('persists feedback optimistically and rolls it back on failure', async () => {
  const dom = installDom();
  const widget = await createWidget();
  widget.setUserInfo('Ada Lovelace', 'ada@example.com');
  await widget.sendMessage('Bonjour');
  const assistant = widget.messages.find(message => message.serverId?.startsWith('2222'));

  await widget.submitMessageFeedback(assistant, 'up');
  assert.equal(assistant.feedback, 'up');
  widget.api.sendMessageFeedback = async () => { throw new Error('offline'); };
  await widget.submitMessageFeedback(assistant, 'down');
  assert.equal(assistant.feedback, 'up');

  widget.destroy();
  dom.window.close();
});

test('ends through the explicit rating view and rotates the next session', async () => {
  const dom = installDom();
  const widget = await createWidget();
  widget.setUserInfo('Ada Lovelace', 'ada@example.com');
  widget.open();
  await widget.sendMessage('Bonjour');
  const endedSessionId = widget.sessionId;

  widget.startRating();
  assert.equal(widget.chatWindow.dataset.view, 'rating');
  widget.ratingGroup.querySelector('[role="radio"]').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(widget.selectedRating, 2);
  widget.selectRating(4);
  widget.ratingComment.value = 'Très utile';
  await widget.submitRating();
  assert.equal(widget.sessionEnded, true);
  clearTimeout(widget.ratingCloseTimer);
  widget.close();
  widget.open();
  assert.notEqual(widget.sessionId, endedSessionId);
  assert.equal(widget.sessionEnded, false);

  widget.destroy();
  dom.window.close();
});

test('honors disabled presentation features and updates connectivity', async () => {
  const dom = installDom();
  const widget = await createWidget({
    locale: 'fr',
    options: {
      features: {
        messageFeedback: false,
        conversationRating: false,
        showTimestamps: false,
        showDeliveryStatus: false,
        dateSeparators: false,
        connectivityStatus: true
      }
    }
  });
  widget.setUserInfo('Ada Lovelace', 'ada@example.com');
  await widget.sendMessage('Bonjour');
  assert.equal(widget.root.querySelector('.vx-date-separator'), null);
  assert.equal(widget.root.querySelector('.vx-delivery-status'), null);
  assert.equal(widget.root.querySelector('.vx-timestamp:not([hidden])'), null);
  assert.equal(widget.endButton.hidden, true);
  await widget.checkConnectivity(true);
  assert.equal(widget.subtitleElement.textContent, 'Assistant disponible');

  widget.destroy();
  dom.window.close();
});

test('supports lifecycle, grouping, live configuration and programmatic sending', async () => {
  const dom = installDom();
  const widget = await createWidget({ options: { ui: { showUserAvatar: true } } });
  widget.setUserInfo('Ada Lovelace', 'ada@example.com');

  await widget.sendMessage('Bonjour');
  assert.equal(widget.messages.at(-1).text, 'Réponse VOXO');
  assert.equal(widget.messagesContainer.lastElementChild.dataset.grouped, 'false');
  widget.addMessage('bot', 'Une précision');
  assert.equal(widget.messagesContainer.lastElementChild.dataset.grouped, 'true');

  widget.updateConfig({ name: 'Nouvel assistant', theme: { primaryColor: '#f59e0b' } });
  assert.equal(widget.titleElement.textContent, 'Nouvel assistant');
  assert.match(widget.host.style.getPropertyValue('--vx-accent-solid'), /^#/);

  widget.open();
  widget.close();
  assert.equal(widget.chatWindow.hidden, true);
  let quickReplyCalls = 0;
  widget.api.getQuickReplies = async () => {
    quickReplyCalls++;
    return { success: true, data: { suggestions: [] } };
  };
  await widget.clearMessages();
  assert.equal(widget.messages.length, 1);
  assert.equal(quickReplyCalls, 0);
  widget.destroy();
  assert.equal(document.getElementById('voxo-chat'), null);
  dom.window.close();
});

test('orders messages chronologically, colors roles and reopens at the bottom', async () => {
  const dom = installDom();
  const widget = await createWidget();
  widget.messages = [
    { id: 'assistant', sender: 'bot', text: 'Réponse', timestamp: '2026-08-15T12:00:00Z', metadata: {} },
    { id: 'client', sender: 'user', text: 'Question', timestamp: '2026-08-15T10:00:00Z', metadata: {} },
    { id: 'agent', sender: 'agent', text: 'Conseiller', timestamp: '2026-08-15T13:00:00Z', metadata: {} },
  ];
  widget.renderMessages();
  assert.deepEqual([...widget.root.querySelectorAll('.vx-bubble')].map(node => node.textContent), ['Question', 'Réponse', 'Conseiller']);
  assert.ok(widget.root.querySelector('.vx-user .vx-bubble'));
  assert.ok(widget.root.querySelector('.vx-bot .vx-bubble'));
  assert.ok(widget.root.querySelector('.vx-agent .vx-bubble'));
  assert.match(WIDGET_CSS, /\.vx-agent \.vx-bubble\s*\{\s*background:\s*#15803d/);
  assert.match(WIDGET_CSS, /\.vx-user \.vx-bubble\s*\{[^}]*margin-left:\s*auto[^}]*background:\s*var\(--vx-accent-soft\)/);
  assert.match(WIDGET_CSS, /\.vx-bubble\s*\{[^}]*background:\s*var\(--vx-surface-raised\)/);
  Object.defineProperty(widget.messagesContainer, 'scrollHeight', { configurable: true, value: 900 });
  widget.close();
  widget.messagesContainer.scrollTop = 0;
  widget.open();
  assert.equal(widget.messagesContainer.scrollTop, 900);
  widget.destroy();
  dom.window.close();
});

test('renders the premium header and restores a configurable launcher icon', async t => {
  const dom = installDom();
  const firstIcon = 'https://cdn.test/launcher-one.svg';
  const secondIcon = 'https://cdn.test/launcher-two.svg';
  const widget = await createWidget({
    locale: 'fr',
    options: { ui: { launcherIconUrl: firstIcon, avatarUrl: 'https://cdn.test/tenant.svg' } }
  }, instance => {
    instance.defaultChatIconUrl = 'https://api.test/public/widget-assets/chat-icon.svg';
  });
  t.after(() => { widget.destroy(); dom.window.close(); });

  assert.equal(widget.root.querySelector('.vx-tagline').textContent, 'Une question ? Échangeons !');
  assert.equal(widget.root.querySelector('.vx-channel-pill').textContent, 'Messages');
  assert.ok(widget.root.querySelector('.vx-header-top'));
  assert.ok(widget.root.querySelector('.vx-brand-stage'));
  assert.ok(widget.minimizeButton.querySelector('svg'));
  assert.equal(widget.root.querySelector('.vx-launcher-image').src, firstIcon);
  const brandImages = widget.root.querySelectorAll('.vx-brand-avatar-group img');
  assert.equal(brandImages.length, 2);
  assert.equal(brandImages[0].src, 'https://api.test/api/widget/media/tenant-test/logo');
  assert.equal(brandImages[1].src, 'https://cdn.test/tenant.svg');
  brandImages[0].dispatchEvent(new window.Event('error'));
  assert.ok(widget.root.querySelector('.vx-brand-avatar svg'));
  assert.equal(widget.root.textContent.includes('Temps d’attente'), false);
  assert.equal([...widget.root.querySelectorAll('button')].some(button => /voix|emoji/i.test(button.getAttribute('aria-label') || '')), false);
  const composer = widget.root.querySelector('.vx-composer');
  assert.deepEqual([...composer.children].map(node => node.className), ['vx-input', 'vx-composer-toolbar']);
  assert.deepEqual(
    [...composer.querySelector('.vx-composer-options').children].map(node => node.getAttribute('aria-label')),
    ['Plus d’actions', 'Joindre un fichier']
  );
  assert.equal(composer.querySelector('.vx-composer-toolbar > .vx-send'), widget.sendButton);

  widget.open();
  assert.equal(widget.button.querySelector('.vx-launcher-image'), null);
  widget.close();
  assert.equal(widget.button.querySelector('.vx-launcher-image').src, firstIcon);

  widget.updateConfig({ options: { ui: { launcherIconUrl: secondIcon } } });
  const customImage = widget.button.querySelector('.vx-launcher-image');
  assert.equal(customImage.src, secondIcon);
  customImage.dispatchEvent(new window.Event('error'));
  assert.ok(widget.button.querySelector('circle[fill="#267CB5"]'));

});

test('uses the exact embedded VOXO launcher and the enlarged desktop panel', async () => {
  const dom = installDom();
  const widget = await createWidget();

  assert.equal(widget.button.querySelector('.vx-launcher-image'), null);
  assert.ok(widget.button.querySelector('circle[fill="#267CB5"]'));
  assert.ok(widget.button.querySelector('path[fill="#fff"]'));
  assert.match(WIDGET_CSS, /width:\s*min\(420px,\s*calc\(100vw - 32px\)\)/);
  assert.match(WIDGET_CSS, /height:\s*min\(680px,\s*calc\(100vh - 108px\)\)/);
  assert.match(WIDGET_CSS, /\.vx-input:focus-visible\s*\{\s*outline:\s*0/);
  assert.match(WIDGET_CSS, /\.vx-composer:focus-within\s*\{[^}]*border-color:/);

  widget.destroy();
  dom.window.close();
});

test('uses light by default while keeping explicit auto and dark schemes', async () => {
  const dom = installDom();
  const widget = await createWidget();
  assert.equal(widget.host.dataset.theme, 'light');
  widget.updateConfig({ options: { ui: { colorScheme: 'auto' } } });
  assert.equal(widget.host.dataset.theme, 'auto');
  widget.updateConfig({ options: { ui: { colorScheme: 'dark' } } });
  assert.equal(widget.host.dataset.theme, 'dark');
  widget.destroy();
  dom.window.close();
});

test('applies dark, reduced-motion, shadowless and compact-mobile tokens', async () => {
  const dom = installDom();
  const widget = await createWidget({
    theme: { primaryColor: '#ffff00' },
    options: { ui: { colorScheme: 'dark', animations: false, shadows: false, mobileFullScreen: false } }
  });
  assert.equal(widget.host.dataset.theme, 'dark');
  assert.equal(widget.host.dataset.mobileFullscreen, 'false');
  assert.equal(widget.host.style.getPropertyValue('--vx-duration-fast'), '1ms');
  assert.equal(widget.host.style.getPropertyValue('--vx-shadow-panel'), 'none');
  assert.match(widget.host.style.getPropertyValue('--vx-header-start'), /^#/);
  widget.destroy();
  dom.window.close();
});

test('hides the network dot when connectivity presentation is disabled', async () => {
  const dom = installDom();
  const widget = await createWidget({ locale: 'fr', options: { features: { connectivityStatus: false } } });
  assert.equal(widget.subtitleElement.textContent, 'Assistant IA');
  assert.equal(widget.subtitleElement.dataset.connectivity, 'disabled');
  widget.destroy();
  dom.window.close();
});

test('closes the conversation after three professional inactivity reminders', async () => {
  const dom = installDom();
  const widget = await createWidget({ locale: 'fr', options: { features: { connectivityStatus: false } } });
  widget.isOpen = true;
  let closeCalls = 0;
  widget.api.endConversationForInactivity = async () => {
    closeCalls++;
    return { success: true, data: { status: 'ended' } };
  };

  for (let index = 0; index < 3; index++) {
    widget.lastActivityTime = Date.now() - (10 * 60 * 1000 + 1);
    await widget.checkInactivity();
  }

  assert.equal(widget.inactivityReminderCount, 3);
  assert.equal(widget.sessionEnded, true);
  assert.equal(closeCalls, 1);
  assert.equal(widget.messages.at(-1).text, 'Sans réponse de votre part, cette conversation est maintenant clôturée. Vous pourrez démarrer une nouvelle conversation à tout moment.');

  widget.lastActivityTime = Date.now() - (10 * 60 * 1000 + 1);
  await widget.checkInactivity();
  assert.equal(closeCalls, 1);

  const endedSessionId = widget.sessionId;
  await widget.sendMessage('Nouvelle demande');
  assert.notEqual(widget.sessionId, endedSessionId);
  assert.equal(widget.inactivityReminderCount, 0);

  widget.destroy();
  dom.window.close();
});

test('renders response suggestions beneath their assistant message and sends the selected question', async () => {
  const dom = installDom();
  const widget = await createWidget();
  widget.setUserInfo('Ada Lovelace', 'ada@example.com');
  widget.api.sendMessage = async () => ({
    success: true,
    data: {
      sessionId: widget.sessionId,
      response: 'Le plan Pro coûte 29 euros.',
      suggestions: ['Comment souscrire ?'],
      userMessageId: '11111111-1111-4111-8111-111111111111',
      assistantMessageId: '22222222-2222-4222-8222-222222222222'
    }
  });

  await widget.sendMessage('Quels sont vos tarifs ?');
  const assistant = widget.messages.find(message => message.serverId?.startsWith('2222'));
  const assistantNode = widget.messageNodes.get(assistant.id);
  const chip = assistantNode.querySelector('.vx-suggestions button');
  assert.equal(chip.textContent, 'Comment souscrire ?');
  chip.click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(widget.messages.at(-1).text, 'Comment souscrire ?');

  widget.destroy();
  dom.window.close();
});

test('linkifies safe text without interpreting HTML and ignores duplicate bootstrap', async () => {
  const dom = installDom();
  window.ChatBotConfig = { tenantId: 'duplicate-test', welcomeMessage: '', apiUrl: 'https://api.test/api' };
  const { initChatBotWidget } = await import('../src/index.js');
  const first = window.ChatBotWidget;
  const second = initChatBotWidget();

  assert.equal(second, first);
  assert.equal(document.querySelectorAll('#voxo-chat').length, 1);
  first.setUserInfo('Ada Lovelace', 'ada@example.com');
  first.addMessage('bot', '<img src=x onerror=alert(1)> https://voxo.fr.');
  const bubble = first.root.querySelector('.vx-bubble');
  assert.equal(bubble.querySelector('img'), null);
  assert.equal(first.root.querySelector('a[href="https://voxo.fr"]')?.rel, 'noopener noreferrer nofollow');

  first.destroy();
  dom.window.close();
});
