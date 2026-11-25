import type { VoxoStorage } from './types'
import { createMemoryStorage } from './types'
import { tryLoadOptionalModule } from './optionalModule'

interface AsyncStorageModule {
  default: VoxoStorage
}

/**
 * Persistance via `@react-native-async-storage/async-storage`.
 *
 * Le module est chargé au premier accès, pas à l'import : une application qui
 * fournit son propre adaptateur ne doit pas être forcée de l'installer.
 *
 * En son absence, on retombe sur un stockage en mémoire plutôt que de lever :
 * la conversation fonctionne, elle ne survit simplement pas au redémarrage. Un
 * avertissement le dit une fois.
 */
export function defaultStorage(): VoxoStorage {
  let resolved: VoxoStorage | null = null

  const resolve = (): VoxoStorage => {
    if (resolved) return resolved
    const loaded = tryLoadOptionalModule<AsyncStorageModule>(
      '@react-native-async-storage/async-storage',
    )
    if (loaded?.default) {
      resolved = loaded.default
    } else {
      console.warn(
        '[VOXO] `@react-native-async-storage/async-storage` est absent : la conversation ' +
          'ne survivra pas au redémarrage de l’application. Installez-le, désactivez ' +
          '`persistSession`, ou fournissez votre propre adaptateur de stockage.',
      )
      resolved = createMemoryStorage()
    }
    return resolved
  }

  return {
    getItem: (key) => resolve().getItem(key),
    setItem: (key, value) => resolve().setItem(key, value),
    removeItem: (key) => resolve().removeItem(key),
  }
}
