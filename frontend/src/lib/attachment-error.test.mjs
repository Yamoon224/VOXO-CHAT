import test from 'node:test'
import assert from 'node:assert/strict'
import { attachmentErrorKey } from './attachment-error.mjs'

test('distingue un fichier absent', () => {
  assert.equal(attachmentErrorKey({ code: 'FILE_NOT_FOUND', status: 404 }), 'attachmentNotAvailable')
})

test('distingue un accès refusé', () => {
  assert.equal(attachmentErrorKey({ status: 403 }), 'attachmentForbidden')
})

test('distingue une panne du stockage', () => {
  assert.equal(attachmentErrorKey({ code: 'STORAGE_ERROR', status: 502 }), 'attachmentStorageDown')
})

test('retombe sur un message générique', () => {
  assert.equal(attachmentErrorKey({ status: 500 }), 'attachmentUnavailable')
})
