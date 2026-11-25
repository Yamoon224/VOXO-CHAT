'use client'

import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  RESOURCES,
  listGrantableLevels,
  computeEffectivePermissions,
} from '@/lib/permissions.mjs'

/**
 * Un sélecteur d'accès par ressource, partagé par l'invitation et l'édition.
 *
 * Les niveaux proposés viennent de `listGrantableLevels` : « Écriture » ne
 * s'affiche donc jamais pour l'entreprise quand le rôle visé est Utilisateur,
 * ni pour les statistiques, qu'aucun endpoint n'écrit. Proposer un niveau que
 * le backend refuserait serait un piège.
 *
 * `value` ne contient que les SURCHARGES ; l'absence d'une ressource signifie
 * « préréglage du rôle », affiché comme niveau effectif calculé.
 */
export function PermissionsMatrixFields({ role, value = {}, onChange, disabled = false }) {
  const t = useTranslations('TeamPermissions')
  const effective = computeEffectivePermissions({ role, permissionOverrides: value })

  const handleChange = (resource, level) => {
    onChange({ ...value, [resource]: level })
  }

  return (
    <div className="space-y-3">
      {RESOURCES.map((resource) => (
        <div key={resource} className="grid grid-cols-[1fr_150px] items-center gap-3">
          <div className="min-w-0">
            <Label htmlFor={`permission-${resource}`} className="text-sm">
              {t(`resources.${resource}`)}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t(`descriptions.${resource}`)}
            </p>
          </div>
          <Select
            value={effective[resource]}
            onValueChange={(level) => handleChange(resource, level)}
            disabled={disabled}
          >
            <SelectTrigger id={`permission-${resource}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {listGrantableLevels(role, resource).map((level) => (
                <SelectItem key={level} value={level}>
                  {t(`levels.${level}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  )
}
