import test from 'node:test'
import assert from 'node:assert/strict'
import { fileKey } from './file-key.mjs'

test('distingue deux fichiers de même nom ayant un contenu différent', () => {
  assert.notEqual(
    fileKey({ name: 'catalogue.pdf', size: 10, lastModified: 1 }),
    fileKey({ name: 'catalogue.pdf', size: 20, lastModified: 1 })
  )
})
