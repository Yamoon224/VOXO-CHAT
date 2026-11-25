'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Zap } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'

export function WebsiteQuickStart() {
  const t = useTranslations('Integration')
  const locale = useLocale()
  const steps = [
    t('quickStartStep1'),
    t('quickStartStep2'),
    <>{t('quickStartStep3')} <code className="rounded bg-gray-100 px-1 text-xs">&lt;/body&gt;</code>.</>,
    t('quickStartStep4'),
    t('quickStartStep5'),
  ]
  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle className="flex items-center text-base">
          <Zap className="mr-2 h-4 w-4 text-blue-500" />
          {t('installation')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-inside list-decimal space-y-2 text-sm">
          {steps.map((step, index) => <li key={index}>{step}</li>)}
        </ol>

        {/* Piège récurrent, documenté dans widget/README.md : une page ouverte
            en file:// a une origine opaque et les appels à l'API échouent. */}
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-950">
          {t('quickStartHttpsWarning')}{' '}
          <code>file://</code>{t('quickStartHttpsWarningTail')}
        </p>

        <p className="text-sm text-muted-foreground">
          {t('quickStartRestrictSites')}{' '}
          <Link className="underline" href={`/${locale}/dashboard/settings`}>
            {t('quickStartSettingsPath')}
          </Link>.
        </p>
      </CardContent>
    </SurfaceCard>
  )
}
