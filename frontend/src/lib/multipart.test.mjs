import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createFileFormData,
  removeJsonContentType,
} from './multipart.mjs'

test('createFileFormData sends the selected file under the file field', () => {
  const file = new File(['contenu'], 'guide.txt', { type: 'text/plain' })
  const formData = createFileFormData(file, { title: 'Guide', tags: ['support'] })

  assert.equal(formData.get('file').name, 'guide.txt')
  assert.equal(formData.get('title'), 'Guide')
  assert.equal(formData.get('tags'), '["support"]')
})

test('removeJsonContentType leaves multipart boundary management to the browser', () => {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }

  removeJsonContentType(headers)

  assert.equal(headers['Content-Type'], undefined)
  assert.equal(headers.Accept, 'application/json')
})

test('createFileFormData rejects a non-file value before making a request', () => {
  assert.throws(() => createFileFormData(null), /fichier sélectionné est invalide/)
})
