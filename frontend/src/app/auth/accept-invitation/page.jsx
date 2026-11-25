'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAcceptInvitation } from '@/hooks/use-accept-invitation'
import { useTranslations } from 'next-intl'

function InvitationForm() {
  const t = useTranslations('AuthFlows')
  const params = useSearchParams()
  const invitation = useAcceptInvitation(params.get('tenantId'), params.get('token'))
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
          <UserPlus className="text-indigo-600" />
        </div>
        <CardTitle>{t('joinTeam')}</CardTitle>
        <CardDescription>{t('joinTeamDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={invitation.submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="firstName">{t('firstName')}</Label><Input id="firstName" value={invitation.form.firstName} onChange={(event) => invitation.updateField('firstName', event.target.value)} required /></div>
            <div><Label htmlFor="lastName">{t('lastName')}</Label><Input id="lastName" value={invitation.form.lastName} onChange={(event) => invitation.updateField('lastName', event.target.value)} required /></div>
          </div>
          <div><Label htmlFor="password">{t('password')}</Label><Input id="password" type="password" value={invitation.form.password} onChange={(event) => invitation.updateField('password', event.target.value)} required /></div>
          <div><Label htmlFor="confirmPassword">{t('confirmPassword')}</Label><Input id="confirmPassword" type="password" value={invitation.form.confirmPassword} onChange={(event) => invitation.updateField('confirmPassword', event.target.value)} required /></div>
          {invitation.error && <p role="alert" className="text-sm text-red-600">{invitation.error}</p>}
          <Button className="w-full" type="submit" disabled={invitation.loading}>
            {invitation.loading ? t('creating') : t('acceptInvitation')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function AcceptInvitationPage() {
  const t = useTranslations('AuthFlows')
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<p>{t('loading')}</p>}><InvitationForm /></Suspense>
    </main>
  )
}
