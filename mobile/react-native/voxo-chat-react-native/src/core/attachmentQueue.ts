import type { VoxoFilePicker, VoxoImageCompressor, VoxoPickedFile } from '../adapters/types'
import type { VoxoPendingAttachment } from '../models/attachment'
import { isUploaded } from '../models/attachment'
import type { VoxoApiClient } from './apiClient'
import type { VoxoConfig } from './config'
import { VoxoError } from './errors'
import { MAX_ATTACHMENTS_PER_MESSAGE, MAX_FILE_BYTES, mimeTypeOf, validateFile } from '../fileRules'
import { voxoText } from '../i18n'
import { uuidV4 } from './uuid'

export interface AttachmentQueueOptions {
  api: VoxoApiClient
  config: VoxoConfig
  picker: VoxoFilePicker
  compressor: VoxoImageCompressor
  /** Notifie d'un changement de la file. */
  onChanged: () => void
  /** Remonte un message d'erreur affichable tel quel, dans la locale active. */
  onError: (message: string) => void
}

/**
 * File des pièces jointes en attente d'être rattachées à un message.
 *
 * Chaque élément traverse trois états — compression, envoi, prêt — repris de
 * `widget/src/attachments.js`. Une pièce qui échoue est retirée de la file : le
 * serveur n'a rien à en faire, et l'utilisateur est prévenu par `onError`.
 */
export class VoxoAttachmentQueue {
  private items: VoxoPendingAttachment[] = []
  private uploading = 0

  maxFiles = MAX_ATTACHMENTS_PER_MESSAGE
  maxBytes = MAX_FILE_BYTES

  constructor(private readonly options: AttachmentQueueOptions) {}

  get all(): readonly VoxoPendingAttachment[] {
    return this.items
  }

  /** Pièces effectivement envoyées, seules rattachables à un message. */
  get uploaded(): VoxoPendingAttachment[] {
    return this.items.filter(isUploaded)
  }

  get uploadedIds(): string[] {
    return this.uploaded.map((item) => item.remoteId!)
  }

  /** Un envoi est en cours : le message doit attendre. */
  get isUploading(): boolean {
    return this.uploading > 0
  }

  get isEmpty(): boolean {
    return this.items.length === 0
  }

  get remainingSlots(): number {
    return this.maxFiles - this.items.length
  }

  /** Aligne les limites sur celles annoncées par `GET /widget/config`. */
  applyServerLimits(maxFiles: number, maxBytes: number): void {
    this.maxFiles = maxFiles
    this.maxBytes = maxBytes
  }

  /**
   * Ouvre le sélecteur puis traite les fichiers retenus. Une annulation ne
   * produit rien : ce n'est pas une erreur.
   */
  async pick(): Promise<void> {
    const locale = this.options.config.locale
    const room = this.remainingSlots
    if (room <= 0) {
      this.options.onError(voxoText(locale, 'maxAttachmentsMessage', { count: this.maxFiles }))
      return
    }

    let picked: VoxoPickedFile[]
    try {
      picked = await this.options.picker.pick(room)
    } catch (error) {
      this.options.onError(
        error instanceof VoxoError ? error.message : voxoText(locale, 'filePickerFailed'),
      )
      return
    }

    if (picked.length > room) {
      this.options.onError(voxoText(locale, 'attachmentsRoomLeft', { count: room }))
    }
    for (const file of picked.slice(0, room)) {
      await this.addOne(file)
    }
  }

  /**
   * Compresse, valide, puis envoie — dans cet ordre : la limite de taille porte
   * sur ce qui part réellement sur le réseau.
   */
  private async addOne(file: VoxoPickedFile): Promise<void> {
    let prepared = file
    try {
      prepared = await this.options.compressor.compress(file)
    } catch {
      // La compression est un confort : son échec ne doit pas empêcher l'envoi.
      prepared = file
    }

    const size = prepared.size ?? 0
    const validation = validateFile(prepared.name, size, this.maxBytes, this.options.config.locale)
    if (!validation.isValid) {
      this.options.onError(validation.error!)
      return
    }

    const item: VoxoPendingAttachment = {
      localId: uuidV4(),
      name: prepared.name,
      size,
      category: validation.category!,
      uri: prepared.uri,
      mimeType: prepared.type ?? mimeTypeOf(prepared.name),
    }
    this.items.push(item)
    this.uploading += 1
    this.options.onChanged()

    try {
      const data = await this.options.api.uploadAttachment(item)
      const id = typeof data.id === 'string' ? data.id : ''
      if (id.length === 0) throw VoxoError.malformedResponse()
      item.remoteId = id
    } catch (error) {
      this.items = this.items.filter((entry) => entry.localId !== item.localId)
      this.options.onError(
        error instanceof VoxoError
          ? error.message
          : voxoText(this.options.config.locale, 'attachmentUploadFailed'),
      )
    } finally {
      this.uploading -= 1
      this.options.onChanged()
    }
  }

  remove(localId: string): void {
    this.items = this.items.filter((item) => item.localId !== localId)
    this.options.onChanged()
  }

  /** Vide la file une fois les pièces rattachées à un message envoyé. */
  clear(): void {
    if (this.items.length === 0) return
    this.items = []
    this.options.onChanged()
  }
}
