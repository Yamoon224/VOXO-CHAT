import type { VoxoAttachmentCategory } from './models/attachment'
import { voxoText, type VoxoLocale } from './i18n'

/**
 * Miroir TypeScript de `shared/file-rules.mjs`, lui-même miroir de
 * `backend/src/config/fileUploads.js`.
 *
 * **Toute modification doit être reportée des trois côtés** : les extensions
 * acceptées et les messages d'erreur sont ceux que le widget web affiche déjà,
 * pour que l'expérience soit identique quel que soit le canal.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_ATTACHMENTS_PER_MESSAGE = 3

/**
 * Extension -> type MIME canonique. L'extension fait autorité : les sélecteurs
 * de fichiers annoncent souvent un type vide pour `.md` et `.csv`.
 */
export const DOCUMENT_EXTENSIONS: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
}

export const IMAGE_EXTENSIONS: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
}

/** Une conversation accepte documents et images. */
export const CONVERSATION_EXTENSIONS: Record<string, string> = {
  ...DOCUMENT_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
}

/** Extensions sans le point, pour les sélecteurs qui filtrent par extension. */
export const ALLOWED_EXTENSIONS: string[] = Object.keys(CONVERSATION_EXTENSIONS).map((extension) =>
  extension.slice(1),
)

export function extensionOf(filename: string): string {
  const match = /\.[^.]+$/.exec((filename ?? '').toLowerCase())
  return match ? match[0] : ''
}

export function categoryOf(filename: string): VoxoAttachmentCategory | null {
  const extension = extensionOf(filename)
  if (extension in IMAGE_EXTENSIONS) return 'image'
  if (extension in DOCUMENT_EXTENSIONS) return 'document'
  return null
}

export function mimeTypeOf(filename: string): string | undefined {
  return CONVERSATION_EXTENSIONS[extensionOf(filename)]
}

/** Formate une taille comme le widget web : « 1,5 Mo » ou « 320 Ko ». */
export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
  }
  const kilobytes = Math.round(bytes / 1024)
  return `${kilobytes < 1 ? 1 : kilobytes} Ko`
}

export interface VoxoFileValidation {
  isValid: boolean
  /** Message affichable tel quel, dans la locale demandée (français par défaut). */
  error?: string
  category?: VoxoAttachmentCategory
}

/**
 * Valide un fichier **déjà compressé** : la limite porte sur l'envoi réel.
 *
 * `maxBytes` permet d'appliquer la limite annoncée par `GET /widget/config`
 * plutôt que la constante locale. `locale` retombe sur `'fr'` par défaut, pour
 * qu'un appelant existant sans quatrième argument continue de fonctionner à
 * l'identique.
 */
export function validateFile(
  filename: string,
  sizeBytes: number,
  maxBytes: number = MAX_FILE_BYTES,
  locale: VoxoLocale = 'fr',
): VoxoFileValidation {
  if (!(sizeBytes > 0)) {
    return { isValid: false, error: voxoText(locale, 'fileEmpty') }
  }

  const category = categoryOf(filename)
  if (category === null) {
    const list = Object.keys(CONVERSATION_EXTENSIONS).join(', ')
    return { isValid: false, error: voxoText(locale, 'fileUnsupportedFormat', { list }) }
  }

  if (sizeBytes > maxBytes) {
    return {
      isValid: false,
      error: voxoText(locale, 'fileTooLarge', {
        size: formatSize(sizeBytes),
        max: formatSize(maxBytes),
      }),
    }
  }

  return { isValid: true, category }
}
