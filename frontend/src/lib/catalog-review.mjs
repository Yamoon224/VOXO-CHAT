// Libellés résolus via `useTranslations('Knowledge')` côté composants :
// `t(tab.labelKey)` / `t(config.labelKey)`.
export const REVIEW_TABS = [
  { value: 'new', labelKey: 'reviewTabNew' },
  { value: 'saved', labelKey: 'reviewTabSaved' },
  { value: 'validated', labelKey: 'reviewTabValidated' },
]

export const GLOBAL_REVIEW_ACTIONS = {
  new: { action: 'save', labelKey: 'reviewActionSaveAll' },
  saved: { action: 'validate', labelKey: 'reviewActionValidateAll' },
  validated: { action: 'reopen', labelKey: 'reviewActionReopenAll' },
}

export function productReviewStatus(product = {}) {
  const metadata = product.metadata || {}
  if (['new', 'saved', 'validated'].includes(metadata.reviewStatus)) return metadata.reviewStatus
  if (metadata.validatedAt && metadata.validatedBy) return 'validated'
  if (metadata.manuallyCorrected && metadata.reviewRequired) return 'saved'
  return 'new'
}

export function productsByReviewStatus(products = []) {
  return Object.fromEntries(REVIEW_TABS.map(tab => [
    tab.value, products.filter(product => productReviewStatus(product) === tab.value),
  ]))
}
