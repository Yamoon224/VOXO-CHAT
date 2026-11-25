import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GLOBAL_REVIEW_ACTIONS, productReviewStatus, productsByReviewStatus,
} from './catalog-review.mjs'

test('classe les fiches dans les trois étapes de révision', () => {
  const products = [
    { id: 'new', metadata: {} },
    { id: 'saved', metadata: { manuallyCorrected: true, reviewRequired: true } },
    { id: 'validated', metadata: { validatedAt: 'date', validatedBy: 'user' } },
  ]
  const groups = productsByReviewStatus(products)
  assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([key, value]) => (
    [key, value.map(product => product.id)]
  ))), { new: ['new'], saved: ['saved'], validated: ['validated'] })
})

test('définit la bonne clé de libellé et la bonne action pour chaque onglet', () => {
  assert.deepEqual(GLOBAL_REVIEW_ACTIONS.new, {
    action: 'save', labelKey: 'reviewActionSaveAll',
  })
  assert.equal(GLOBAL_REVIEW_ACTIONS.saved.action, 'validate')
  assert.equal(GLOBAL_REVIEW_ACTIONS.validated.action, 'reopen')
  assert.equal(productReviewStatus({ metadata: { reviewStatus: 'validated' } }), 'validated')
})
