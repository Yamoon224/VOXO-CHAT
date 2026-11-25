'use client'

import { useTranslations } from 'next-intl'
import { Lock, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { RoleFormDialog } from '@/components/admin/roles/RoleFormDialog'
import { RESOURCES } from '@/lib/admin-permissions.mjs'

function PermissionsSummary({ permissions }) {
  const t = useTranslations('AdminPermissions')
  return (
    <div className="flex flex-wrap gap-1">
      {RESOURCES.map((resource) => (
        <Badge key={resource} variant="outline" className="text-xs font-normal">
          {t(`resources.${resource}`)} : {t(`levels.${permissions?.[resource] ?? 'none'}`)}
        </Badge>
      ))}
    </div>
  )
}

export function AdminRolesTable({ roles, loading, onUpdate, onDelete }) {
  const t = useTranslations('AdminRoles')
  if (!loading && roles.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
  }

  return (
    <div className="divide-y rounded-md border">
      {roles.map((role) => (
        <div key={role.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{role.name}</span>
              {role.isSystem && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Lock className="h-3 w-3" />
                  {t('systemRole')}
                </Badge>
              )}
            </div>
            <PermissionsSummary permissions={role.permissions} />
          </div>

          {/* Le rôle système ne s'édite ni ne se supprime : il détient tous les
              accès par construction et garantit qu'un administrateur subsiste. */}
          {!role.isSystem && (
            <div className="flex items-center gap-2">
              <RoleFormDialog
                role={role}
                loading={loading}
                onSubmit={(data) => onUpdate(role.id, data)}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={t('deleteAriaLabel', { name: role.name })}>
                    <Trash2 className="text-red-600" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('deleteTitle', { name: role.name })}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('deleteDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={loading}
                      onClick={() => onDelete(role.id)}
                    >
                      {t('delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
