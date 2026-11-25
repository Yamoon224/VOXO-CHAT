/**
 * Fenêtres de statistiques proposées à l'utilisateur.
 *
 * Presets plutôt qu'un sélecteur de dates libre : trois périodes couvrent le
 * besoin et n'exigent aucune dépendance supplémentaire (ni `react-day-picker`
 * ni `@radix-ui/react-popover` ne sont installés).
 *
 * Les valeurs DOIVENT rester alignées sur `statsPeriodSchema` côté backend, qui
 * rejette tout le reste, et sur `PERIOD_DAYS` de `statsWindow`. Extrait de
 * `use-admin-stats` le jour où le tableau de bord client a eu le même besoin :
 * deux listes auraient divergé.
 */
export const STATS_PERIODS = [
  { value: '7d', labelKey: 'period7d' },
  { value: '30d', labelKey: 'period30d' },
  { value: '90d', labelKey: 'period90d' },
]
