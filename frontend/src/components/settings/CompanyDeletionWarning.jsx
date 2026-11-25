'use client'

import { useTranslations } from 'next-intl'

const IMPACT_KEYS = ['membersCount', 'knowledgeCount', 'conversationsCount']

/**
 * Affiché quand plus personne ne peut reprendre l'entreprise : la suppression
 * du compte emporte alors le tenant, son abonnement et toutes ses données.
 * La case à cocher force un geste distinct de la saisie du mot de passe.
 */
export function CompanyDeletionWarning({
  tenantName,
  impact,
  confirmed,
  onConfirmedChange,
  disabled,
}) {
  const t = useTranslations('SettingsPage')
  return (
    <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-medium text-red-800">
        {t('deletionNoSuccessor', { name: tenantName })}
      </p>
      <p className="text-sm text-red-700">
        {t('deletionImpact')}
      </p>
      <ul className="list-inside list-disc text-sm text-red-700">
        {IMPACT_KEYS.map(key => (
          <li key={key}>{t(`impact.${key}`, { count: impact?.[key] ?? 0 })}</li>
        ))}
        <li>{t('impact.settings')}</li>
      </ul>
      <label className="flex items-start gap-2 text-sm text-red-800">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-red-600"
          checked={confirmed}
          onChange={(event) => onConfirmedChange(event.target.checked)}
          disabled={disabled}
        />
        <span>{t('deletionConfirm', { name: tenantName })}</span>
      </label>
    </div>
  )
}
