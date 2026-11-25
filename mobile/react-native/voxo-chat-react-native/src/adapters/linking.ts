import { tryLoadOptionalModule } from './optionalModule'
import type { VoxoLinking } from './types'

interface ReactNativeLinking {
  Linking: { openURL(url: string): Promise<unknown> }
}

/**
 * Ouverture de liens via le `Linking` de React Native.
 *
 * L'URL a déjà traversé le filtrage de schémas avant d'arriver ici ; cet
 * adaptateur ne fait qu'appeler le système. Un refus n'est pas exceptionnel —
 * lien mort, application absente — d'où un booléen plutôt qu'une exception.
 */
export function defaultLinking(): VoxoLinking {
  return {
    async openUrl(url: string): Promise<boolean> {
      const module = tryLoadOptionalModule<ReactNativeLinking>('react-native')
      if (!module?.Linking) return false
      try {
        await module.Linking.openURL(url)
        return true
      } catch {
        return false
      }
    },
  }
}
