/**
 * Réglages communs aux graphiques Recharts.
 *
 * Les couleurs étaient jusqu'ici écrites en dur dans le tableau de bord client.
 * `/admin/stats` en est le second consommateur : c'est le moment de ne pas
 * dupliquer une seconde palette qui divergerait de la première.
 */

export const CHART_COLORS = {
  primary: '#3b82f6',
  positive: '#10b981',
  neutral: '#3b82f6',
  negative: '#ef4444',
  muted: '#94a3b8',
}

export const SENTIMENT_LABELS_FR = {
  positive: 'Positif',
  neutral: 'Neutre',
  negative: 'Négatif',
}

export const CHART_HEIGHT = 300

/** Grille très discrète : elle situe sans concurrencer la courbe. */
export const CHART_GRID_STROKE = '#f1f5f9'

/** Infobulle en carte blanche bordée, cohérente avec les cartes de la zone admin. */
export const CHART_TOOLTIP_STYLE = {
  borderRadius: '0.75rem',
  border: '1px solid #e5e7eb',
  boxShadow: 'none',
  fontSize: '0.8125rem',
}

/** « 2026-08-19 » → « 19 août », pour un axe lisible sans surcharger. */
export function formatChartDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date)
}
