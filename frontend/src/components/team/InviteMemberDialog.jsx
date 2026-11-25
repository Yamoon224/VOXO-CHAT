'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PermissionsMatrixFields } from '@/components/team/PermissionsMatrixFields'
import { ReadOnlyHint } from '@/components/common/ReadOnlyHint'

export function InviteMemberDialog({ actorRole, loading, onInvite }) {
  const t = useTranslations('Team')
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [permissions, setPermissions] = useState({})

  // Miroir de `assertCanAssignPermissions` : un administrateur invite, mais
  // seul le propriétaire personnalise les accès.
  const canCustomise = actorRole === 'owner'

  const resetForm = () => {
    setEmail('')
    setRole('user')
    setPermissions({})
  }

  // Une surcharge n'a plus de sens si le rôle change : les plafonds diffèrent.
  const handleRoleChange = (nextRole) => {
    setRole(nextRole)
    setPermissions({})
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const success = await onInvite({ email, role, permissions })
    if (success) {
      resetForm()
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><UserPlus />{t('inviteMember')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t('inviteMember')}</DialogTitle>
            <DialogDescription>{t('inviteLinkNotice')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="invite-email">{t('email')}</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t('role')}</Label>
            <Select value={role} onValueChange={handleRoleChange} disabled={actorRole === 'admin'}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t('roles.user')}</SelectItem>
                {actorRole === 'owner' && <SelectItem value="admin">{t('roles.admin')}</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('access')}</Label>
            <ReadOnlyHint
              active={!canCustomise}
              message={t('readOnlyPermissionsHint')}
            >
              <PermissionsMatrixFields
                role={role}
                value={permissions}
                onChange={setPermissions}
                disabled={!canCustomise || loading}
              />
            </ReadOnlyHint>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? t('sending') : t('sendInvitation')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
