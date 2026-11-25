import { useLocale, useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BlockMemberDialog } from '@/components/team/BlockMemberDialog'
import { DeleteMemberDialog } from '@/components/team/DeleteMemberDialog'
import { MemberPermissionsDialog } from '@/components/team/MemberPermissionsDialog'
import { PermissionsSummary } from '@/components/team/PermissionsSummary'
import { formatDateShort } from '@/lib/format.mjs'
import {
  canDeleteMember, canManageMember, canUpdatePermissions, canUpdateRole,
} from '@/lib/team-permissions.mjs'

export function TeamMembersTable({
  actor, members, loading, onRoleChange, onStatusChange, onDelete, onPermissionsChange,
}) {
  const t = useTranslations('Team')
  const locale = useLocale()
  const roleLabels = { owner: t('roles.owner'), admin: t('roles.admin'), user: t('roles.user') }
  if (loading) return <p className="py-8 text-center text-muted-foreground">{t('loadingTeam')}</p>
  if (!members.length) return <p className="py-8 text-center text-muted-foreground">{t('noMemberFound')}</p>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('member')}</TableHead><TableHead>{t('role')}</TableHead>
          <TableHead>{t('access')}</TableHead><TableHead>{t('status')}</TableHead>
          <TableHead>{t('lastLogin')}</TableHead>
          <TableHead className="text-right">{t('actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <div className="font-medium">{member.firstName} {member.lastName}</div>
              <div className="text-xs text-muted-foreground">{member.email}</div>
            </TableCell>
            <TableCell>
              {canUpdateRole(actor, member) ? (
                <Select value={member.role} onValueChange={(role) => onRoleChange(member.id, role)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t('roles.user')}</SelectItem>
                    <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                  </SelectContent>
                </Select>
              ) : roleLabels[member.role]}
            </TableCell>
            <TableCell><PermissionsSummary permissions={member.permissions} /></TableCell>
            <TableCell><Badge variant={member.isActive ? 'secondary' : 'destructive'}>
              {member.isActive ? t('active') : t('blocked')}
            </Badge></TableCell>
            <TableCell>{member.lastLoginAt
              ? formatDateShort(member.lastLoginAt, locale)
              : t('never')}</TableCell>
            <TableCell className="space-x-1 text-right">
              {canUpdatePermissions(actor, member) && (
                <MemberPermissionsDialog
                  member={member}
                  loading={loading}
                  onConfirm={onPermissionsChange}
                />
              )}
              {canManageMember(actor, member) && (
                <BlockMemberDialog member={member} loading={loading} onConfirm={onStatusChange} />
              )}
              {canDeleteMember(actor, member) && (
                <DeleteMemberDialog member={member} loading={loading} onConfirm={onDelete} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
