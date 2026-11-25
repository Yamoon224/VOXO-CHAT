import { icon } from './icons.js';
import { renderMessageContent } from './markdown.js';
import { ACCEPT as ATTACHMENT_ACCEPT } from './attachments.js';
import { createAttachmentList } from './attachment-ui.js';
import { createAvatar, createBrandAvatar, renderLauncherIcon } from './branding-ui.js';
import { translate } from './i18n.js';

// Littéraux obligatoires : le build compacte les noms de classes, une classe
// assemblée à l'exécution échapperait au renommage appliqué au CSS.
const ROLE_CLASSES = { user: 'vx-user', bot: 'vx-bot', agent: 'vx-agent' };

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function actionButton(className, label, iconName, size = 18) {
  const button = element('button', className);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.appendChild(icon(iconName, size));
  return button;
}

export class UIBuilder {
  constructor(widget) {
    this.widget = widget;
  }

  // La locale n'est résolue qu'une fois, à l'initialisation du widget
  // (this.widget.config.locale) ; on se contente ici de la relire à chaque
  // rendu, jamais de la re-résoudre depuis config/localStorage/navigator.
  t(key, values) {
    return translate(this.widget.config.locale, key, values);
  }

  createWidget() {
    const shell = element('div', 'vx-shell');

    const launcher = actionButton('vx-launcher', this.t('open'), 'chat', 24);
    launcher.setAttribute('aria-controls', 'vx-chat-panel');
    launcher.setAttribute('aria-expanded', 'false');
    renderLauncherIcon(this.widget, launcher);

    const panel = element('section', 'vx-panel');
    panel.id = 'vx-chat-panel';
    panel.hidden = true;
    panel.dataset.view = 'chat';
    panel.dataset.minimized = 'false';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'vx-chat-title');
    panel.lang = this.widget.config.locale;

    const header = element('header', 'vx-header');
    const headerTop = element('div', 'vx-header-top');
    const headerSpacer = element('span', 'vx-header-spacer');
    headerSpacer.setAttribute('aria-hidden', 'true');
    const channelPill = element('div', 'vx-channel-pill');
    channelPill.append(icon('chat', 17), document.createTextNode(this.t('messages')));
    const brandStage = element('div', 'vx-brand-stage');
    const brandAvatar = createBrandAvatar(this.widget);
    const brandCopy = element('div', 'vx-brand-copy');
    const title = element('h2', 'vx-title', this.widget.config.name);
    title.id = 'vx-chat-title';
    const tagline = element('p', 'vx-tagline', this.t('tagline'));
    const status = element('div', 'vx-status');
    const subtitle = element('span', 'vx-subtitle', this.t('connecting'));
    status.appendChild(subtitle);
    brandCopy.append(title, tagline, status);

    const headerActions = element('div', 'vx-header-actions');
    const localeSelect = element('select', 'vx-locale-select');
    localeSelect.setAttribute('aria-label', this.t('language'));
    localeSelect.append(element('option', '', 'FR'), element('option', '', 'EN'));
    localeSelect.options[0].value = 'fr'; localeSelect.options[1].value = 'en';
    localeSelect.value = this.widget.config.locale;
    localeSelect.hidden = this.widget.config.showLanguageSwitcher === false;
    const minimizeButton = actionButton('vx-icon-button', this.t('minimize'), 'chevronDown');
    const closeButton = actionButton('vx-icon-button', this.t('close'), 'close');
    headerActions.append(localeSelect, minimizeButton, closeButton);
    headerTop.append(headerSpacer, channelPill, headerActions);
    brandStage.append(brandAvatar, brandCopy);
    header.append(headerTop, brandStage);

    const chatView = element('div', 'vx-chat-view');
    const messages = element('div', 'vx-messages');
    messages.setAttribute('role', 'log');
    messages.setAttribute('aria-live', 'off');
    messages.setAttribute('aria-label', this.t('conversation'));

    const composerWrap = element('div', 'vx-composer-wrap');
    const menu = element('div', 'vx-menu');
    menu.id = 'vx-composer-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    // Action directe dans le composeur : l'upload reste découvrable sans ouvrir le menu.
    const attachButton = actionButton('vx-composer-action vx-attach', this.t('attach'), 'paperclip', 18);
    attachButton.hidden = !this.widget.config.options.features.attachments;

    const clearButton = actionButton('vx-menu-item', this.t('clear'), 'trash', 17);
    clearButton.appendChild(document.createTextNode(this.t('clear')));
    clearButton.setAttribute('role', 'menuitem');
    const historyButton = actionButton('vx-menu-item', this.t('history'), 'clock', 17);
    historyButton.appendChild(document.createTextNode(this.t('history')));
    historyButton.setAttribute('role', 'menuitem');
    const endButton = actionButton('vx-menu-item', this.t('endAndRate'), 'star', 17);
    endButton.appendChild(document.createTextNode(this.t('endAndRate')));
    endButton.setAttribute('role', 'menuitem');
    endButton.hidden = true;
    menu.append(historyButton, clearButton, endButton);

    // Rangée des pièces jointes en attente, au-dessus du champ de saisie
    const attachments = element('div', 'vx-attachments');
    attachments.hidden = true;
    const fileInput = element('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = ATTACHMENT_ACCEPT;
    fileInput.hidden = true;

    const composer = element('div', 'vx-composer');
    const composerToolbar = element('div', 'vx-composer-toolbar');
    const composerOptions = element('div', 'vx-composer-options');
    const menuButton = actionButton('vx-composer-action', this.t('more'), 'more');
    menuButton.setAttribute('aria-controls', menu.id);
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-haspopup', 'menu');
    const input = element('textarea', 'vx-input');
    input.rows = 1;
    input.maxLength = 2000;
    input.placeholder = this.t('placeholder');
    input.setAttribute('aria-label', this.t('messageLabel'));
    const sendButton = actionButton('vx-composer-action vx-send', this.t('send'), 'send', 18);
    composerOptions.append(menuButton, attachButton);
    composerToolbar.append(composerOptions, sendButton);
    composer.append(input, composerToolbar);
    composerWrap.append(menu, attachments, composer, fileInput);
    chatView.append(messages, composerWrap);

    const prechatView = this.createPreChatForm();
    const rating = this.createRatingView();
    const powered = element('div', 'vx-powered');
    const poweredLink = element('a', '', 'VOXO');
    poweredLink.href = this.widget.config.frontendUrl;
    poweredLink.target = '_blank';
    poweredLink.rel = 'noopener noreferrer';
    powered.append(this.t('powered'), poweredLink);
    powered.hidden = !this.widget.config.options.showPoweredBy;

    const liveRegion = element('div', 'vx-live');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');

    const toast = element('div', 'vx-toast');
    toast.hidden = true;
    toast.setAttribute('role', 'status');
    panel.append(header, chatView, prechatView, rating.view, powered, toast, liveRegion);
    shell.append(panel, launcher);

    return {
      shell,
      launcher,
      panel,
      messages,
      input,
      sendButton,
      menu,
      menuButton,
      attachButton,
      attachments,
      fileInput,
      clearButton,
      historyButton,
      endButton,
      minimizeButton,
      closeButton,
      localeSelect,
      title,
      subtitle,
      brandAvatar,
      powered,
      liveRegion,
      prechatView,
      ratingView: rating.view,
      ratingGroup: rating.group,
      ratingComment: rating.comment,
      ratingSubmit: rating.submit,
      ratingCancel: rating.cancel,
      ratingError: rating.error,
      toast
    };
  }

  renderMessage(message, container, previousMessage = null) {
    const grouped = Boolean(previousMessage
      && previousMessage.sender === message.sender
      && new Date(message.timestamp) - new Date(previousMessage.timestamp) <= 5 * 60 * 1000);
    const row = element('article', `vx-message ${ROLE_CLASSES[message.sender] || ROLE_CLASSES.bot}`);
    row.dataset.grouped = String(grouped);
    if (message.metadata?.isWelcome) row.dataset.welcome = 'true';
    row.setAttribute('role', 'listitem');

    this.widget.currentMessageAgentId = message.metadata?.agentId || message.agentId || null;
    const avatar = createAvatar(this.widget, 'vx-message-avatar', message.sender);
    this.widget.currentMessageAgentId = null;
    if (message.sender === 'user' && !this.widget.config.options.ui.showUserAvatar) {
      avatar.setAttribute('aria-hidden', 'true');
      avatar.classList.add('vx-avatar-hidden');
    }

    const content = element('div', 'vx-message-content');
    const bubble = element('div', 'vx-bubble');
    if (message.metadata?.isError) bubble.classList.add('vx-error');
    if (message.metadata?.isWelcome) {
      const label = element('div', 'vx-welcome-label');
      label.append(icon('sparkle', 15), document.createTextNode(this.t('welcome')));
      bubble.appendChild(label);
    }
    if (message.attachments?.length) {
      bubble.appendChild(createAttachmentList(message.attachments));
    }

    const useMarkdown = message.sender !== 'user' && this.widget.config.options.enableMarkdown;
    if (message.text) {
      const renderedContent = element('div', useMarkdown ? 'vx-md' : 'vx-text');
      renderedContent.appendChild(renderMessageContent(message.text, useMarkdown));
      bubble.appendChild(renderedContent);
    }

    if (message.metadata?.retryable) {
      const retry = actionButton('vx-retry', this.t('retry'), 'retry', 14);
      retry.appendChild(document.createTextNode(` ${this.t('retry')}`));
      retry.addEventListener('click', () => this.widget.retryLastMessage());
      bubble.appendChild(retry);
    }

    if (message.sender === 'bot' && message.suggestions?.length > 0 && !message.metadata?.suggestionsHidden) {
      bubble.appendChild(this.createSuggestions(message.suggestions));
    }

    const time = element('div', 'vx-timestamp', this.widget.formatTime(message.timestamp));
    time.hidden = !this.widget.config.options.features.showTimestamps;
    const footer = element('div', 'vx-message-footer');
    footer.appendChild(time);

    if (message.sender === 'user' && this.widget.config.options.features.showDeliveryStatus) {
      footer.appendChild(this.createDeliveryStatus(message));
    }
    if (message.sender !== 'user' && !message.metadata?.isWelcome) {
      footer.appendChild(this.createMessageActions(message));
    }
    content.append(bubble, footer);
    if (message.sender === 'user') row.append(content, avatar);
    else row.append(avatar, content);

    if (grouped && container.lastElementChild?.classList.contains('vx-message')) {
      container.lastElementChild.dataset.hideTime = 'true';
    }
    container.appendChild(row);
    return row;
  }

  createDeliveryStatus(message) {
    const status = message.deliveryStatus || 'answered';
    const labels = {
      sending: this.t('sending'),
      answered: this.t('answered'),
      failed: this.t('failed')
    };
    const icons = { sending: 'clock', answered: 'check', failed: 'alert' };
    const wrapper = element('span', 'vx-delivery-status', labels[status] || labels.answered);
    wrapper.dataset.status = status;
    wrapper.prepend(icon(icons[status] || 'check', 12));
    if (status === 'failed') {
      const retry = element('button', 'vx-inline-retry', this.t('retry'));
      retry.type = 'button';
      retry.addEventListener('click', () => this.widget.retryMessage(message.id));
      wrapper.appendChild(retry);
    }
    return wrapper;
  }

  createMessageActions(message) {
    const actions = element('span', 'vx-message-actions');
    const copy = actionButton('vx-message-action', this.t('copyResponse'), 'copy', 14);
    copy.addEventListener('click', () => this.widget.copyMessage(message));
    actions.appendChild(copy);
    if (message.serverId && this.widget.config.options.features.messageFeedback) {
      const up = actionButton('vx-message-action', this.t('useful'), 'thumbUp', 14);
      const down = actionButton('vx-message-action', this.t('notUseful'), 'thumbDown', 14);
      up.setAttribute('aria-pressed', String(message.feedback === 'up'));
      down.setAttribute('aria-pressed', String(message.feedback === 'down'));
      up.addEventListener('click', () => this.widget.submitMessageFeedback(message, 'up'));
      down.addEventListener('click', () => this.widget.submitMessageFeedback(message, 'down'));
      actions.append(up, down);
    }
    return actions;
  }

  createDateSeparator(label) {
    const separator = element('div', 'vx-date-separator');
    separator.setAttribute('role', 'separator');
    separator.setAttribute('aria-label', label);
    separator.appendChild(element('span', '', label));
    return separator;
  }

  createTypingIndicator() {
    const indicator = element('div', 'vx-typing');
    const dots = element('span', 'vx-typing-dots');
    for (let index = 0; index < 3; index++) dots.appendChild(element('span', 'vx-typing-dot'));
    indicator.append(dots, document.createTextNode(this.t('typing')));
    return indicator;
  }

  createSuggestions(suggestions) {
    const container = element('div', 'vx-suggestions');
    container.setAttribute('aria-label', this.t('suggestions'));
    suggestions.forEach((suggestion, index) => {
      const chip = element('button', 'vx-chip', suggestion);
      chip.type = 'button';
      chip.dataset.index = String(index);
      chip.addEventListener('click', () => this.widget.sendMessage(suggestion));
      chip.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const chips = [...container.querySelectorAll('.vx-chip')];
        const offset = event.key === 'ArrowRight' ? 1 : -1;
        chips[(index + offset + chips.length) % chips.length]?.focus();
      });
      container.appendChild(chip);
    });
    return container;
  }

  createPreChatForm() {
    const view = element('div', 'vx-prechat-view');
    const form = element('form', 'vx-prechat-card');
    form.noValidate = true;
    const title = element('h2', '', this.t('prechatTitle'));
    const copy = element('p', '', this.t('prechatCopy'));

    const nameField = element('div', 'vx-field');
    const nameLabel = element('label', '', this.t('fullName'));
    nameLabel.htmlFor = 'vx-user-name';
    const nameInput = element('input');
    nameInput.id = 'vx-user-name';
    nameInput.name = 'name';
    nameInput.autocomplete = 'name';
    nameInput.required = true;
    nameField.append(nameLabel, nameInput);

    const emailField = element('div', 'vx-field');
    const emailLabel = element('label', '', this.t('email'));
    emailLabel.htmlFor = 'vx-user-email';
    const emailInput = element('input');
    emailInput.id = 'vx-user-email';
    emailInput.name = 'email';
    emailInput.type = 'email';
    emailInput.autocomplete = 'email';
    emailInput.required = true;
    emailField.append(emailLabel, emailInput);

    const error = element('p', 'vx-form-error');
    error.setAttribute('role', 'alert');
    const submit = element('button', 'vx-primary-button', this.t('start'));
    submit.type = 'submit';
    form.append(title, copy, nameField, emailField, error, submit);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      nameInput.setAttribute('aria-invalid', String(!name));
      emailInput.setAttribute('aria-invalid', String(!validEmail));
      if (!name || !validEmail) {
        error.textContent = !name
          ? this.t('nameRequired')
          : this.t('emailInvalid');
        (!name ? nameInput : emailInput).focus();
        return;
      }
      error.textContent = '';
      this.widget.setUserInfo(name, email);
    });
    view.appendChild(form);
    return view;
  }

  createRatingView() {
    const view = element('div', 'vx-rating-view');
    const card = element('form', 'vx-rating-card');
    card.noValidate = true;
    card.append(
      element('h2', '', this.t('ratingTitle')),
      element('p', 'vx-rating-copy', this.t('ratingCopy'))
    );

    const group = element('div', 'vx-rating-stars');
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', this.t('ratingGroup'));
    for (let value = 1; value <= 5; value++) {
      const star = actionButton('vx-rating-star', this.t(value > 1 ? 'stars' : 'star', { count: value }), 'star', 28);
      star.dataset.value = String(value);
      star.setAttribute('role', 'radio');
      star.setAttribute('aria-checked', 'false');
      star.tabIndex = value === 1 ? 0 : -1;
      star.addEventListener('click', () => this.widget.selectRating(value));
      star.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const offset = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1;
        const next = Math.max(1, Math.min(5, value + offset));
        this.widget.selectRating(next, true);
      });
      group.appendChild(star);
    }

    const label = element('label', 'vx-rating-label', this.t('optionalComment'));
    label.htmlFor = 'vx-rating-comment';
    const comment = element('textarea', 'vx-rating-comment');
    comment.id = 'vx-rating-comment';
    comment.maxLength = 1000;
    comment.rows = 4;
    comment.placeholder = this.t('commentPlaceholder');
    const error = element('p', 'vx-form-error');
    error.setAttribute('role', 'alert');
    const buttons = element('div', 'vx-rating-buttons');
    const cancel = element('button', 'vx-secondary-button', this.t('cancel'));
    cancel.type = 'button';
    const submit = element('button', 'vx-primary-button', this.t('sendRating'));
    submit.type = 'submit';
    buttons.append(cancel, submit);
    card.append(group, label, comment, error, buttons);
    card.addEventListener('submit', event => {
      event.preventDefault();
      this.widget.submitRating();
    });
    cancel.addEventListener('click', () => this.widget.cancelRating());
    view.appendChild(card);
    return { view, group, comment, submit, cancel, error };
  }

  updateBrand() {
    this.widget.titleElement.textContent = this.widget.config.name;
    this.widget.brandAvatar.replaceWith(createBrandAvatar(this.widget));
    this.widget.brandAvatar = this.widget.root.querySelector('.vx-brand-avatar-group');
    renderLauncherIcon(this.widget);
  }
}
