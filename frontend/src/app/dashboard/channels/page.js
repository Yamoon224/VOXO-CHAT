'use client'

import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { RouteGuard } from '@/components/common/RouteGuard'
import { ReadOnlyFieldset } from '@/components/common/ReadOnlyFieldset'
import { ChannelsTab } from '@/components/channels/ChannelsTab'

/**
 * Canaux de diffusion (Telegram, WhatsApp).
 *
 * Deux niveaux distincts, comme du temps de l'onglet : la LECTURE de `company`
 * ouvre la page, seule l'ÉCRITURE déverrouille les formulaires. Un membre en
 * lecture voit donc la configuration existante sans pouvoir la modifier.
 */
export default function ChannelsPage() {
  const { tenant } = useAuth()
  const { canWrite } = usePermissions()

  return (
    <RouteGuard resource="company">
      <ReadOnlyFieldset active={!canWrite('company')}>
        <ChannelsTab tenant={tenant} />
      </ReadOnlyFieldset>
    </RouteGuard>
  )
}
