import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_KNOWLEDGE_BATCH_BYTES,
  validateKnowledgeBatch
} from '../hooks/file-rules.mjs'

test('refuse un lot supérieur à 30 Mo avant le réseau', () => {
  const result = validateKnowledgeBatch([
    { size: 10 * 1024 * 1024 },
    { size: 10 * 1024 * 1024 },
    { size: 10 * 1024 * 1024 + 1 },
  ])
  assert.equal(result.valid, false)
  assert.equal(result.errorKey, 'errorBatchTooLarge')
})

test('calcule le volume disponible du lot', () => {
  const result = validateKnowledgeBatch([{ size: 5 * 1024 * 1024 }])
  assert.equal(result.valid, true)
  assert.equal(result.remainingBytes, MAX_KNOWLEDGE_BATCH_BYTES - 5 * 1024 * 1024)
})
