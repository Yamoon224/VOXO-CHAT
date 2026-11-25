/**
 * Libellés et couleurs des demandes de support, partagés par les deux
 * interfaces (client et administration) pour qu'un même statut ne s'affiche
 * jamais différemment de part et d'autre.
 */

// Libellés résolus via `useTranslations('Support')` côté composants :
// `t(`statuses.${status}`)` (client), `t(`adminStatuses.${status}`)` (admin,
// où « en attente » signifie l'inverse : on attend le client),
// `t(`priorities.${priority}`)`, `t(`reasons.${reason}`)`.

export const STATUS_VARIANTS = {
  open: 'destructive',
  pending: 'secondary',
  resolved: 'outline',
  closed: 'outline',
}

export const PRIORITIES = ['low', 'normal', 'high']

export const SUPPORT_REASONS = ['billing', 'account_access', 'chatbot_setup', 'integrations', 'documents', 'technical_issue', 'other']

/** « 2026-08-20T14:03:00Z » → « 20 août, 14:03 » (ou l'équivalent dans `locale`). */
export function formatMessageDate(value, locale = 'fr') {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}
