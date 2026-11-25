import { useContext, useSyncExternalStore } from 'react'

import type { VoxoClient } from '../core/client'
import type { VoxoClientSnapshot } from '../core/clientSnapshot'
import { VoxoContext } from './VoxoContext'

/**
 * Le client du contexte le plus proche.
 *
 * Toute la logique vit dans le core ; ce hook n'est qu'un accès.
 */
export function useVoxoClient(): VoxoClient {
  const client = useContext(VoxoContext)
  if (client === null) {
    throw new Error(
      'useVoxoClient doit être appelé sous un <VoxoProvider>. ' +
        'Enveloppez votre application, ou passez explicitement un VoxoClient.',
    )
  }
  return client
}

/**
 * S'abonne à l'état d'un client et déclenche un rendu à chaque changement.
 *
 * `useSyncExternalStore` est exactement l'outil pour ça : le client expose déjà
 * `subscribe` et `getSnapshot`, et remplace son instantané plutôt que de le
 * muter — c'est le changement de référence qui déclenche le rendu.
 *
 * Le même instantané est renvoyé côté serveur : le SDK n'est pas rendu hors
 * appareil, mais cela évite un avertissement si l'application partage du code.
 */
export function useVoxoSnapshot(client: VoxoClient): VoxoClientSnapshot {
  return useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot)
}

/** Raccourci : le client du contexte, et son état courant. */
export function useVoxo(): { client: VoxoClient; snapshot: VoxoClientSnapshot } {
  const client = useVoxoClient()
  return { client, snapshot: useVoxoSnapshot(client) }
}
