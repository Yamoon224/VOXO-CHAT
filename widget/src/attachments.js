// widget/src/attachments.js - Sélection, compression et envoi des pièces jointes.
// Les règles de format et de taille viennent de shared/file-rules.mjs, partagé
// avec le dashboard : c'est du code source bundlé par Vite, pas une dépendance
// npm, la règle « zéro dépendance runtime » du widget reste respectée.
import { prepareFile, MAX_ATTACHMENTS_PER_MESSAGE, acceptAttribute } from './file-rules.mjs';
import { translate } from './i18n.js';

export const ACCEPT = acceptAttribute('conversation');

/**
 * Gère le lot de pièces en attente d'envoi.
 * Chaque entrée passe par trois états : compression, envoi, prête.
 */
export class AttachmentQueue {
  constructor({ api, onChange, onError, getLocale, maxFiles = MAX_ATTACHMENTS_PER_MESSAGE }) {
    this.api = api;
    this.onChange = onChange;
    this.onError = onError;
    // La locale n'est résolue qu'une fois, à l'initialisation du widget ; ce
    // getter lit simplement la valeur courante (mise à jour par setLocale()),
    // il ne la re-résout jamais depuis config/localStorage/navigator.
    this.getLocale = getLocale || (() => 'fr');
    this.maxFiles = maxFiles;
    this.items = [];
  }

  t(key, values) {
    return translate(this.getLocale(), key, values);
  }

  get ready() {
    return this.items.filter(item => item.id);
  }

  get isUploading() {
    return this.items.some(item => !item.id && !item.failed);
  }

  ids() {
    return this.ready.map(item => item.id);
  }

  clear() {
    this.items.forEach(item => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    this.items = [];
    this.onChange?.();
  }

  remove(localId) {
    const item = this.items.find(entry => entry.localId === localId);
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    this.items = this.items.filter(entry => entry.localId !== localId);
    this.onChange?.();
  }

  /** Compresse, valide, puis envoie chaque fichier retenu. */
  async add(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const room = this.maxFiles - this.items.length;
    if (room <= 0) {
      this.onError?.(this.t('attachmentLimit', { count: this.maxFiles }));
      return;
    }
    if (files.length > room) {
      this.onError?.(this.t('attachmentRoom', { count: room }));
    }

    for (const file of files.slice(0, room)) {
      await this.addOne(file);
    }
  }

  async addOne(file) {
    const { file: prepared, valid, error, category } = await prepareFile(file, 'conversation');
    if (!valid) {
      this.onError?.(error);
      return;
    }

    const item = {
      localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      id: null,
      name: prepared.name,
      size: prepared.size,
      category,
      failed: false,
      previewUrl: category === 'image' ? URL.createObjectURL(prepared) : null
    };
    this.items.push(item);
    this.onChange?.();

    try {
      const response = await this.api.uploadAttachment(prepared);
      if (!response?.success || !response.data?.id) {
        throw new Error(response?.error || this.t('uploadFailed'));
      }
      item.id = response.data.id;
    } catch (error) {
      item.failed = true;
      this.onError?.(error.message || this.t('uploadFailed'));
      this.remove(item.localId);
      return;
    }
    this.onChange?.();
  }
}

/** Extrait les fichiers d'un événement de dépôt ou de collage. */
export function filesFromEvent(event) {
  const transfer = event.dataTransfer || event.clipboardData;
  if (!transfer) return [];
  if (transfer.files?.length) return Array.from(transfer.files);

  return Array.from(transfer.items || [])
    .filter(item => item.kind === 'file')
    .map(item => item.getAsFile())
    .filter(Boolean);
}
