import { Save, Zap, Loader2, Upload } from 'lucide-react'
import { useState } from 'react'
import apiClient from '@/lib/api'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ReadOnlyHint } from '@/components/common/ReadOnlyHint'
import { useTenantQuota } from '@/hooks/use-tenant-quota'

// La suppression de l'entreprise n'est plus pilotée ici : elle découle de la
// suppression du compte du propriétaire (onglet Profil), seul endroit qui gère
// le transfert de propriété et la rétention de 30 jours.
//
// `readOnly` vient de la permission `company` : les champs restent visibles et
// à leur place, seulement grisés, pour qu'aucun décalage n'apparaisse d'un
// membre à l'autre.
export function CompanyTab({
  companySettings,
  setCompanySettings,
  companySaving,
  handleSaveCompany,
  tenant,
  readOnly = false,
}) {
  const locale = useLocale()
  const t = useTranslations('SettingsCompany')
  const { quota } = useTenantQuota(Boolean(tenant))
  const [logoUrl, setLogoUrl] = useState(tenant?.logoUrl || null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  return (
    <div className="space-y-6">
      <SurfaceCard>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="company-logo">{t('logo')}</Label>
            <div className="mt-2 flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl bg-slate-900 font-bold text-white">{logoUrl ? <img src={logoUrl} alt={t('logoAlt')} className="h-full w-full object-cover" /> : tenant?.name?.slice(0, 2).toUpperCase()}</div>
              {!readOnly && <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50"><Upload className="h-4 w-4" />{uploadingLogo ? t('uploading') : t('upload')}<input id="company-logo" type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" disabled={uploadingLogo} onChange={async (event) => { const file = event.target.files?.[0]; if (!file || file.size > 2 * 1024 * 1024) return; setUploadingLogo(true); try { const form = new FormData(); form.append('file', file); const response = await apiClient.post('/tenant/branding/logo', form); setLogoUrl(response.data?.data?.url || response.data?.url || null); } finally { setUploadingLogo(false); event.target.value = ''; } }} /></label>}
            </div><p className="mt-1 text-xs text-muted-foreground">{t('fileHint')}</p>
          </div>
          <div>
            <Label htmlFor="companyName">{t('name')}</Label>
            <Input
              id="companyName"
              value={companySettings.name}
              disabled={readOnly}
              onChange={(e) => setCompanySettings(prev => ({
                ...prev,
                name: e.target.value
              }))}
            />
          </div>
          <div>
            <Label htmlFor="domain">{t('website')}</Label>
            <Input
              id="domain"
              value={companySettings.domain}
              disabled={readOnly}
              onChange={(e) => setCompanySettings(prev => ({
                ...prev,
                domain: e.target.value
              }))}
              placeholder="voxo.app"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('websiteHint')}
            </p>
          </div>
          <div>
            <Label htmlFor="subdomain">{t('subdomain')}</Label>
            <div className="flex">
              <Input
                id="subdomain"
                value={companySettings.subdomain}
                disabled={readOnly}
                onChange={(e) => setCompanySettings(prev => ({
                  ...prev,
                  subdomain: e.target.value
                }))}
                className="rounded-r-none"
                placeholder="mon-entreprise"
              />
              <div className="px-3 py-2 bg-gray-50 border border-l-0 rounded-r-md text-sm text-gray-500">
                .chatbot-saas.com
              </div>
            </div>
          </div>
          <ReadOnlyHint
            active={readOnly}
            message={t('readOnly')}
          >
            <Button onClick={handleSaveCompany} disabled={companySaving || readOnly}>
              {companySaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {companySaving ? t('saving') : t('save')}
            </Button>
          </ReadOnlyHint>
        </CardContent>
      </SurfaceCard>

      <SurfaceCard>
        <CardHeader>
          <CardTitle>{t('planTitle')}</CardTitle>
          <CardDescription>{t('planDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-medium">{t('planName', { name: quota?.planLabel || tenant?.subscriptionPlan || '' })}</h4>
                <Badge
                  variant="outline"
                  className={
                    tenant?.subscriptionPlan === 'enterprise' ? 'bg-purple-50 text-purple-700' :
                      tenant?.subscriptionPlan === 'pro' ? 'bg-blue-50 text-blue-700' :
                        tenant?.subscriptionPlan === 'basic' ? 'bg-green-50 text-green-700' :
                          'bg-gray-50 text-gray-700'
                  }
                >
                  {(quota?.planLabel || tenant?.subscriptionPlan || '').toUpperCase()}
                </Badge>
              </div>
              {/* Limites réelles issues de `/tenant/quota`. Les phrases écrites
                  en dur ici annonçaient des chiffres que le backend
                  n'appliquait pas (1 000 et 10 000 au lieu de 500 et illimité). */}
              <p className="text-sm text-gray-600 mt-1">
                {quota ? [
                  t('monthlyMessages', { count: quota.messages.limit }),
                  !quota.messagesDaily.unlimited && t('dailyMessages', { count: quota.messagesDaily.limit }),
                  t('documents', { count: quota.documents.limit }),
                  !quota.members.unlimited && t('members', { count: quota.members.limit }),
                ].filter(Boolean).join(' · ') : '—'}
              </p>
            </div>
            {tenant?.subscriptionPlan !== 'enterprise' && (
              <Button asChild>
                <Link href={`/${locale}/dashboard/billing`}>
                <Zap className="h-4 w-4 mr-2" />
                {t('upgrade')}
                </Link>
              </Button>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium mb-3">{t('features')}</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Caractéristiques dérivées du forfait côté serveur : cette
                  matrice était dupliquée et divergeait de la définition réelle. */}
              {Object.entries(tenant?.features || {}).map(([name, enabled]) => ({
                feature: t.has(`featureLabels.${name}`) ? t(`featureLabels.${name}`) : name,
                available: Boolean(enabled),
              })).map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${item.available ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  <span className={`text-sm ${item.available ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                    {item.feature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </SurfaceCard>

    </div>
  )
}
