'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { READ_ONLY_MESSAGE } from '@/components/common/ReadOnlyHint'

/**
 * Passe tout un bloc en lecture seule sans y toucher.
 *
 * `<fieldset disabled>` neutralise nativement chaque input, button et select
 * imbriqué : aucune prop `disabled` à ajouter dans les composants enveloppés.
 * C'est ce qui permet de couvrir ChatbotTab et ChannelsTab, déjà au-delà de la
 * limite de 250 lignes, sans y ajouter une seule ligne.
 *
 * `display: contents` retire le fieldset du flux : la mise en page reste
 * identique au pixel entre un membre en écriture et un membre en lecture.
 * `pointer-events-none` sur les descendants laisse le survol remonter au span
 * porteur du tooltip.
 *
 * LIMITE CONNUE : un `div` muni d'un `onClick` n'est pas désactivé par
 * `fieldset`. `pointer-events-none` le neutralise visuellement, mais tout
 * contrôle non natif doit être vérifié en recette.
 */
export function ReadOnlyFieldset({ active, message = READ_ONLY_MESSAGE, children }) {
  if (!active) return children

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="contents">
          <fieldset disabled className="contents [&_*]:pointer-events-none">
            {children}
          </fieldset>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{message}</TooltipContent>
    </Tooltip>
  )
}
