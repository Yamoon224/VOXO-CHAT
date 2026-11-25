import { ChatAPI } from './api.js';
import {
  generateUUID,
  trackEvent,
  handleError,
  setLocalStorage,
  getLocalStorage
} from './utils.js';
import { createTypingEmitter } from './typing.js';
import { adoptStyles } from './styles.js';
import { applyTokens } from './tokens.js';
import { icon } from './icons.js';
import { UIBuilder } from './ui-builder.js';
import { AttachmentQueue } from './attachments.js';
import { bindAttachmentEvents, renderPendingAttachments } from './attachment-ui.js';
import { renderLauncherIcon } from './branding-ui.js';
import { getDefaultApiUrl, getDefaultFrontendUrl, getDefaultWidgetAssetUrl } from './runtime-config.js';
import { resolveLocale, saveLocale, translate } from './i18n.js';

const SESSION_PREFIX = 'session-';
const HISTORY_PREFIX = 'conversation-history-';
const INACTIVITY_DELAY_MS = 10 * 60 * 1000;
const MAX_INACTIVITY_REMINDERS = 3;

export class ChatBotWidget {
  constructor(userConfig) {
    this.config = this.validateAndMergeConfig(userConfig);
    this.invalid = !this.config;
    if (this.invalid) return;
    this.config.locale = resolveLocale(this.config);

    this.defaultChatIconUrl = getDefaultWidgetAssetUrl('chat-icon.svg');

    this.sessionId = this.generateSessionId();
    this.isOpen = false;
    this.isLoading = false;
    this.isMinimized = false;
    this.isDestroyed = false;
    this.messages = [];
    this.lastActivityTime = Date.now();
    this.conversationStartTime = null;
    this.messageCount = 0;
    this.userInfo = null;
    this.needsUserInfo = true;
    this.quickRepliesLoaded = false;
    this.quickRepliesCache = [];
    this.messageNodes = new Map();
    this.connectivityState = 'connecting';
    this.lastHealthCheck = 0;
    this.selectedRating = 0;
    this.sessionEnded = false;
    this.rateLimitWindow = 60000;
    this.messagesSent = [];
    this.inactivityTimer = null;
    this.inactivityReminderCount = 0;
    this.typingEl = null;
    this.autoOpenTimer = null;
    this.welcomeTimer = null;
    this.toastTimer = null;
    this.ratingCloseTimer = null;
    this.conversationSocket = null;
    this.socketReconnectTimer = null;
    this.socketReconnectAttempt = 0;
    this.socketErrorLogged = false;
    this.serverConversationExists = false;
    this.conversationSyncInProgress = false;
    this.previousFocus = null;
    this.isViewingHistoryList = false;

    this.api = new ChatAPI(this.config.apiUrl, this.config.tenantId, this.config.locale);
    this.ui = new UIBuilder(this);
    this.attachments = new AttachmentQueue({
      api: this.api,
      onChange: () => this.renderAttachments(),
      onError: message => this.showToast(message),
      // Lecture différée : la locale peut changer via setLocale() après coup,
      // ce getter lit toujours this.config.locale à jour plutôt qu'une copie figée.
      getLocale: () => this.config.locale
    });
    this.bindMethods();
    this.restoreUserProfile();
    this.restoreSession();
  }

  bindMethods() {
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleRootKeyDown = this.handleRootKeyDown.bind(this);
    this.toggle = this.toggle.bind(this);
    this.handleDocumentPointerDown = this.handleDocumentPointerDown.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.checkInactivity = this.checkInactivity.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
  }

  async init() {
    if (this.invalid || this.isDestroyed || this.host) return this;
    if (!this.checkBrowserCompatibility()) return this;

    try {
      this.initDOM();
      this.bindEvents();
      this.renderMessages();
      await this.loadTenantSettings();
      if (this.isDestroyed) return this;

      if (this.messages.length === 0) await this.addWelcomeMessage();
      if (this.isDestroyed) return this;
      if (this.config.options.autoOpen) {
        this.autoOpenTimer = setTimeout(() => this.open(), 1000);
      }

      this.startInactivityMonitoring();
      // Créé une seule fois : l'émetteur relit la socket courante à chaque
      // envoi et survit donc aux reconnexions et aux changements de session.
      this.typingEmitter = createTypingEmitter(this);
      this.connectConversationSocket();
      this.setupGlobalListeners();
      trackEvent('widget_initialized', { tenant_id: this.config.tenantId });
      this.executeCallback('onInit');
    } catch (error) {
      console.error('VOXO init', error);
    }
    return this;
  }

  initDOM() {
    this.host = document.createElement('div');
    this.host.id = 'voxo-chat';
    this.host.dataset.voxoWidget = '';
    this.root = this.host.attachShadow({ mode: 'open' });
    this.styleMode = adoptStyles(this.root);
    applyTokens(this.host, this.config);

    const elements = this.ui.createWidget();
    this.root.appendChild(elements.shell);
    document.body.appendChild(this.host);

    this.shell = elements.shell;
    this.button = elements.launcher;
    this.chatWindow = elements.panel;
    this.messagesContainer = elements.messages;
    this.inputField = elements.input;
    this.sendButton = elements.sendButton;
    this.menu = elements.menu;
    this.menuButton = elements.menuButton;
    this.attachButton = elements.attachButton;
    this.attachmentsRow = elements.attachments;
    this.fileInput = elements.fileInput;
    this.clearButton = elements.clearButton;
    this.historyButton = elements.historyButton;
    this.endButton = elements.endButton;
    this.minimizeButton = elements.minimizeButton;
    this.closeButton = elements.closeButton;
    this.titleElement = elements.title;
    this.subtitleElement = elements.subtitle;
    this.brandAvatar = elements.brandAvatar;
    this.powered = elements.powered;
    this.liveRegion = elements.liveRegion;
    this.prechatView = elements.prechatView;
    this.ratingView = elements.ratingView;
    this.ratingGroup = elements.ratingGroup;
    this.ratingComment = elements.ratingComment;
    this.ratingSubmit = elements.ratingSubmit;
    this.ratingCancel = elements.ratingCancel;
    this.ratingError = elements.ratingError;
    this.toast = elements.toast;
    this.localeSelect = elements.localeSelect;
    this.updateConnectivityLabel();
  }

  renderMessages() {
    if (!this.messagesContainer) return;
    this.messagesContainer.replaceChildren();
    this.messageNodes.clear();
    let previous = null;
    let previousDate = null;
    const ordered = [...this.messages].sort((a, b) => (Date.parse(a.timestamp) - Date.parse(b.timestamp)) || 0);
    ordered.forEach(message => {
      const dateKey = new Date(message.timestamp).toDateString();
      if (this.config.options.features.dateSeparators && dateKey !== previousDate) {
        this.messagesContainer.appendChild(this.ui.createDateSeparator(this.formatDateLabel(message.timestamp)));
        previous = null;
        previousDate = dateKey;
      }
      const node = this.ui.renderMessage(message, this.messagesContainer, previous);
      this.messageNodes.set(message.id, node);
      previous = message;
    });
    this.updateEndAction();
    this.scrollToBottom();
  }

  async handleSendMessage(existingMessage = null) {
    const retryMessage = existingMessage?.sender === 'user' ? existingMessage : null;
    const text = retryMessage?.text || this.inputField?.value.trim() || '';
    const pending = retryMessage
      ? (retryMessage.metadata?.pendingAttachments || [])
      : this.attachments.ready;

    if ((!text && pending.length === 0) || this.isLoading) return null;
    if (this.sessionEnded) await this.startNewSession();

    if (this.attachments.isUploading) {
      this.showToast(this.t('uploadPending'));
      return null;
    }

    if (this.config.options.rateLimiting.enabled && !this.checkRateLimit()) {
      this.showToast(this.t('rateLimited'));
      return null;
    }
    if (text.length > 2000) {
      this.showToast(this.t('tooLong'));
      return null;
    }

    this.isLoading = true;
    this.resetInactivityReminders();
    this.setConnectivity('connecting');
    this.toggleLoadingState(true);
    this.pendingSuggestionMessageId = this.setPreviousSuggestionsVisibility(false);
    this.updateLastActivity();
    const pendingAttachments = pending.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category
    }));
    const userMessage = retryMessage || this.addMessage('user', text, [], {
      id: generateUUID(),
      deliveryStatus: 'sending',
      attachments: pendingAttachments.map(({ name, category }) => ({ name, category })),
      pendingAttachments
    });
    if (retryMessage) this.updateMessage(retryMessage.id, { deliveryStatus: 'sending' });
    this.inputField.value = '';
    this.typingEmitter?.stopTyping();
    const attachmentIds = pending.map(item => item.id);
    this.attachments.clear();
    this.autoResizeTextarea();
    if (this.config.options.enableTyping) this.showTyping();

    try {
      const response = await this.api.sendMessage({
        message: text,
        sessionId: this.sessionId,
        clientMessageId: userMessage.id,
        userId: this.getUserId(),
        userName: this.userInfo?.name,
        userEmail: this.userInfo?.email,
        attachmentIds,
        metadata: this.getMetadata()
      });
      this.removeTyping();

      if (response.success && response.data) {
        this.serverConversationExists = true;
        const previousSessionId = this.sessionId;
        const nextSessionId = response.data.sessionId || previousSessionId;
        if (nextSessionId !== previousSessionId) {
          this.archiveConversation(previousSessionId, this.messages.filter(item => item.id !== userMessage.id));
          this.sessionId = nextSessionId;
          this.messages = [];
          this.addMessage('user', text, [], {
            id: userMessage.id,
            serverId: response.data.userMessageId || userMessage.id,
            deliveryStatus: 'answered',
            attachments: userMessage.attachments
          });
        }
        userMessage.metadata.pendingAttachments = [];
        this.updateMessage(userMessage.id, {
          serverId: response.data.userMessageId || userMessage.id,
          deliveryStatus: 'answered'
        });
        const existingAssistant = this.messages.find(item => (
          item.serverId && item.serverId === response.data.assistantMessageId
        ));
        if (response.data.response && !existingAssistant) {
          this.addMessage('bot', response.data.response, response.data.suggestions, {
            id: response.data.assistantMessageId || generateUUID(),
            serverId: response.data.assistantMessageId || null
          });
        }
        this.setConnectivity('available');
        if (this.config.options.enableSounds) this.playNotificationSound();
      } else {
        throw new Error(response.error || this.t('failed'));
      }
      return response;
    } catch (error) {
      this.removeTyping();
      this.updateMessage(userMessage.id, { deliveryStatus: 'failed' });
      this.setConnectivity('unavailable');
      this.showToast(handleError(error, 'Widget', (key) => this.t(key)));
      return null;
    } finally {
      this.isLoading = false;
      this.toggleLoadingState(false);
      this.setPreviousSuggestionsVisibility(true, this.pendingSuggestionMessageId);
      this.pendingSuggestionMessageId = null;
      this.inputField?.focus();
    }
  }

  addMessage(sender, text, suggestions = [], metadata = {}) {
    const previous = this.messages.at(-1) || null;
    const message = {
      id: metadata.id || generateUUID(),
      serverId: metadata.serverId || null,
      sender,
      text: String(text ?? ''),
      timestamp: new Date(),
      suggestions: suggestions || [],
      deliveryStatus: metadata.deliveryStatus,
      feedback: metadata.feedback ?? null,
      messageIndex: metadata.messageIndex,
      attachments: metadata.attachments || [],
      metadata
    };

    this.messages.push(message);
    if (this.messages.length > this.config.options.maxMessages) {
      this.messages = this.messages.slice(-this.config.options.maxMessages);
      this.renderMessages();
    } else {
      const previousDate = previous ? new Date(previous.timestamp).toDateString() : null;
      const currentDate = new Date(message.timestamp).toDateString();
      if (this.config.options.features.dateSeparators && currentDate !== previousDate) {
        this.messagesContainer.appendChild(this.ui.createDateSeparator(this.formatDateLabel(message.timestamp)));
      }
      const node = this.ui.renderMessage(message, this.messagesContainer, currentDate === previousDate ? previous : null);
      this.messageNodes.set(message.id, node);
    }
    this.scrollToBottom();

    if (sender === 'user') {
      this.messageCount++;
      this.executeCallback('onMessage', { message: text });
    } else {
      if (this.config.options.a11y.announceMessages && !metadata.isWelcome) {
        this.announce(this.t('responseAnnouncement', { name: this.config.name, text }));
      }
      this.executeCallback('onResponse', { response: text, suggestions });
    }
    this.saveSession();
    this.updateEndAction();
    return message;
  }

  async sendMessage(text) {
    if (typeof text !== 'string' || !text.trim() || !this.inputField) return null;
    this.inputField.value = text.slice(0, 2000);
    this.autoResizeTextarea();
    return this.handleSendMessage();
  }

  updateMessage(messageId, updates) {
    const message = this.messages.find(item => item.id === messageId);
    if (!message) return null;
    Object.assign(message, updates);
    this.renderMessages();
    this.saveSession();
    return message;
  }

  toggle() {
    return this.isOpen ? this.close() : this.open();
  }

  toggleChat() {
    return this.toggle();
  }

  open() {
    if (this.isDestroyed || !this.chatWindow) return;
    if (this.isOpen) {
      if (this.isMinimized) this.minimize();
      return;
    }
    if (this.sessionEnded) this.startNewSession();
    this.previousFocus = this.root.activeElement || document.activeElement;
    this.isOpen = true;
    this.chatWindow.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
    this.button.setAttribute('aria-label', this.t('close'));
    this.button.replaceChildren(icon('close', 22));
    this.checkUserInfo();
    if (!this.conversationStartTime) this.conversationStartTime = Date.now();
    this.updateLastActivity();
    if (this.config.options.features.connectivityStatus) this.checkConnectivity(true);
    this.scrollToBottom();
    trackEvent('chat_opened', { tenant_id: this.config.tenantId });
  }

  close() {
    if (!this.isOpen || !this.chatWindow) return;
    this.isOpen = false;
    this.isMinimized = false;
    this.chatWindow.hidden = true;
    this.chatWindow.dataset.minimized = 'false';
    this.closeMenu();
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-label', this.t('open'));
    renderLauncherIcon(this);
    const target = this.previousFocus?.isConnected ? this.previousFocus : this.button;
    target?.focus?.();
    trackEvent('chat_closed', { tenant_id: this.config.tenantId });
  }

  minimize() {
    if (!this.chatWindow) return;
    this.isMinimized = !this.isMinimized;
    this.chatWindow.dataset.minimized = String(this.isMinimized);
    if (!this.isMinimized) this.scrollToBottom();
    this.minimizeButton.setAttribute('aria-label', this.t(this.isMinimized ? 'expand' : 'minimize'));
  }

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.saveSession();
    clearInterval(this.inactivityTimer);
    this.conversationSocket?.close();
    clearTimeout(this.socketReconnectTimer);
    clearTimeout(this.autoOpenTimer);
    clearTimeout(this.welcomeTimer);
    clearTimeout(this.toastTimer);
    clearTimeout(this.ratingCloseTimer);
    this.removeTyping();
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('pointerdown', this.handleDocumentPointerDown);
    this.root?.removeEventListener('keydown', this.handleRootKeyDown);
    this.host?.remove();
    this.isOpen = false;
    if (window.ChatBotWidget === this) window.ChatBotWidget = null;
    this.executeCallback('onDestroy');
  }

  showTyping() {
    this.removeTyping();
    this.typingEl = this.ui.createTypingIndicator();
    this.messagesContainer.appendChild(this.typingEl);
    this.scrollToBottom();
  }

  removeTyping() {
    this.typingEl?.remove();
    this.typingEl = null;
  }

  setPreviousSuggestionsVisibility(visible, messageId = null) {
    const previousAssistant = messageId
      ? this.messages.find(message => message.id === messageId)
      : [...this.messages].reverse().find(message => message.sender === 'bot');
    if (!previousAssistant?.suggestions?.length) return;
    previousAssistant.metadata.suggestionsHidden = !visible;
    this.renderMessages();
    return previousAssistant.id;
  }

  async clearMessages({ addWelcome = true } = {}) {
    this.isViewingHistoryList = false;
    this.sessionId = this.generateSessionId();
    this.serverConversationExists = false;
    this.connectConversationSocket();
    this.messages = [];
    this.messageCount = 0;
    this.resetInactivityReminders();
    this.sessionEnded = false;
    this.conversationStartTime = null;
    this.messagesContainer?.replaceChildren();
    this.closeMenu();
    this.saveSession();
    if (addWelcome) await this.addWelcomeMessage();
  }

  async startNewSession() {
    this.isViewingHistoryList = false;
    this.archiveConversation(this.sessionId, this.messages);
    this.sessionId = this.generateSessionId();
    this.serverConversationExists = false;
    this.connectConversationSocket();
    this.messages = [];
    this.messageCount = 0;
    this.resetInactivityReminders();
    this.sessionEnded = false;
    this.selectedRating = 0;
    this.conversationStartTime = null;
    this.renderMessages();
    this.saveSession();
    await this.addWelcomeMessage();
  }

  getStats() {
    return {
      sessionId: this.sessionId,
      messageCount: this.messageCount,
      totalMessages: this.messages.length,
      isOpen: this.isOpen,
      isLoading: this.isLoading,
      styleMode: this.styleMode
    };
  }

  updateEndAction() {
    if (!this.endButton) return;
    const hasAssistantReply = this.messages.some(message => message.sender === 'bot' && message.serverId);
    this.endButton.hidden = !this.config.options.features.conversationRating || !hasAssistantReply;
  }

  async copyMessage(message) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = message.text;
        this.root.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      this.showToast(this.t('copied'));
    } catch {
      this.showToast(this.t('copyFailed'));
    }
  }

  async submitMessageFeedback(message, requestedValue) {
    if (!message.serverId || !this.config.options.features.messageFeedback) return;
    const previousValue = message.feedback;
    const nextValue = previousValue === requestedValue ? null : requestedValue;
    this.updateMessage(message.id, { feedback: nextValue });
    try {
      await this.api.sendMessageFeedback(this.sessionId, {
        messageId: message.serverId,
        ...(Number.isInteger(message.messageIndex) ? { messageIndex: message.messageIndex } : {}),
        value: nextValue
      });
    } catch {
      this.updateMessage(message.id, { feedback: previousValue });
      this.showToast(this.t('feedbackFailed'));
    }
  }

  startRating() {
    if (this.endButton?.hidden) return;
    this.closeMenu();
    this.selectedRating = 0;
    this.ratingComment.value = '';
    this.ratingError.textContent = '';
    this.selectRating(0);
    this.setView('rating');
    this.ratingGroup.querySelector('[role="radio"]')?.focus();
  }

  selectRating(value, focus = false) {
    this.selectedRating = Number(value) || 0;
    const stars = [...this.ratingGroup.querySelectorAll('[role="radio"]')];
    stars.forEach((star, index) => {
      const starValue = index + 1;
      star.dataset.selected = String(starValue === this.selectedRating);
      star.dataset.filled = String(starValue <= this.selectedRating);
      star.setAttribute('aria-checked', String(starValue === this.selectedRating));
      star.tabIndex = starValue === (this.selectedRating || 1) ? 0 : -1;
    });
    if (focus && this.selectedRating) stars[this.selectedRating - 1]?.focus();
  }

  cancelRating() {
    this.ratingError.textContent = '';
    this.setView('chat');
    this.inputField?.focus();
  }

  async submitRating() {
    if (!this.selectedRating) {
      this.ratingError.textContent = this.t('ratingRequired');
      this.ratingGroup.querySelector('[role="radio"]')?.focus();
      return null;
    }
    this.ratingError.textContent = '';
    this.ratingSubmit.disabled = true;
    try {
      const response = await this.endConversation({
        rating: this.selectedRating,
        feedback: this.ratingComment.value.trim()
      });
      this.sessionEnded = true;
      this.saveSession();
      this.showToast(this.t('ratingThanks'));
      this.announce(this.t('ratingThanks'));
      this.setView('chat');
      this.ratingCloseTimer = setTimeout(() => this.close(), 700);
      return response;
    } catch (error) {
      this.ratingError.textContent = error.message || this.t('ratingFailed');
      return null;
    } finally {
      this.ratingSubmit.disabled = false;
    }
  }

  async endConversation(feedback = {}) {
    const response = await this.api.endConversation(this.sessionId, {
      ...feedback,
      sessionDuration: this.conversationStartTime ? Date.now() - this.conversationStartTime : null,
      messageCount: this.messageCount
    });
    if (!response.success) throw new Error(response.error || this.t('endFailed'));
    this.sessionEnded = true;
    this.saveSession();
    return response;
  }

  async endConversationForInactivity() {
    const response = await this.api.endConversationForInactivity(this.sessionId, {
      sessionDuration: this.conversationStartTime ? Date.now() - this.conversationStartTime : null,
      messageCount: this.messageCount,
    });
    if (!response.success) throw new Error(response.error || this.t('closeFailed'));
    this.sessionEnded = true;
    this.archiveConversation(this.sessionId, this.messages);
    this.saveSession();
    return response;
  }

  showToast(message) {
    if (!this.toast) return;
    clearTimeout(this.toastTimer);
    this.toast.textContent = message;
    this.toast.hidden = false;
    this.toastTimer = setTimeout(() => {
      if (this.toast) this.toast.hidden = true;
    }, 3200);
  }

  validateAndMergeConfig(userConfig) {
    const defaultConfig = {
      name: 'Assistant',
      welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
      showLanguageSwitcher: true,
      theme: { primaryColor: '#3b82f6', textColor: '#333333', position: 'bottom-right' },
      apiUrl: getDefaultApiUrl(),
      frontendUrl: getDefaultFrontendUrl(),
      options: {
        autoOpen: false,
        showPoweredBy: true,
        enableSounds: false,
        enableTyping: true,
        enableMarkdown: true,
        maxMessages: 100,
        debugMode: false,
        rateLimiting: { messagesPerMinute: 15, enabled: true },
        ui: {
          borderRadius: '16px',
          shadows: true,
          animations: true,
          mobileFullScreen: true,
          colorScheme: 'light',
          avatarUrl: null,
          launcherIconUrl: null,
          showUserAvatar: false
      },
        a11y: { trapFocus: 'auto', announceMessages: true },
        features: {
          messageFeedback: true,
          conversationRating: true,
          showTimestamps: true,
          showDeliveryStatus: true,
          dateSeparators: true,
          connectivityStatus: true,
          attachments: true
        }
      }
    };

    if (!userConfig?.tenantId) {
      return null;
    }
    const config = this.deepMerge(defaultConfig, userConfig);
    if (!config.apiUrl) { console.error('VOXO api'); return null; }
    return config;
  }

  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source || {}) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target?.[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  saveSession() {
    if (this.invalid) return;
    setLocalStorage(`${SESSION_PREFIX}${this.config.tenantId}`, {
      sessionId: this.sessionId,
      messages: this.messages.slice(-50),
      lastActivity: this.lastActivityTime,
      conversationStartTime: this.conversationStartTime,
      messageCount: this.messageCount,
      inactivityReminderCount: this.inactivityReminderCount,
      userInfo: this.userInfo,
      needsUserInfo: this.needsUserInfo,
      quickRepliesLoaded: this.quickRepliesLoaded,
      quickRepliesCache: this.quickRepliesCache,
      sessionEnded: this.sessionEnded,
      serverConversationExists: this.serverConversationExists
    });
  }

  getConversationHistory() {
    const history = getLocalStorage(`${HISTORY_PREFIX}${this.config.tenantId}`, []);
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return history.filter(item => new Date(item.endedAt).getTime() >= cutoff);
  }

  archiveConversation(sessionId, messages) {
    if (!sessionId || !messages?.length) return;
    const history = this.getConversationHistory().filter(item => item.sessionId !== sessionId);
    const title = messages.find(item => item.sender === 'user')?.text || this.t('conversationLabel');
    history.unshift({ sessionId, title: title.slice(0, 80), endedAt: new Date().toISOString() });
    setLocalStorage(`${HISTORY_PREFIX}${this.config.tenantId}`, history.slice(0, 30));
  }

  async showHistory() {
    this.closeMenu();
    this.isViewingHistoryList = true;
    const history = this.getConversationHistory();
    this.messagesContainer.replaceChildren();
    if (!history.length) {
      this.messagesContainer.textContent = this.t('noHistory');
      return;
    }
    history.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vx-history-item';
      button.textContent = `${item.title} — ${new Date(item.endedAt).toLocaleDateString(this.config.locale)}`;
      button.addEventListener('click', () => this.openHistoryConversation(item.sessionId));
      this.messagesContainer.appendChild(button);
    });
  }

  async openHistoryConversation(sessionId) {
    const response = await this.api.getConversationHistory(sessionId);
    if (!response.success) throw new Error(response.error || this.t('historyUnavailable'));
    this.isViewingHistoryList = false;
    this.handoffStatus = response.data.handoffStatus || this.handoffStatus;
    this.handoffAgent = response.data.assignedAgent?.name || this.handoffAgent;
    this.updateConnectivityLabel();
    this.messages = (response.data.messages || []).map(message => ({
      id: message.id || generateUUID(), sender: message.role === 'user' ? 'user' : message.role === 'agent' ? 'agent' : 'bot',
      text: message.content, timestamp: message.timestamp, serverId: message.id,
      attachments: message.attachments || [],
    }));
    this.renderMessages();
  }

  getMediaBaseUrl() {
    return String(this.config.apiUrl || '').replace(/\/?api\/?$/, '').replace(/\/+$/, '');
  }

  getTenantLogoUrl() {
    const base = this.getMediaBaseUrl();
    return base ? `${base}/api/widget/media/${encodeURIComponent(this.config.tenantId)}/logo` : null;
  }

  getAgentAvatarUrl(userId) {
    const base = this.getMediaBaseUrl();
    return base && userId ? `${base}/api/widget/media/${encodeURIComponent(this.config.tenantId)}/avatar/${encodeURIComponent(userId)}` : null;
  }

  getBotAvatarUrl() {
    const preset = this.config.options?.ui?.avatarPreset;
    return preset ? getDefaultWidgetAssetUrl(`bot-avatars/voxo-${preset}.png`) : null;
  }

  async syncActiveConversation() {
    if (!this.serverConversationExists || this.conversationSyncInProgress) return;
    const sessionId = this.sessionId;
    this.conversationSyncInProgress = true;
    try {
      await this.openHistoryConversation(sessionId);
    } catch (error) {
      const missing = error?.status === 404 && error?.code === 'CONVERSATION_NOT_FOUND';
      if (missing && sessionId === this.sessionId) await this.clearMessages();
      else this.logSocketError(error);
    } finally {
      this.conversationSyncInProgress = false;
    }
  }

  restoreSession() {
    const data = getLocalStorage(`${SESSION_PREFIX}${this.config.tenantId}`);
    if (!data?.lastActivity) return;
    const timeout = (this.config.advanced?.sessionTimeout || 30) * 60000;
    if (Date.now() - data.lastActivity >= timeout) {
      this.archiveConversation(data.sessionId, data.messages || []);
      return;
    }
    this.sessionId = data.sessionId || this.sessionId;
    this.messages = data.messages || [];
    this.conversationStartTime = data.conversationStartTime;
    this.messageCount = data.messageCount || 0;
    this.inactivityReminderCount = data.inactivityReminderCount || 0;
    this.quickRepliesLoaded = Boolean(data.quickRepliesLoaded);
    this.quickRepliesCache = data.quickRepliesCache || [];
    this.sessionEnded = Boolean(data.sessionEnded);
    this.serverConversationExists = typeof data.serverConversationExists === 'boolean'
      ? data.serverConversationExists
      : this.messages.some(message => message.serverId && !message.metadata?.isWelcome);
    if (data.userInfo) {
      this.userInfo = data.userInfo;
      this.needsUserInfo = data.needsUserInfo ?? false;
    }
  }

  saveUserProfile() {
    if (this.userInfo) setLocalStorage(`user-profile-${this.config.tenantId}`, this.userInfo);
  }

  restoreUserProfile() {
    const profile = getLocalStorage(`user-profile-${this.config.tenantId}`);
    if (profile) {
      this.userInfo = profile;
      this.needsUserInfo = false;
    }
  }

  checkUserInfo() {
    if (this.needsUserInfo && !this.userInfo) this.showPreChatForm();
    else this.hidePreChatForm();
  }

  showPreChatForm() {
    this.setView('prechat');
    queueMicrotask(() => this.prechatView?.querySelector('input')?.focus());
  }

  hidePreChatForm() {
    this.setView('chat');
    queueMicrotask(() => this.inputField?.focus());
  }

  setView(view) {
    if (!this.chatWindow) return;
    this.chatWindow.dataset.view = ['prechat', 'rating'].includes(view) ? view : 'chat';
  }

  setUserInfo(name, email) {
    this.userInfo = { name, email };
    this.needsUserInfo = false;
    this.hidePreChatForm();
    this.saveUserProfile();
    this.saveSession();
  }

  bindEvents() {
    this.button.addEventListener('click', this.toggle);
    this.closeButton.addEventListener('click', () => this.close());
    this.minimizeButton.addEventListener('click', () => this.minimize());
    this.sendButton.addEventListener('click', this.handleSendMessage);
    this.inputField.addEventListener('keydown', this.handleKeyDown);
    this.inputField.addEventListener('input', this.handleInput);
    this.menuButton.addEventListener('click', () => this.toggleMenu());
    this.clearButton.addEventListener('click', () => this.clearMessages());
    this.historyButton.addEventListener('click', () => this.showHistory());
    this.endButton.addEventListener('click', () => this.startRating());
    this.localeSelect?.addEventListener('change', event => this.setLocale(event.target.value));
    this.root.addEventListener('keydown', this.handleRootKeyDown);
    bindAttachmentEvents(this);
  }

  renderAttachments() {
    renderPendingAttachments(
      this.attachmentsRow,
      this.attachments.items,
      localId => this.attachments.remove(localId)
    );
  }

  setupGlobalListeners() {
    document.addEventListener('pointerdown', this.handleDocumentPointerDown);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  handleInput() {
    this.autoResizeTextarea();
    this.updateLastActivity();
    this.typingEmitter?.notifyTyping(this.inputField.value);
  }

  handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.handleSendMessage();
    }
  }

  handleRootKeyDown(event) {
    if (event.key === 'Escape') {
      if (!this.menu.hidden) this.closeMenu();
      else this.close();
      return;
    }
    if (event.key !== 'Tab' || !this.shouldTrapFocus()) return;
    const focusable = this.getFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && this.root.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.root.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  shouldTrapFocus() {
    const setting = this.config.options.a11y.trapFocus;
    if (typeof setting === 'boolean') return setting;
    return this.config.options.ui.mobileFullScreen !== false
      && window.matchMedia?.('(max-width: 640px)').matches;
  }

  getFocusable() {
    if (!this.chatWindow || this.chatWindow.hidden) return [];
    return [...this.chatWindow.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]')]
      .filter(node => !node.closest('[hidden]'));
  }

  handleDocumentPointerDown(event) {
    if (this.menu?.hidden) return;
    const path = event.composedPath();
    if (!path.includes(this.menu) && !path.includes(this.menuButton)) this.closeMenu();
  }

  toggleMenu() {
    const willOpen = this.menu.hidden;
    this.menu.hidden = !willOpen;
    this.menuButton.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) this.clearButton.focus();
  }

  closeMenu() {
    if (!this.menu) return;
    this.menu.hidden = true;
    this.menuButton?.setAttribute('aria-expanded', 'false');
  }

  autoResizeTextarea() {
    if (!this.inputField) return;
    this.inputField.style.height = 'auto';
    this.inputField.style.height = `${Math.min(this.inputField.scrollHeight, 116)}px`;
  }

  async loadTenantSettings() {
    try {
      const response = await this.api.getTenantSettings();
      if (response.success && response.data?.chatbot) this.updateConfig(response.data.chatbot);
      this.setConnectivity(response.success ? 'available' : 'unavailable');
    } catch (error) {
      this.setConnectivity('unavailable');
      this.log('Erreur settings:', error);
    }
  }

  updateConfig(newConfig = {}) {
    if (this.invalid || this.isDestroyed) return this;
    const previousApiUrl = this.config.apiUrl;
    const previousTenantId = this.config.tenantId;
    this.config = this.deepMerge(this.config, newConfig);
    if (previousApiUrl !== this.config.apiUrl || previousTenantId !== this.config.tenantId) {
      this.api = new ChatAPI(this.config.apiUrl, this.config.tenantId, this.config.locale);
    }
    if (this.host) {
      applyTokens(this.host, this.config);
      this.ui.updateBrand();
      this.powered.hidden = !this.config.options.showPoweredBy;
      this.attachButton.hidden = !this.config.options.features.attachments;
      this.renderMessages();
      this.updateConnectivityLabel();
    }
    return this;
  }

  formatTime(date) {
    return new Date(date).toLocaleTimeString(this.config.locale, { hour: '2-digit', minute: '2-digit' });
  }

  formatDateLabel(date) {
    const value = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (value.toDateString() === today.toDateString()) return this.t('today');
    if (value.toDateString() === yesterday.toDateString()) return this.t('yesterday');
    return value.toLocaleDateString(this.config.locale, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  scrollToBottom() {
    requestAnimationFrame(() => {
      if (this.messagesContainer) this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    });
  }

  announce(message) {
    if (!this.liveRegion) return;
    this.liveRegion.textContent = '';
    setTimeout(() => {
      if (this.liveRegion) this.liveRegion.textContent = message;
    }, 20);
  }

  updateLastActivity() {
    this.lastActivityTime = Date.now();
  }

  resetInactivityReminders() {
    this.inactivityReminderCount = 0;
  }

  startInactivityMonitoring() {
    this.inactivityTimer = setInterval(this.checkInactivity, 60000);
  }

  async checkInactivity() {
    if (!this.isOpen || this.sessionEnded) return;
    if (Date.now() - this.lastActivityTime <= INACTIVITY_DELAY_MS) return;

    if (this.inactivityReminderCount < MAX_INACTIVITY_REMINDERS - 1) {
      this.inactivityReminderCount += 1;
      this.addMessage('bot', this.t('inactivityReminder'));
      this.updateLastActivity();
      return;
    }

    if (this.inactivityReminderCount === MAX_INACTIVITY_REMINDERS - 1) {
      this.inactivityReminderCount += 1;
      this.addMessage('bot', this.t('inactivityClosed'));
      this.updateLastActivity();
    }

    try {
      await this.endConversationForInactivity();
    } catch (error) {
      this.showToast(this.t('autoCloseFailed'));
    }
  }

  async checkConnectivity(force = false) {
    if (!force && Date.now() - this.lastHealthCheck < 55000) return;
    this.lastHealthCheck = Date.now();
    if (navigator.onLine === false) {
      this.setConnectivity('unavailable');
      return;
    }
    const result = await this.api.healthCheck();
    this.setConnectivity(result.success && result.data?.status === 'healthy' ? 'available' : 'unavailable');
  }

  setConnectivity(state) {
    this.connectivityState = state;
    this.updateConnectivityLabel();
  }

  updateConnectivityLabel() {
    if (!this.subtitleElement) return;
    this.subtitleElement.dataset.connectivity = this.connectivityState;
    if (this.handoffStatus === 'human') {
      this.subtitleElement.textContent = this.t('withAgent', { name: this.handoffAgent || this.t('agent') });
      return;
    }
    if (this.handoffStatus === 'waiting') {
      this.subtitleElement.textContent = this.t('agentNotified');
      return;
    }
    if (!this.config.options.features.connectivityStatus) {
      this.subtitleElement.textContent = this.t('assistant');
      this.subtitleElement.dataset.connectivity = 'disabled';
      return;
    }
    const labels = {
      connecting: this.t('connecting'),
      available: this.t('available'),
      unavailable: this.t('unavailable')
    };
    this.subtitleElement.textContent = labels[this.connectivityState] || labels.connecting;
  }

  handleOnline() {
    this.setConnectivity('connecting');
    if (this.isOpen) this.checkConnectivity(true);
  }

  handleOffline() {
    this.setConnectivity('unavailable');
  }

  connectConversationSocket() {
    clearTimeout(this.socketReconnectTimer);
    const previous = this.conversationSocket;
    if (previous) { previous.onclose = null; previous.close(); }
    const sessionId = this.sessionId;
    const socket = new WebSocket(this.api.conversationSocketUrl(this.sessionId));
    this.conversationSocket = socket;
    socket.onopen = () => { this.socketReconnectAttempt = 0; };
    socket.onmessage = event => {
      try { this.applyConversationEvent(JSON.parse(event.data)); }
      catch (error) { this.logSocketError(error); }
    };
    socket.onclose = () => this.scheduleSocketReconnect(sessionId);
  }

  scheduleSocketReconnect(sessionId) {
    if (this.isDestroyed || sessionId !== this.sessionId) return;
    const delay = Math.min(1000 * (2 ** this.socketReconnectAttempt++), 15000);
    this.socketReconnectTimer = setTimeout(() => this.connectConversationSocket(), delay);
  }

  logSocketError(error) {
    if (this.socketErrorLogged) return;
    this.socketErrorLogged = true;
    console.warn('VOXO socket', error?.message || error);
  }

  applyConversationEvent(event) {
    if (event.handoff) {
      this.handoffStatus = event.handoff.status;
      this.handoffAgent = event.handoff.assignedAgent?.name || null;
      this.updateConnectivityLabel();
    }
    if (event.type === 'conversation.sync') this.syncActiveConversation();
    if (event.type === 'message' && event.message?.role === 'agent' && !this.messages.some(item => item.serverId === event.message.id)) {
      this.addMessage('agent', event.message.content, [], { serverId: event.message.id, id: event.message.id, attachments: event.message.attachments || [] });
    }
  }

  getUserId() {
    let id = getLocalStorage('user-id');
    if (!id) {
      id = `user-${generateUUID()}`;
      setLocalStorage('user-id', id);
    }
    return id;
  }

  getMetadata() {
    return { url: window.location.href, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, locale: this.config.locale };
  }

  t(key, values) { return translate(this.config.locale, key, values); }

  async setLocale(locale) {
    this.config.locale = resolveLocale({ locale, tenantId: this.config.tenantId });
    saveLocale(this.config.tenantId, this.config.locale);
    this.api.locale = this.config.locale;
    if (this.chatWindow) this.chatWindow.lang = this.config.locale;
    this.refreshLocalizedUI();
    if (this.localeSelect) this.localeSelect.value = this.config.locale;
    await this.loadTenantSettings();
    // Si l'historique est affiché, on le régénère dans la nouvelle langue au
    // lieu de revenir silencieusement à la vue de conversation.
    if (this.isViewingHistoryList) this.showHistory();
    else this.renderMessages();
    return this;
  }

  // Ré-applique la langue aux éléments DÉJÀ RENDUS (pas seulement aux
  // prochains éléments créés) : chrome du panneau, formulaire pré-chat,
  // panneau d'évaluation. L'historique affiché est traité à part dans
  // setLocale(), puisqu'il remplace tout le contenu de messagesContainer.
  refreshLocalizedUI() {
    if (!this.root) return;
    const text = (selector, key) => { const node = this.root.querySelector(selector); if (node) node.lastChild.textContent = this.t(key); };
    text('.vx-channel-pill', 'messages'); text('.vx-tagline', 'tagline');
    text('.vx-menu-item:nth-child(1)', 'history'); text('.vx-menu-item:nth-child(2)', 'clear');
    text('.vx-menu-item:nth-child(3)', 'endAndRate');
    if (this.inputField) this.inputField.placeholder = this.t('placeholder');
    if (this.powered?.firstChild) this.powered.firstChild.textContent = this.t('powered');
    if (this.ratingComment) this.ratingComment.placeholder = this.t('commentPlaceholder');
    if (this.ratingSubmit) this.ratingSubmit.textContent = this.t('sendRating');
    if (this.ratingCancel) this.ratingCancel.textContent = this.t('cancel');
    this.refreshPreChatForm();
    this.refreshRatingView();
    this.updateConnectivityLabel();
  }

  refreshPreChatForm() {
    const view = this.prechatView;
    if (!view) return;
    const title = view.querySelector('h2');
    if (title) title.textContent = this.t('prechatTitle');
    const copy = view.querySelector('p:not(.vx-form-error)');
    if (copy) copy.textContent = this.t('prechatCopy');
    const nameLabel = view.querySelector('label[for="vx-user-name"]');
    if (nameLabel) nameLabel.textContent = this.t('fullName');
    const emailLabel = view.querySelector('label[for="vx-user-email"]');
    if (emailLabel) emailLabel.textContent = this.t('email');
    const submit = view.querySelector('button[type="submit"]');
    if (submit) submit.textContent = this.t('start');
  }

  refreshRatingView() {
    const view = this.ratingView;
    if (!view) return;
    const title = view.querySelector('h2');
    if (title) title.textContent = this.t('ratingTitle');
    const copy = view.querySelector('.vx-rating-copy');
    if (copy) copy.textContent = this.t('ratingCopy');
    const label = view.querySelector('.vx-rating-label');
    if (label) label.textContent = this.t('optionalComment');
    if (this.ratingGroup) {
      this.ratingGroup.setAttribute('aria-label', this.t('ratingGroup'));
      [...this.ratingGroup.querySelectorAll('[role="radio"]')].forEach((star, index) => {
        const value = index + 1;
        star.setAttribute('aria-label', this.t(value > 1 ? 'stars' : 'star', { count: value }));
      });
    }
  }

  checkBrowserCompatibility() {
    const supported = typeof window.fetch === 'function'
      && typeof window.Promise !== 'undefined'
      && typeof Element.prototype.attachShadow === 'function';
    if (!supported) console.error('[VOXO Widget] Ce navigateur ne prend pas en charge les fonctionnalités requises.');
    return supported;
  }

  toggleLoadingState(isLoading) {
    if (!this.sendButton) return;
    this.sendButton.disabled = isLoading;
    this.sendButton.setAttribute('aria-busy', String(isLoading));
  }

  showErrorMessage(error) {
    this.showToast(error || this.t('technicalError'));
  }

  retryLastMessage() {
    const last = [...this.messages].reverse().find(message => message.sender === 'user' && message.deliveryStatus === 'failed');
    if (last) this.retryMessage(last.id);
  }

  retryMessage(messageId) {
    const message = this.messages.find(item => item.id === messageId && item.sender === 'user');
    if (message && message.deliveryStatus === 'failed') return this.handleSendMessage(message);
    return null;
  }

  checkRateLimit() {
    const now = Date.now();
    this.messagesSent = this.messagesSent.filter(time => now - time < this.rateLimitWindow);
    if (this.messagesSent.length >= this.config.options.rateLimiting.messagesPerMinute) return false;
    this.messagesSent.push(now);
    return true;
  }

  log(...args) {
    if (this.config.options.debugMode) console.log('[VOXO Widget]', ...args);
  }

  executeCallback(name, data) {
    if (typeof this.config.callbacks?.[name] === 'function') this.config.callbacks[name](data);
  }

  handleBeforeUnload() {
    this.saveSession();
  }

  generateSessionId() {
    return generateUUID();
  }

  playNotificationSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.frequency.setValueAtTime(800, context.currentTime);
      gain.gain.setValueAtTime(0.1, context.currentTime);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.1);
    } catch {}
  }

  async addWelcomeMessage() {
    if (!this.config.welcomeMessage || this.messages.length > 0) return;
    let suggestions = this.quickRepliesCache;
    if (!this.quickRepliesLoaded) {
      this.quickRepliesLoaded = true;
      try {
        const response = await this.api.getQuickReplies('greeting');
        if (response.success) {
          suggestions = response.data.suggestions || [];
          this.quickRepliesCache = suggestions;
        }
      } catch {}
    }
    if (this.isDestroyed) return;
    this.addMessage('bot', this.config.welcomeMessage, suggestions, { isWelcome: true });
  }
}
