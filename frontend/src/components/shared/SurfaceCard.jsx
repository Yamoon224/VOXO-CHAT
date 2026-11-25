'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Carte de contenu, partagée par la console d'administration et le tableau de
 * bord client.
 *
 * Bordure fine et pas d'ombre : le langage visuel de la maquette repose sur le
 * contraste entre la carte blanche et le fond gris, pas sur l'élévation.
 *
 * Centralisé dans un composant plutôt que recopié page par page — le style se
 * règle ici. Née sous le nom `AdminCard`, elle a été promue en `shared/` quand
 * le tableau de bord client a rejoint le même langage : la garder sous
 * `components/admin/` tout en l'utilisant côté client aurait été un contresens
 * de rangement.
 */
export function SurfaceCard({ className, ...props }) {
  return <Card className={cn('rounded-xl border-gray-200 shadow-none', className)} {...props} />
}
