/**
 * Formatage des forfaits — AUCUNE limite en dur ici.
 *
 * Les limites et les libellés viennent désormais de l'API (`GET /admin/plans`
 * côté administration, `GET /tenant/quota` côté client). Le miroir qui vivait
 * dans ce fichier annonçait des valeurs que le backend n'appliquait pas.
 */

/**
 * `null` signifie « illimité », partout, backend comme frontend.
 *
 * `t` est la fonction de traduction du namespace `Plans` (`useTranslations('Plans')`) ;
 * `unit` est déjà un libellé traduit (ex. `t('messagesUnit')`).
 */
export function formatLimit(limit, unit, t) {
  return limit === null || limit === undefined ? t('unlimited', { unit }) : `${limit} ${unit}`
}

/** Résumé lisible des limites d'un forfait renvoyé par l'API. */
export function describePlan(plan, t) {
  if (!plan) return ''
  const parts = [
    `${formatLimit(plan.messagesPerMonth, t('messagesUnit'), t)} ${t('perMonth')}`,
    formatLimit(plan.activeDocuments, t('documentsUnit'), t),
  ]
  if (plan.messagesPerDay !== null && plan.messagesPerDay !== undefined) {
    parts.splice(1, 0, `${plan.messagesPerDay} ${t('messagesUnit')} ${t('perDay')}`)
  }
  if (plan.maxUsers !== null && plan.maxUsers !== undefined) {
    parts.push(`${plan.maxUsers} ${t('usersUnit')}`)
  }
  return parts.join(' · ')
}

/** Prix stocké en centimes : jamais un flottant pour de la monnaie. */
export function formatPrice(amount, currency = 'EUR', locale = 'fr') {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format((amount ?? 0) / 100)
}
