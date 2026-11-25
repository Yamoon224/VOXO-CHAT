'use client'

import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { useAdminPermissions } from '@/hooks/use-admin-permissions'
import { useAdminAccounts } from '@/hooks/use-admin-accounts'
import { useAdminRoles } from '@/hooks/use-admin-roles'
import { AdminAccountsTable } from '@/components/admin/AdminAccountsTable'
import { InviteAdminDialog } from '@/components/admin/InviteAdminDialog'
import { PendingAdminInvitations } from '@/components/admin/PendingAdminInvitations'

export default function AdminAccountsPage() {
  const { admin } = useAdminAuth()
  const { canRead, canWrite, isSystemRole } = useAdminPermissions()
  const accounts = useAdminAccounts(canRead('admins'))
  const { roles } = useAdminRoles(canRead('admins'))
  const writable = canWrite('admins')

  const updateFilter = (key, value) => accounts.setFilters((current) => ({
    ...current,
    [key]: value,
    page: key === 'page' ? value : 1,
  }))

  return (
    <>
      <PageHeader
        title="Comptes administrateurs"
        description="Invitez des administrateurs et gérez leurs accès."
      >
        {writable && (
          <InviteAdminDialog
            roles={roles}
            loading={accounts.actionLoading}
            canAssignSystemRole={isSystemRole}
            onInvite={accounts.inviteAdmin}
          />
        )}
      </PageHeader>

      <SurfaceCard>
        <CardContent className="space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher un administrateur"
              value={accounts.filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
            />
          </div>
          <Select
            value={accounts.filters.roleId || 'all'}
            onValueChange={(value) => updateFilter('roleId', value === 'all' ? '' : value)}
          >
            <SelectTrigger><SelectValue placeholder="Tous les rôles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={accounts.filters.status} onValueChange={(value) => updateFilter('status', value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Bloqués</SelectItem>
              <SelectItem value="all">Tous</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <AdminAccountsTable
          actor={admin}
          admins={accounts.admins}
          roles={roles}
          loading={accounts.loading || accounts.actionLoading}
          canWrite={writable}
          canAssignSystemRole={isSystemRole}
          onRoleChange={accounts.updateAdminRole}
          onStatusChange={accounts.setAdminStatus}
        />

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{accounts.pagination.total} compte(s)</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={accounts.pagination.page <= 1}
              onClick={() => updateFilter('page', accounts.pagination.page - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={accounts.pagination.page >= accounts.pagination.pages}
              onClick={() => updateFilter('page', accounts.pagination.page + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>

        <PendingAdminInvitations
          invitations={accounts.invitations}
          loading={accounts.actionLoading}
          canWrite={writable}
          onResend={accounts.resendInvitation}
          onRevoke={accounts.revokeInvitation}
        />
      </CardContent>
      </SurfaceCard>
    </>
  )
}
