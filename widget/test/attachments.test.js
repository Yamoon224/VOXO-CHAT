import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { WIDGET_CSS } from '../src/styles.js';

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://client.test/'
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    localStorage: dom.window.localStorage,
    Element: dom.window.Element,
    File: dom.window.File,
    requestAnimationFrame: callback => callback()
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true
  });
  dom.window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  });
  dom.window.fetch = async () => ({ ok: true, json: async () => ({ success: true, data: {} }) });
  globalThis.fetch = dom.window.fetch;
  return dom;
}

async function createWidget(attachments = false) {
  const { ChatBotWidget } = await import('../src/widget.js');
  const widget = new ChatBotWidget({
    tenantId: 'tenant-test',
    apiUrl: 'https://api.test/api',
    options: { features: { attachments } }
  });
  widget.api.getTenantSettings = async () => ({
    success: true,
    data: { chatbot: { options: { features: { attachments } } } }
  });
  widget.api.getQuickReplies = async () => ({ success: true, data: { suggestions: [] } });
  widget.api.healthCheck = async () => ({ success: true, data: {} });
  await widget.init();
  widget.setUserInfo('Ada Lovelace', 'ada@example.com');
  return widget;
}

test('affiche le trombone uniquement quand les pièces jointes sont activées', async () => {
  const dom = installDom();
  const widget = await createWidget(false);
  assert.equal(widget.attachButton.hidden, true);

  widget.updateConfig({ options: { features: { attachments: true } } });
  assert.equal(widget.attachButton.hidden, false);

  let pickerOpened = false;
  widget.fileInput.click = () => { pickerOpened = true; };
  widget.attachButton.click();
  assert.equal(pickerOpened, true);

  widget.destroy();
  dom.window.close();
});

test('conserve les identifiants de fichiers lors d’un renvoi après erreur', async () => {
  const dom = installDom();
  const widget = await createWidget(true);
  widget.attachments.items = [{
    localId: 'local-1', id: 'attachment-1', name: 'contrat.pdf', category: 'document'
  }];
  widget.inputField.value = '';

  const payloads = [];
  widget.api.sendMessage = async payload => {
    payloads.push(payload);
    if (payloads.length === 1) throw new Error('coupure réseau');
    return {
      success: true,
      data: {
        sessionId: widget.sessionId,
        response: 'Document reçu',
        userMessageId: payload.clientMessageId,
        assistantMessageId: 'assistant-1',
        suggestions: []
      }
    };
  };

  await widget.handleSendMessage();
  const failed = widget.messages.find(message => message.deliveryStatus === 'failed');
  assert.deepEqual(failed.metadata.pendingAttachments.map(item => item.id), ['attachment-1']);

  await widget.retryMessage(failed.id);
  assert.deepEqual(payloads.map(payload => payload.attachmentIds), [
    ['attachment-1'],
    ['attachment-1']
  ]);

  widget.destroy();
  dom.window.close();
});

test('valide et téléverse un document sélectionné', async () => {
  const dom = installDom();
  const widget = await createWidget(true);
  widget.api.uploadAttachment = async file => ({
    success: true,
    data: { id: 'attachment-2', name: file.name }
  });

  await widget.attachments.add([
    new File(['contenu'], 'notes.txt', { type: 'text/plain' })
  ]);

  assert.equal(widget.attachments.ready[0].id, 'attachment-2');
  assert.equal(widget.attachments.ready[0].category, 'document');

  widget.destroy();
  dom.window.close();
});

test('accepte dépôt et collage, puis permet de retirer la prévisualisation', async () => {
  const dom = installDom();
  const widget = await createWidget(true);
  const file = new File(['contenu'], 'notes.txt', { type: 'text/plain' });
  const received = [];
  widget.attachments.add = files => received.push(...files);

  const drop = new window.Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } });
  widget.chatWindow.dispatchEvent(drop);

  const paste = new window.Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(paste, 'clipboardData', { value: { files: [file] } });
  widget.inputField.dispatchEvent(paste);
  assert.equal(received.length, 2);

  widget.attachments.items = [{
    localId: 'local-remove', id: 'attachment-remove', name: 'notes.txt', category: 'document'
  }];
  widget.renderAttachments();
  widget.attachmentsRow.querySelector('[aria-label="Retirer notes.txt"]').click();
  assert.equal(widget.attachments.items.length, 0);

  widget.destroy();
  dom.window.close();
});

test('conserve une largeur stable pour un long message utilisateur avec image', async () => {
  const dom = installDom();
  const widget = await createWidget(true);
  widget.messages = [{
    id: 'long-user-message',
    sender: 'user',
    text: 'Je suis intéressé par cette offre et je souhaite recevoir davantage de détails.',
    timestamp: new Date().toISOString(),
    attachments: [{ id: 'image-1', name: 'image.webp', category: 'image', url: 'https://cdn.test/image.webp' }],
    deliveryStatus: 'sending',
    metadata: {}
  }];
  widget.renderMessages();

  const content = widget.root.querySelector('.vx-user .vx-message-content');
  assert.ok(content.querySelector('.vx-message-files'));
  assert.match(content.textContent, /Je suis intéressé/);
  assert.match(WIDGET_CSS, /\.vx-message\s*\{\s*display:\s*flex/);
  assert.match(WIDGET_CSS, /\.vx-message-content\s*\{[^}]*max-width:\s*78%/);
  assert.match(WIDGET_CSS, /\.vx-user \.vx-message-content\s*\{\s*margin-left:\s*auto/);
  assert.match(WIDGET_CSS, /\.vx-avatar-hidden\s*\{\s*display:\s*none/);
  assert.match(WIDGET_CSS, /inline-size:\s*max-content/);
  assert.match(WIDGET_CSS, /max-inline-size:\s*100%/);
  assert.doesNotMatch(WIDGET_CSS, /\.vx-bubble[^{]*\{[^}]*overflow-wrap:\s*anywhere/);

  widget.destroy();
  dom.window.close();
});

test('garde un message utilisateur court et une URL longue dans une colonne stable', async () => {
  const dom = installDom();
  const widget = await createWidget(false);
  widget.messages = [
    { id: 'short', sender: 'user', text: 'Et toi ?', timestamp: new Date().toISOString(), deliveryStatus: 'answered', metadata: {} },
    { id: 'url', sender: 'user', text: 'https://exemple.test/une-adresse-extremement-longue-sans-espace', timestamp: new Date().toISOString(), deliveryStatus: 'answered', metadata: {} }
  ];
  widget.renderMessages();

  const contents = widget.root.querySelectorAll('.vx-user .vx-message-content');
  assert.equal(contents.length, 2);
  assert.equal(contents[0].querySelector('.vx-text').textContent, 'Et toi ?');
  assert.match(contents[1].textContent, /adresse-extremement-longue/);
  assert.match(WIDGET_CSS, /overflow-wrap:\s*break-word/);
  assert.match(WIDGET_CSS, /word-break:\s*normal/);

  widget.destroy();
  dom.window.close();
});
