import type { JsonObject } from '../core/envelope'
import { numberAt, stringAt } from '../core/envelope'

/** Nature d'une pièce jointe, telle que le backend la classe. */
export type VoxoAttachmentCategory = 'image' | 'document'

export function categoryFromApi(value: unknown): VoxoAttachmentCategory | undefined {
  return value === 'image' || value === 'document' ? value : undefined
}

/**
 * Pièce jointe connue du serveur : soit fraîchement envoyée via
 * `POST /widget/upload`, soit lue dans l'historique d'une conversation.
 */
export interface VoxoAttachment {
  /** UUID v4 renvoyé par l'upload, à placer dans `attachmentIds` d'un message. */
  id: string
  name: string
  category?: VoxoAttachmentCategory
  mimeType?: string
  size?: number
  /**
   * URL **signée et à durée de vie limitée**, présente uniquement sur les pièces
   * lues dans l'historique. Ne pas la mettre en cache durablement : elle expire,
   * et un rechargement de l'historique en fournit une neuve.
   */
  url?: string
}

export function attachmentFromApi(json: JsonObject): VoxoAttachment {
  return {
    id: stringAt(json, 'id') ?? '',
    name: stringAt(json, 'name') ?? 'Fichier',
    category: categoryFromApi(json.category),
    mimeType: stringAt(json, 'mimeType'),
    size: numberAt(json, 'size'),
    url: stringAt(json, 'url'),
  }
}

/**
 * Forme persistée. L'URL signée est volontairement exclue : elle expire, la
 * persister reviendrait à restaurer un lien mort au prochain démarrage.
 */
export function attachmentToJson(attachment: VoxoAttachment): JsonObject {
  return {
    id: attachment.id,
    name: attachment.name,
    ...(attachment.category ? { category: attachment.category } : {}),
    ...(attachment.mimeType ? { mimeType: attachment.mimeType } : {}),
    ...(attachment.size !== undefined ? { size: attachment.size } : {}),
  }
}

export function isImageAttachment(attachment: VoxoAttachment): boolean {
  return attachment.category === 'image'
}

/**
 * Pièce jointe en cours de préparation locale, avant d'être rattachée à un
 * message. Elle traverse trois états : compression, envoi, prête.
 */
export interface VoxoPendingAttachment {
  /** Identifiant local, stable pendant toute la vie de l'élément dans la file. */
  localId: string
  name: string
  size: number
  category: VoxoAttachmentCategory
  /**
   * URI du fichier sur l'appareil, après compression éventuelle. Sert à
   * l'aperçu et à l'envoi.
   */
  uri: string
  /** Type MIME à annoncer dans le multipart. */
  mimeType?: string
  /** Renseigné une fois l'upload réussi : c'est l'identifiant serveur. */
  remoteId?: string
}

export function isUploaded(item: VoxoPendingAttachment): boolean {
  return item.remoteId !== undefined
}
