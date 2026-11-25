import assert from 'node:assert/strict'
import test from 'node:test'
import { catalogSourceUrl } from './catalog-source-url.mjs'

test('ouvre une source PDF signée sur la page produit', () => {
  assert.equal(catalogSourceUrl('https://storage/source.pdf?token=safe', 3),
    'https://storage/source.pdf?token=safe#page=3')
})

test('n ajoute aucun fragment lorsque la page est inconnue', () => {
  assert.equal(catalogSourceUrl('https://storage/source.png?token=safe', null),
    'https://storage/source.png?token=safe')
})
