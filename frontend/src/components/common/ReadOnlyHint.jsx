'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export const READ_ONLY_MESSAGE =
  'Vous avez un accès en lecture seule sur cette section. Demandez au propriétaire du compte de vous accorder les droits de modification.'

/**
 * Explique pourquoi un contrôle est désactivé, sans le faire disparaître.
 *
 * Un élément `disabled` n'émet aucun événement de pointeur : un tooltip posé
 * dessus ne se déclencherait jamais. Le `span` intermédiaire reçoit le survol
 * à sa place, et `inline-block` garantit qu'il n'introduit aucun décalage.
 *
 * Le contrôle reste responsable de son propre `disabled` : ce composant
 * n'explique que la raison, il ne l'impose pas.
 */
export function ReadOnlyHint({ active, message = READ_ONLY_MESSAGE, children }) {
  if (!active) return children

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-block">{children}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{message}</TooltipContent>
    </Tooltip>
  )
}
