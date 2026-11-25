export function toggleCatalogProduct(selectedIds, productId) {
  return selectedIds.includes(productId)
    ? selectedIds.filter(id => id !== productId)
    : [...selectedIds, productId]
}

export function toggleAllCatalogProducts(productIds, selectedIds) {
  return productIds.length > 0 && selectedIds.length === productIds.length ? [] : [...productIds]
}

export function catalogDeletePayload(selectedIds, all = false) {
  return all ? { all: true } : { productIds: [...selectedIds] }
}
