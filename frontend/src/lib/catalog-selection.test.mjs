import test from 'node:test'
import assert from 'node:assert/strict'
import {
  toggleCatalogProduct, toggleAllCatalogProducts, catalogDeletePayload,
} from './catalog-selection.mjs'

test('sélectionne et désélectionne un produit', () => {
  assert.deepEqual(toggleCatalogProduct(['a'], 'b'), ['a', 'b'])
  assert.deepEqual(toggleCatalogProduct(['a', 'b'], 'a'), ['b'])
})

test('sélectionne tout puis désélectionne tout', () => {
  assert.deepEqual(toggleAllCatalogProducts(['a', 'b'], []), ['a', 'b'])
  assert.deepEqual(toggleAllCatalogProducts(['a', 'b'], ['a', 'b']), [])
})

test('construit les suppressions sélectionnée et totale', () => {
  assert.deepEqual(catalogDeletePayload(['a']), { productIds: ['a'] })
  assert.deepEqual(catalogDeletePayload(['a'], true), { all: true })
})
