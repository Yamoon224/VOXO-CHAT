// widget/src/attachment-ui.js - DOM et événements des pièces jointes.
// Séparé de ui-builder.js et widget.js, tous deux déjà au-delà de la limite
// de 250 lignes : la fonctionnalité ne doit pas les faire grossir.
import { icon } from './icons.js';
import { filesFromEvent } from './attachments.js';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Puces des fichiers joints à un message déjà envoyé (lecture seule). */
export function createAttachmentList(attachments) {
  const list = element('div', 'vx-message-files');
  attachments.forEach(file => {
    const chip = file.url ? element('a', 'vx-file-chip') : element('span', 'vx-file-chip');
    if (file.url) { chip.href = file.url; chip.target = '_blank'; chip.rel = 'noopener noreferrer'; }
    if (file.category === 'image' && file.url) {
      const preview = document.createElement('img');
      preview.src = file.url; preview.alt = file.name; preview.className = 'vx-file-preview';
      chip.appendChild(preview);
    }
    chip.append(icon('file', 14), element('span', 'vx-file-name', file.name));
    chip.title = file.name;
    list.appendChild(chip);
  });
  return list;
}

/**
 * Puces des pièces en attente d'envoi, chacune retirable.
 * Une image affiche sa vignette, un document une icône.
 */
export function renderPendingAttachments(container, items, onRemove) {
  container.textContent = '';
  container.hidden = items.length === 0;

  items.forEach(item => {
    const chip = element('span', 'vx-file-chip');
    if (!item.id) chip.classList.add('vx-file-pending');

    if (item.previewUrl) {
      const thumb = element('img', 'vx-file-thumb');
      thumb.src = item.previewUrl;
      thumb.alt = '';
      chip.appendChild(thumb);
    } else {
      chip.appendChild(icon('file', 14));
    }

    chip.appendChild(element('span', 'vx-file-name', item.name));
    chip.title = item.name;

    const remove = element('button', 'vx-file-remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Retirer ${item.name}`);
    remove.appendChild(icon('close', 12));
    remove.addEventListener('click', () => onRemove(item.localId));
    chip.appendChild(remove);

    container.appendChild(chip);
  });
}

/** Bouton du menu, sélecteur de fichier, glisser-déposer et collage. */
export function bindAttachmentEvents(widget) {
  const { attachButton, fileInput, chatWindow, inputField, attachments } = widget;

  attachButton.addEventListener('click', () => {
    widget.closeMenu();
    fileInput.click();
  });

  fileInput.addEventListener('change', event => {
    attachments.add(event.target.files);
    event.target.value = '';
  });

  chatWindow.addEventListener('dragover', event => {
    event.preventDefault();
    chatWindow.classList.add('vx-dropping');
  });
  chatWindow.addEventListener('dragleave', () => chatWindow.classList.remove('vx-dropping'));
  chatWindow.addEventListener('drop', event => {
    event.preventDefault();
    chatWindow.classList.remove('vx-dropping');
    attachments.add(filesFromEvent(event));
  });

  inputField.addEventListener('paste', event => {
    const files = filesFromEvent(event);
    if (files.length > 0) {
      event.preventDefault();
      attachments.add(files);
    }
  });
}
