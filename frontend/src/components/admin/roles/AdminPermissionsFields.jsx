'use client'

import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  RESOURCES,
  LEVELS,
} from '@/lib/admin-permissions.mjs'

/**
 * Sélecteur d'accès par ressource d'un rôle d'administration, partagé par la
 * création et l'édition. La liste s'étend d'elle-même quand une ressource est
 * ajoutée à `RESOURCES` pour un futur module.
 */
export function AdminPermissionsFields({ value = {}, onChange, disabled = false }) {
  const t = useTranslations('AdminPermissions')
  const handleChange = (resource, level) => {
    onChange({ ...value, [resource]: level })
  }

  return (
    <div className="space-y-3">
      {RESOURCES.map((resource) => (
        <div key={resource} className="grid grid-cols-[1fr_150px] items-center gap-3">
          <div className="min-w-0">
            <Label htmlFor={`admin-permission-${resource}`} className="text-sm">
              {t(`resources.${resource}`)}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t(`descriptions.${resource}`)}
            </p>
          </div>
          <Select
            value={value[resource] ?? 'none'}
            onValueChange={(level) => handleChange(resource, level)}
            disabled={disabled}
          >
            <SelectTrigger id={`admin-permission-${resource}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((level) => (
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
