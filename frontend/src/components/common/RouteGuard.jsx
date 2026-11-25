'use client'

import { Loader2, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { canAccessNavItem } from '@/lib/navigation.mjs'
import { useTranslations } from 'next-intl'

/**
 * Refuse l'accès à une page entière.
 *
 * Nécessaire depuis que Équipe, Facturation et Canaux sont de vraies URL :
 * tant qu'ils étaient des onglets, un accès non autorisé retombait
 * silencieusement sur le premier onglet visible. Une URL, elle, peut être
 * tapée à la main.
 *
 * RÈGLE (voir `use-permissions`) : tant que `ready` est faux, l'état vient du
 * localStorage et peut être périmé — on affiche le chargement, JAMAIS la
 * branche permissive ni le refus. Refuser trop tôt ferait clignoter un message
 * d'erreur à chaque rechargement pour un membre pourtant autorisé.
 *
 * Garde-fou d'INTERFACE : il évite d'afficher une page inutile, il ne protège
 * aucune donnée. Le backend applique ses propres contrôles sur chaque appel.
 */
export function RouteGuard({ resource = null, roles = null, children }) {
  const { canRead, ready } = usePermissions()
  const { user } = useAuth()
  const t = useTranslations('Dashboard')

  if (!ready) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!canAccessNavItem({ resource, roles }, { canRead, role: user?.role })) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Lock className="h-5 w-5 text-gray-500" />
        </span>
        <div>
          <p className="font-medium text-gray-900">{t('accessDenied')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('accessDeniedDescription')}
          </p>
        </div>
      </div>
    )
  }

  return children
}
