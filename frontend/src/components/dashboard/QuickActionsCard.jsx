'use client'

import Link from 'next/link'
import { Code, Palette, Plus } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { useTranslations, useLocale } from 'next-intl'

/**
 * Raccourcis vers les trois gestes de démarrage.
 *
 * La pastille d'icône garde une couleur — elle identifie l'action d'un coup
 * d'œil — mais le bloc entier ne se peint plus en bleu, orange ou violet :
 * trois panneaux colorés pour trois liens noyaient le reste de la page.
 */
const ACTIONS = [
  {
    icon: Plus,
    tone: 'bg-blue-50 text-blue-600',
    title: 'addKnowledge', description: 'enrichKnowledge',
    href: '/dashboard/knowledge',
    cta: 'add',
  },
  {
    icon: Palette,
    tone: 'bg-orange-50 text-orange-600',
    title: 'customizeAppearance', description: 'adaptBrand',
    href: '/dashboard/settings',
    cta: 'customize',
  },
  {
    icon: Code,
    tone: 'bg-purple-50 text-purple-600',
    title: 'integrationCode', description: 'integrateWidget',
    href: '/dashboard/integration',
    cta: 'get',
  },
]

export function QuickActionsCard() {
  const t = useTranslations('Dashboard')
  const locale = useLocale()
  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle className="text-base">{t('quickActions')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ACTIONS.map(({ icon: Icon, tone, title, description, href, cta }) => (
          <div
            key={href}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{t(title)}</p>
                <p className="truncate text-xs text-muted-foreground">{t(description)}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="flex-shrink-0" asChild>
              <Link href={`/${locale}${href}`}>{t(cta)}</Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </SurfaceCard>
  )
}
