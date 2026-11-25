'use client'

import { useTranslations } from 'next-intl'
import { Settings } from 'lucide-react'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'

/**
 * Référence de `window.ChatBotConfig`.
 *
 * Reprise de `widget/README.md`, qui fait autorité — WIDGET.md impose que toute
 * nouvelle option y soit documentée. Si les deux divergent, c'est le README du
 * widget qui a raison.
 *
 * La plupart de ces réglages se pilotent depuis Paramètres → Chatbot : cette
 * table sert à ceux qui veulent surcharger dans le code. Valeurs et notes
 * résolues via `valueKey`/`noteKey` contre le namespace `Integration`.
 */
const OPTIONS = [
  { key: 'tenantId', valueKey: 'optString', noteKey: 'optTenantId' },
  { key: 'apiUrl', valueKey: 'optUrl', noteKey: 'optApiUrl' },
  { key: 'name', valueKey: 'optString', noteKey: 'optName' },
  { key: 'welcomeMessage', valueKey: 'optString', noteKey: 'optWelcomeMessage' },
  { key: 'theme.primaryColor', valueKey: 'optHex', noteKey: 'optPrimaryColor' },
  { key: 'theme.position', valueKey: 'optPositionValues', noteKey: 'optPosition' },
  { key: 'options.autoOpen', valueKey: 'optBoolean', noteKey: 'optAutoOpen' },
  { key: 'options.ui.colorScheme', valueKey: 'optColorSchemeValues', noteKey: 'optColorScheme' },
  { key: 'options.ui.borderRadius', valueKey: 'optCssLength', noteKey: 'optBorderRadius' },
  { key: 'options.ui.avatarUrl', valueKey: 'optUrlOrNull', noteKey: 'optAvatarUrl' },
  { key: 'options.ui.launcherIconUrl', valueKey: 'optUrlOrNull', noteKey: 'optLauncherIconUrl' },
  { key: 'options.ui.mobileFullScreen', valueKey: 'optBoolean', noteKey: 'optMobileFullScreen' },
  { key: 'options.a11y.trapFocus', valueKey: 'optAutoOrBoolean', noteKey: 'optTrapFocus' },
  { key: 'options.a11y.announceMessages', valueKey: 'optBoolean', noteKey: 'optAnnounceMessages' },
  { key: 'options.enableMarkdown', valueKey: 'optBoolean', noteKey: 'optEnableMarkdown' },
  { key: 'options.features.*', valueKey: 'optBoolean', noteKey: 'optFeatures' },
]

export function WebsiteConfigReference() {
  const t = useTranslations('Integration')
  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle className="flex items-center text-base">
          <Settings className="mr-2 h-4 w-4" />
          {t('configOptionsTitle')}
        </CardTitle>
        <CardDescription>
          {t('configOptionsDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* La table déborde sur mobile : elle défile dans son propre conteneur
            plutôt que de faire défiler la page entière. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">{t('key')}</th>
                <th className="pb-2 pr-4 font-medium">{t('values')}</th>
                <th className="pb-2 font-medium">{t('description')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {OPTIONS.map(({ key, valueKey, noteKey }) => (
                <tr key={key} className="align-top">
                  <td className="py-2 pr-4">
                    <code className="text-xs">{key}</code>
                  </td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{t(valueKey)}</td>
                  <td className="py-2 text-muted-foreground">{t(noteKey)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="rounded-lg bg-gray-50 p-4 text-sm text-muted-foreground">
          {t('configCmsFallbackIntro')}{' '}
          <code className="mx-1">data-tenant-id</code> {t('and')} <code className="mx-1">data-api-url</code>{' '}
          {t('configCmsFallbackAsAttributes')} <code>window.ChatBotConfig</code>{t('configCmsFallbackPriority')} <code>data-*</code>{t('configCmsFallbackThenUrl')}
        </p>
      </CardContent>
    </SurfaceCard>
  )
}
