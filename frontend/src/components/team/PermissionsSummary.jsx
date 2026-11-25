'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { RESOURCES } from '@/lib/permissions.mjs'

// Une lettre par niveau : la colonne reste lisible sans élargir le tableau.
// Le marqueur reste volontairement non traduit (première lettre du terme FR) :
// c'est un pictogramme compact, pas un mot lu.
const LEVEL_MARKS = { write: 'W', read: 'R', none: '—' }
const LEVEL_VARIANTS = { write: 'default', read: 'secondary', none: 'outline' }

/** Résumé des accès effectifs d'un membre ou d'une invitation. */
export function PermissionsSummary({ permissions }) {
  const t = useTranslations('TeamPermissions')
  if (!permissions) return null

  return (
    <div className="flex flex-wrap gap-1">
      {RESOURCES.map((resource) => {
        const level = permissions[resource] || 'none'
        return (
          <Badge
            key={resource}
            variant={LEVEL_VARIANTS[level]}
            className="text-xs font-normal"
            title={`${t(`resources.${resource}`)} : ${t(`levels.${level}`)}`}
          >
            {t(`resources.${resource}`).split(' ')[0]} {LEVEL_MARKS[level]}
          </Badge>
        )
      })}
    </div>
  )
}
