'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import {
  CHART_COLORS, CHART_HEIGHT, CHART_TOOLTIP_STYLE, SENTIMENT_LABELS_FR,
} from '@/lib/chart-theme.mjs'

const ORDER = ['positive', 'neutral', 'negative']

/**
 * Répartition des retours clients.
 *
 * Le taux n'est publié qu'au-delà d'un seuil d'échantillon : le backend renvoie
 * `rate: null` en deçà, et on affiche alors explicitement « données
 * insuffisantes » plutôt qu'un pourcentage tiré de deux ou trois avis.
 */
export function SatisfactionChart({ satisfaction, loading }) {
  const distribution = satisfaction?.distribution || {}
  const sampleSize = satisfaction?.sampleSize ?? 0

  const data = ORDER
    .map((key) => ({
      name: SENTIMENT_LABELS_FR[key],
      value: distribution[key] || 0,
      color: CHART_COLORS[key],
    }))
    .filter((entry) => entry.value > 0)

  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle className="text-base">Satisfaction</CardTitle>
        <CardDescription>
          {sampleSize > 0
            ? `${sampleSize} avis analysé(s) sur la période`
            : 'Aucun avis sur la période'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading || data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Pas assez de retours clients pour établir une répartition.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, name) => [`${value} avis`, name]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-3 gap-4">
              {data.map((entry) => (
                <div key={entry.name} className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                  {/* Comptes absolus, jamais suffixés d'un `%`. */}
                  <span className="ml-auto text-sm font-medium">{entry.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </SurfaceCard>
  )
}
