'use client'

import { useTranslations } from 'next-intl'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import {
  CHART_COLORS, CHART_GRID_STROKE, CHART_HEIGHT, CHART_TOOLTIP_STYLE, formatChartDate,
} from '@/lib/chart-theme.mjs'

/**
 * Conversations par jour sur la période.
 *
 * Les journées sans trafic arrivent du backend à zéro (comblées par
 * `generate_series`) : l'axe reste donc à l'échelle du temps réel, au lieu de
 * se comprimer sur les seuls jours actifs.
 *
 * `description` est une prop parce que les deux zones ne parlent pas de la même
 * chose : la console d'administration agrège toutes les entreprises, le tableau
 * de bord client ne montre que la sienne. Le texte était écrit en dur et aurait
 * menti côté client.
 */
export function ConversationsTrendChart({
  trend = [],
  loading,
  description,
}) {
  const t = useTranslations('Shared')
  const resolvedDescription = description ?? t('conversationsTrendDefaultDescription')
  const data = trend.map((point) => ({ ...point, label: formatChartDate(point.date) }))
  const isEmpty = !loading && data.every((point) => point.conversations === 0)

  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle className="text-base">{t('conversationsTrendTitle')}</CardTitle>
        <CardDescription>{resolvedDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t('conversationsTrendEmpty')}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" minTickGap={24} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelFormatter={(label) => label}
                formatter={(value) => [value, t('conversationsTrendTooltipLabel')]}
              />
              <Line
                type="monotone"
                dataKey="conversations"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </SurfaceCard>
  )
}
