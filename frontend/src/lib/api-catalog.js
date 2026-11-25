import apiClient from './api'
import { createFileFormData } from './multipart.mjs'

export const catalogAPI = {
  list: () => apiClient.get('/knowledge/catalog'),
  create: data => apiClient.post('/knowledge/catalog', data),
  update: (collectionId, data) => apiClient.patch(`/knowledge/catalog/${collectionId}`, data),
  archive: collectionId => apiClient.post(`/knowledge/catalog/${collectionId}/archive`),
  restore: collectionId => apiClient.post(`/knowledge/catalog/${collectionId}/restore`),
  purge: (collectionId, confirmationName) => apiClient.delete(
    `/knowledge/catalog/${collectionId}`,
    { data: { confirmationName } }
  ),
  importFile: (collectionId, file, onProgress) => apiClient.post(
    `/knowledge/catalog/${collectionId}/import`,
    createFileFormData(file),
    {
      timeout: 600000,
      onUploadProgress: event => onProgress?.(
        event.total ? Math.round((event.loaded * 100) / event.total) : 0
      ),
    }
  ),
  updateProduct: (productId, data) => apiClient.patch(`/knowledge/catalog/products/${productId}`, data),
  deleteProduct: productId => apiClient.delete(`/knowledge/catalog/products/${productId}`),
  bulkDeleteProducts: (collectionId, data) => apiClient.delete(
    `/knowledge/catalog/${collectionId}/products`, { data }
  ),
  reviewAllProducts: (collectionId, action) => apiClient.patch(
    `/knowledge/catalog/${collectionId}/products/review`, { action }
  ),
  moveProduct: (productId, collectionId) => apiClient.patch(`/knowledge/catalog/products/${productId}/move`, { collectionId }),
  mergeProducts: (targetId, sourceIds) => apiClient.post('/knowledge/catalog/products/merge', { targetId, sourceIds }),
  splitProduct: (productId, assetIds) => apiClient.post(`/knowledge/catalog/products/${productId}/split`, { assetIds }),
  publish: collectionId => apiClient.post(`/knowledge/catalog/${collectionId}/publish`),
  reanalyzeSource: (collectionId, assetId) => apiClient.post(
    `/knowledge/catalog/${collectionId}/sources/${assetId}/reanalyse`,
    {},
    { timeout: 600000 }
  ),
  assetUrl: assetId => apiClient.get(`/knowledge/catalog/assets/${assetId}/url`),
}
