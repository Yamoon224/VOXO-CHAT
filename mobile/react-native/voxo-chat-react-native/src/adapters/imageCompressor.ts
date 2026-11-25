import { categoryOf, extensionOf } from '../fileRules'
import { tryLoadOptionalModule } from './optionalModule'
import type { VoxoImageCompressor, VoxoPickedFile } from './types'

interface ResizedImage {
  uri: string
  name?: string
  size?: number
}

interface ImageResizerModule {
  default: {
    createResizedImage(
      uri: string,
      maxWidth: number,
      maxHeight: number,
      format: 'JPEG' | 'PNG' | 'WEBP',
      quality: number,
      rotation?: number,
      outputPath?: string | null,
      keepMeta?: boolean,
      options?: { mode?: 'contain' | 'cover'; onlyScaleDown?: boolean },
    ): Promise<ResizedImage>
  }
}

const MAX_DIMENSION = 2048
const QUALITY = 82

/**
 * Formats recompressables. Le GIF est écarté : il peut être animé, et la
 * recompression l'aplatirait sur sa première image.
 */
const COMPRESSIBLE = new Set(['.jpg', '.jpeg', '.png', '.webp'])

/**
 * Réduction d'une image avant envoi, parité avec `compressImage` de
 * `shared/file-rules.mjs` : au plus 2 048 px sur le plus grand côté, ré-encodée
 * en WebP qualité 0,82.
 *
 * Le fichier d'origine est conservé si la compression ne s'applique pas, si elle
 * échoue, ou si elle ne fait rien gagner — la validation de taille s'applique
 * ensuite au résultat, quel qu'il soit.
 */
export function defaultImageCompressor(): VoxoImageCompressor {
  return {
    async compress(file: VoxoPickedFile): Promise<VoxoPickedFile> {
      if (categoryOf(file.name) !== 'image') return file
      if (!COMPRESSIBLE.has(extensionOf(file.name))) return file

      const module = tryLoadOptionalModule<ImageResizerModule>('react-native-image-resizer')
      if (!module?.default) return file

      try {
        const resized = await module.default.createResizedImage(
          file.uri,
          MAX_DIMENSION,
          MAX_DIMENSION,
          'WEBP',
          QUALITY,
          0,
          null,
          false,
          { mode: 'contain', onlyScaleDown: true },
        )

        // Recompresser peut alourdir un PNG déjà optimisé : on garde le plus léger.
        if (
          resized.size !== undefined &&
          file.size !== undefined &&
          resized.size >= file.size
        ) {
          return file
        }

        return {
          uri: resized.uri,
          name: file.name.replace(/\.[^.]+$/, '') + '.webp',
          size: resized.size ?? file.size,
          type: 'image/webp',
        }
      } catch {
        return file
      }
    },
  }
}
