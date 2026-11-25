'use client'

import { TrendingUp } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Tuile de statistique, en deux apparences.
 *
 * `banner` (défaut) — bandeau plein et coloré. C'est le rendu historique du
 * tableau de bord client : il est reproduit à l'identique pour que l'interface
 * vue par les clients ne bouge pas.
 *
 * `plain` — carte claire à grand chiffre, langage visuel de la plateforme
 * d'administration : la couleur ne porte plus l'information, elle se réduit à
 * la pastille d'icône.
 *
 * Le composant a été extrait du corps de `dashboard/page.js`, où il était
 * recréé à chaque rendu (règle ESLint `react-hooks/static-components`).
 * `formatValue` tolère `null`/`undefined` : l'original appelait
 * `value.toLocaleString()` sans garde et cassait pendant le chargement.
 */
const BANNER_COLORS = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  slate: 'bg-slate-700',
  red: 'bg-red-500',
}

const ICON_COLORS = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-purple-50 text-purple-600',
  slate: 'bg-slate-100 text-slate-700',
  red: 'bg-red-50 text-red-600',
}

const DEFAULT_COLOR = 'blue'

function formatValue(value, format, locale) {
  if (value === null || value === undefined) return '—'
  if (format === 'time') return `${value}s`
  if (format === 'percent') return `${value}%`
  if (format === 'currency') return value
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR').format(Number(value))
}

/** Pied de carte du rendu historique : « +12% vs mois dernier ». */
function ChangeFooter({ change, trend }) {
  const t = useTranslations('Shared')
  const isPositive = trend === 'up' ? change >= 0 : change <= 0

  return (
    <p className={`text-sm flex items-center ${
      change !== 0 ? (isPositive ? 'text-green-600' : 'text-red-600') : 'text-gray-500'
    }`}>
      <TrendingUp className={`h-3 w-3 mr-1 ${!isPositive && change !== 0 ? 'rotate-180' : ''}`} />
      {change !== 0 ? `${isPositive ? '+' : ''}${change}% ${t('statChangeVsLastMonth')}` : t('statChangeStable')}
    </p>
  )
}

function BannerCard({ title, value, change, icon: Icon, trend, format, color, hint }) {
  const locale = useLocale()
  const hasFooter = change !== undefined && change !== null
  const headerClass = BANNER_COLORS[color] || BANNER_COLORS[DEFAULT_COLOR]

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={`${headerClass} text-white p-4 flex items-center justify-between`}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white/90 mb-1">{title}</p>
            <div className="text-2xl font-bold text-white truncate">
              {formatValue(value, format, locale)}
            </div>
          </div>
          {Icon && <Icon className="h-8 w-8 flex-shrink-0 text-white/80" />}
        </div>

        {(hasFooter || hint) && (
          <div className="p-4 bg-white">
            {hasFooter
              ? <ChangeFooter change={change} trend={trend} />
              : <p className="text-sm text-gray-500">{hint}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PlainCard({ title, value, change, icon: Icon, trend, format, color, hint }) {
  const locale = useLocale()
  const hasFooter = change !== undefined && change !== null
  const iconClass = ICON_COLORS[color] || ICON_COLORS[DEFAULT_COLOR]

  return (
    <Card className="rounded-xl border-gray-200 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          {Icon && (
            <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
              <Icon className="h-[18px] w-[18px]" />
            </span>
          )}
        </div>

        <div className="mt-3 truncate text-3xl font-semibold tracking-tight text-gray-900">
          {formatValue(value, format, locale)}
        </div>

        {hasFooter && <div className="mt-2"><ChangeFooter change={change} trend={trend} /></div>}
        {!hasFooter && hint && (
          <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function StatCard({
  title,
  value,
  change,
  icon,
  trend = 'up',
  format = 'number',
  color = DEFAULT_COLOR,
  hint,
  variant = 'banner',
}) {
  const props = { title, value, change, icon, trend, format, color, hint }
  return variant === 'plain' ? <PlainCard {...props} /> : <BannerCard {...props} />
}
