import { ALLOWED_EXTENSIONS } from '../fileRules'
import { loadOptionalModule } from './optionalModule'
import type { VoxoFilePicker, VoxoPickedFile } from './types'

interface DocumentPickerAsset {
  uri: string
  name?: string | null
  size?: number | null
  type?: string | null
}

interface DocumentPickerModule {
  pick(options: {
    allowMultiSelection?: boolean
    type?: string[]
  }): Promise<DocumentPickerAsset[]>
  isErrorWithCode?(error: unknown): boolean
  errorCodes?: { OPERATION_CANCELED?: string }
}

/**
 * Sélecteur par défaut, appuyé sur `@react-native-documents/picker`.
 *
 * Un seul sélecteur pour les images **et** les documents : c'est ce que fait le
 * widget web avec un `<input type="file">` unique, et cela évite de demander à
 * l'utilisateur de choisir d'abord *le type* de ce qu'il veut joindre.
 *
 * Une annulation renvoie une liste vide — ce n'est pas une erreur, l'utilisateur
 * a simplement changé d'avis.
 */
export function defaultFilePicker(): VoxoFilePicker {
  return {
    async pick(limit: number): Promise<VoxoPickedFile[]> {
      const picker = loadOptionalModule<DocumentPickerModule>(
        '@react-native-documents/picker',
        'Joindre un fichier',
      )

      let assets: DocumentPickerAsset[]
      try {
        assets = await picker.pick({ allowMultiSelection: limit > 1 })
      } catch (error) {
        if (isCancellation(picker, error)) return []
        throw error
      }

      return assets.slice(0, limit).map(toPickedFile).filter(isSupported)
    },
  }
}

function toPickedFile(asset: DocumentPickerAsset): VoxoPickedFile {
  return {
    uri: asset.uri,
    name: asset.name ?? 'fichier',
    size: asset.size ?? undefined,
    type: asset.type ?? undefined,
  }
}

/**
 * Le sélecteur système ignore parfois le filtre d'extensions. On écarte ici ce
 * qui n'est de toute façon pas envoyable ; la validation complète — taille
 * incluse — reste celle de la file, alignée sur `shared/file-rules.mjs`.
 */
function isSupported(file: VoxoPickedFile): boolean {
  const extension = file.name.toLowerCase().split('.').pop() ?? ''
  return ALLOWED_EXTENSIONS.includes(extension)
}

function isCancellation(picker: DocumentPickerModule, error: unknown): boolean {
  const canceled = picker.errorCodes?.OPERATION_CANCELED
  if (picker.isErrorWithCode?.(error) === true && canceled !== undefined) {
    return (error as { code?: string }).code === canceled
  }
  // Repli sur le message : les versions antérieures n'exposent pas de code.
  return /cancel/i.test(String((error as { message?: string })?.message ?? ''))
}
