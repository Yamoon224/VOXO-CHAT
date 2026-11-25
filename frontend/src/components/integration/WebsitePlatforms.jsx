'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Globe } from 'lucide-react'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'

/**
 * Statuts repris tels quels de l'ancien onglet.
 *
 * `pending` signale une plateforme dont l'installation n'a pas encore été
 * validée en conditions réelles — ce n'est pas la même chose que « ne marche
 * pas », et pas la même chose non plus qu'une plateforme vérifiée.
 */
const PLATFORMS = [
  { name: 'HTML statique', status: 'ok' },
  { name: 'React, Vue, Angular', status: 'ok' },
  { name: 'Wix', status: 'ok' },
  { name: 'Squarespace', status: 'ok' },
  { name: 'Webflow', status: 'ok' },
  { nameKey: 'platformOtherCms', status: 'ok' },
  { name: 'WordPress', status: 'pending' },
  { name: 'WooCommerce', status: 'pending' },
  { name: 'Shopify', status: 'pending' },
]

export function WebsitePlatforms() {
  const t = useTranslations('Integration')
  const locale = useLocale()
  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle className="flex items-center text-base">
          <Globe className="mr-2 h-4 w-4" />
          {t('supportedPlatformsTitle')}
        </CardTitle>
        <CardDescription>
          {t('supportedPlatformsDescription')}
          <code className="mx-1">&lt;script&gt;</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {PLATFORMS.map(({ name, nameKey, status }) => (
            <div key={name || nameKey} className="flex items-center gap-2">
              <span
                className={`h-2 w-2 flex-shrink-0 rounded-full ${
                  status === 'ok' ? 'bg-green-500' : 'bg-amber-500'
                }`}
              />
              <span className="text-sm">{nameKey ? t(nameKey) : name}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" />
          {t('installationNotYetValidated')}
        </p>

        <p className="text-sm">
          <Link className="underline" href={`/${locale}/dashboard/integration/wordpress`}>
            {t('wordpressWoocommerceGuide')}
          </Link>{' '}
          {t('wordpressWoocommerceGuideHint')}
        </p>
      </CardContent>
    </SurfaceCard>
  )
}
