'use client'

import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InviteMemberDialog } from '@/components/team/InviteMemberDialog'
import { PendingInvitations } from '@/components/team/PendingInvitations'
import { TeamMembersTable } from '@/components/team/TeamMembersTable'
import { useTeam } from '@/hooks/use-team'

export function TeamTab({ user }) {
  const t = useTranslations('Team')
  const team = useTeam(['owner', 'admin'].includes(user?.role))
  const updateFilter = (key, value) => team.setFilters((current) => ({
    ...current,
    [key]: value,
    page: key === 'page' ? value : 1,
  }))

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div><CardTitle>{t('title')}</CardTitle><CardDescription>{t('subtitle')}</CardDescription></div>
        <InviteMemberDialog actorRole={user.role} loading={team.actionLoading} onInvite={team.inviteMember} />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={t('searchMember')} value={team.filters.search} onChange={(event) => updateFilter('search', event.target.value)} />
          </div>
          <Select value={team.filters.role || 'all'} onValueChange={(value) => updateFilter('role', value === 'all' ? '' : value)}>
            <SelectTrigger><SelectValue placeholder={t('allRoles')} /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t('allRoles')}</SelectItem><SelectItem value="owner">{t('roles.owner')}</SelectItem><SelectItem value="admin">{t('roles.admin')}</SelectItem><SelectItem value="user">{t('roles.user')}</SelectItem></SelectContent>
          </Select>
          <Select value={team.filters.status} onValueChange={(value) => updateFilter('status', value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">{t('activeStatus')}</SelectItem><SelectItem value="inactive">{t('blockedStatus')}</SelectItem><SelectItem value="all">{t('allStatuses')}</SelectItem></SelectContent>
          </Select>
        </div>
        <TeamMembersTable actor={user} members={team.members} loading={team.loading || team.actionLoading} onRoleChange={team.updateRole} onStatusChange={team.setMemberStatus} onDelete={team.deleteMember} onPermissionsChange={team.updatePermissions} />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t('memberCount', { count: team.pagination.total })}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={team.pagination.page <= 1} onClick={() => updateFilter('page', team.pagination.page - 1)}>{t('previous')}</Button>
            <Button variant="outline" size="sm" disabled={team.pagination.page >= team.pagination.pages} onClick={() => updateFilter('page', team.pagination.page + 1)}>{t('next')}</Button>
          </div>
        </div>
        <PendingInvitations actorRole={user.role} invitations={team.invitations} loading={team.actionLoading} onResend={team.resendInvitation} onRevoke={team.revokeInvitation} />
      </CardContent>
    </Card>
  )
}
