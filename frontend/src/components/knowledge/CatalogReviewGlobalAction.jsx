'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { GLOBAL_REVIEW_ACTIONS } from '@/lib/catalog-review.mjs'

export function CatalogReviewGlobalAction({ status, count, disabled, onAction }) {
  const t = useTranslations('Knowledge')
  const config = GLOBAL_REVIEW_ACTIONS[status]
  if (!config) return null
  const label = t(config.labelKey)
  const execute = () => {
    if (!count || !window.confirm(`${t('reviewActionConfirm', { label, count })}\n\n${t('reviewActionWarning')}`)) return
    onAction(config.action)
  }
  return (
    <Button type="button" variant={status === 'validated' ? 'outline' : 'default'}
      disabled={disabled || !count} onClick={execute}>
      {t('reviewActionButton', { label, count })}
    </Button>
  )
}
