import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

import { VoxoClient, type VoxoClientInput } from '../core/client'
import { VoxoContext } from './VoxoContext'

interface OwnedClientProps extends VoxoClientInput {
  children: ReactNode
  client?: never
}

interface ExternalClientProps {
  children: ReactNode
  /**
   * Client déjà construit. L'application en garde alors la propriété : le
   * provider ne le mettra pas au rebut au démontage, ce qui permet à la
   * conversation de survivre à une navigation ou à un remontage.
   */
  client: VoxoClient
}

export type VoxoProviderProps = OwnedClientProps | ExternalClientProps

/**
 * Met un `VoxoClient` à disposition de l'arbre, et le branche sur le cycle de
 * vie de l'application.
 *
 * Deux usages :
 * - passer `apiUrl` / `tenantId` : le provider construit et possède le client ;
 * - passer `client` : l'application le possède, et le provider n'y touche pas.
 */
export function VoxoProvider(props: VoxoProviderProps): ReactNode {
  const { children } = props
  const externalClient = 'client' in props ? props.client : undefined

  // Initialisation paresseuse : le client n'est construit qu'une fois, au
  // premier rendu, et volontairement insensible aux changements de props
  // ensuite — changer de tenant en cours de route n'aurait pas de sens.
  const [ownedClient] = useState<VoxoClient | null>(() =>
    externalClient ? null : new VoxoClient(props as VoxoClientInput),
  )
  const client = externalClient ?? ownedClient
  if (client === null) throw new Error('VoxoProvider : client indisponible.')

  const isOwned = externalClient === undefined

  useEffect(() => {
    void client.init()
    client.setActive(true)

    // iOS coupe les WebSockets en arrière-plan et suspend les timers : sans
    // cette reprise, une réponse de conseiller arrivée pendant la veille
    // n'apparaîtrait jamais.
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        client.setActive(true)
        void client.resume()
        return
      }
      client.setActive(false)
    })

    return () => {
      subscription.remove()
      client.setActive(false)
      if (isOwned) client.dispose()
    }
  }, [client, isOwned])

  return <VoxoContext.Provider value={client}>{children}</VoxoContext.Provider>
}
