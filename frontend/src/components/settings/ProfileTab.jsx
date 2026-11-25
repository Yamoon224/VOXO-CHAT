import { AlertTriangle, Save, Shield, Upload } from 'lucide-react'
import { useState } from 'react'
import { authAPI } from '@/lib/api'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountDialog'
import { NotificationPreferencesCard } from '@/components/settings/NotificationPreferencesCard'
import { useTranslations } from 'next-intl'

export function ProfileTab({
  profileSettings,
  setProfileSettings,
  handleSaveProfile,
  profileSaving,
  onAccountDeleted,
}) {
  const t = useTranslations('SettingsProfile')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const updateField = (field, value) => setProfileSettings((current) => ({
    ...current,
    [field]: value,
  }))

  return (
    <div className="space-y-6">
      <SurfaceCard>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="profile-avatar">{t('photo')}</Label>
            <div className="mt-2 flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-blue-100 font-semibold text-blue-700">{avatarUrl ? <img src={avatarUrl} alt={t('photo')} className="h-full w-full object-cover" /> : `${profileSettings.firstName?.[0] || ''}${profileSettings.lastName?.[0] || ''}`}</div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50"><Upload className="h-4 w-4" />{uploading ? t('uploading') : t('addPhoto')}<input id="profile-avatar" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) return; setUploading(true); try { const response = await authAPI.uploadAvatar(file); setAvatarUrl(response.data?.data?.avatarUrl || response.data?.avatarUrl || null); } finally { setUploading(false); event.target.value = ''; } }} /></label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t('fileHint')}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><Label htmlFor="firstName">{t('firstName')}</Label><Input id="firstName" value={profileSettings.firstName} onChange={(event) => updateField('firstName', event.target.value)} /></div>
            <div><Label htmlFor="lastName">{t('lastName')}</Label><Input id="lastName" value={profileSettings.lastName} onChange={(event) => updateField('lastName', event.target.value)} /></div>
          </div>
          <div><Label htmlFor="email">{t('email')}</Label><Input id="email" type="email" value={profileSettings.email} onChange={(event) => updateField('email', event.target.value)} /></div>
          <Button onClick={handleSaveProfile} disabled={profileSaving}>
            <Save />{profileSaving ? t('updating') : t('update')}
          </Button>
        </CardContent>
      </SurfaceCard>
      <SurfaceCard>
        <CardHeader><CardTitle>{t('security')}</CardTitle><CardDescription>{t('securityDescription')}</CardDescription></CardHeader>
        <CardContent><Button variant="outline" disabled><Shield />{t('changePassword')}</Button></CardContent>
      </SurfaceCard>
      <NotificationPreferencesCard />
      <SurfaceCard className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            {t('danger')}
          </CardTitle>
          <CardDescription>
            {t('dangerDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent><DeleteAccountDialog onDeleted={onAccountDeleted} /></CardContent>
      </SurfaceCard>
    </div>
  )
}
