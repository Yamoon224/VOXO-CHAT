'use client'

import { Loader2 } from 'lucide-react'
import { CardContent } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAdminAuthGuard } from '@/hooks/use-admin-auth'
import { useAdminRoles } from '@/hooks/use-admin-roles'
import { AdminRolesTable } from '@/components/admin/roles/AdminRolesTable'
import { RoleFormDialog } from '@/components/admin/roles/RoleFormDialog'

export default function AdminRolesPage() {
  // Définir les rôles est réservé au rôle système : un rôle personnalisé qui
  // pourrait le faire s'accorderait n'importe quel accès.
  const { isAuthorized, isLoading } = useAdminAuthGuard({ requireSystemRole: true })
  const roles = useAdminRoles(isAuthorized)

  if (isLoading || !isAuthorized) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Rôles & permissions"
        description="Créez des rôles et choisissez ce que chacun peut consulter ou modifier."
      >
        <RoleFormDialog loading={roles.actionLoading} onSubmit={roles.createRole} />
      </PageHeader>

      <SurfaceCard>
        <CardContent className="p-5">
        <AdminRolesTable
          roles={roles.roles}
          loading={roles.loading || roles.actionLoading}
          onUpdate={roles.updateRole}
          onDelete={roles.deleteRole}
        />
      </CardContent>
      </SurfaceCard>
    </>
  )
}
