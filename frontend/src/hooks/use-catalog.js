'use client'

import { useCallback, useEffect, useState } from 'react'
import { catalogAPI } from '@/lib/api-catalog'
import { useToast } from '@/hooks/use-toast'
import { fileKey } from '@/lib/file-key.mjs'

export function useCatalog(open) {
  const { toast } = useToast()
  const [collections, setCollections] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [files, setFiles] = useState([])
  const [results, setResults] = useState({})
  const [busy, setBusy] = useState(false)
  const [selectionError, setSelectionError] = useState(null)

  const load = useCallback(async () => {
    try {
      const response = await catalogAPI.list()
      setCollections(response.data || [])
      setActiveId(previous => previous || response.data?.[0]?.id || null)
    } catch (error) {
      toast.error(error.message || 'Impossible de charger les catalogues.')
    }
  }, [toast])

  useEffect(() => { if (open) load() }, [open, load])
  const active = collections.find(collection => collection.id === activeId) || null

  const execute = async (operation, successMessage) => {
    setBusy(true)
    try {
      const response = await operation()
      await load()
      if (successMessage) toast.success(successMessage)
      return response
    } catch (error) {
      toast.error(error.message || "L'opération a échoué.")
      throw error
    } finally {
      setBusy(false)
    }
  }

  const create = async payload => {
    const response = await execute(() => catalogAPI.create(payload), 'Catalogue créé.')
    setActiveId(response.data.id)
    return response.data
  }

  const addFiles = items => {
    setSelectionError(null)
    setFiles(previous => [...previous, ...items.map(item => item.file)])
  }
  const removeFile = file => setFiles(previous => previous.filter(candidate => candidate !== file))

  const importOne = async (collectionId, file) => {
    const key = fileKey(file)
    try {
      const response = await catalogAPI.importFile(collectionId, file, progress => {
        setResults(previous => ({ ...previous, [key]: { progress } }))
      })
      const pageErrors = response.data?.errors || []
      const warning = pageErrors.map(item => item.message).filter(Boolean).join(' ')
      setResults(previous => ({
        ...previous,
        [key]: { success: true, ...(warning && { warning }) }
      }))
      if (warning) toast.warning(`${file.name} : ${warning}`)
      return true
    } catch (error) {
      setResults(previous => ({
        ...previous,
        [key]: { error: error.message || "L'import de ce fichier a échoué." }
      }))
      return false
    }
  }

  const importFiles = async () => {
    if (!activeId || !files.length) return
    setBusy(true)
    try {
      const queue = [...files]
      const failed = []
      const worker = async () => {
        while (queue.length) {
          const file = queue.shift()
          if (!(await importOne(activeId, file))) failed.push(file)
        }
      }
      await Promise.all([worker(), worker()])
      await load()
      setFiles(failed)
      if (!failed.length) {
        toast.success('Analyse terminée. Vérifiez les produits détectés avant publication.')
      }
    } finally {
      setBusy(false)
    }
  }

  const saveProduct = async (id, payload, action = 'save') => {
    const message = action === 'validate' ? 'Fiche produit validée.' : 'Produit enregistré.'
    await execute(() => catalogAPI.updateProduct(id, { ...payload, action }), message)
  }
  const reopenProduct = id => execute(
    () => catalogAPI.updateProduct(id, { action: 'reopen' }),
    'Fiche rouverte pour correction.'
  )
  const publish = async () => {
    await execute(() => catalogAPI.publish(activeId), 'Catalogue publié et indexé.')
  }
  const deleteProduct = async id => {
    await execute(() => catalogAPI.deleteProduct(id), 'Produit supprimé.')
  }
  const moveProduct = async (id, collectionId) => {
    await execute(() => catalogAPI.moveProduct(id, collectionId), 'Produit déplacé.')
  }
  const mergeProducts = async ids => {
    if (ids.length < 2) return
    await execute(() => catalogAPI.mergeProducts(ids[0], ids.slice(1)), 'Produits fusionnés.')
  }
  const splitProduct = async product => {
    if (product.assets?.length < 2) return
    await execute(
      () => catalogAPI.splitProduct(product.id, [product.assets.at(-1).id]),
      'Produit séparé.'
    )
  }
  const getAssetUrl = async id => (await catalogAPI.assetUrl(id)).data.url
  const updateCollection = data => execute(
    () => catalogAPI.update(activeId, data), 'Catalogue mis à jour.'
  )
  const archive = () => execute(
    () => catalogAPI.archive(activeId), 'Catalogue archivé.'
  )
  const restore = () => execute(
    () => catalogAPI.restore(activeId), 'Catalogue restauré en brouillon.'
  )
  const purge = async confirmationName => {
    await execute(
      () => catalogAPI.purge(activeId, confirmationName),
      'Catalogue supprimé définitivement.'
    )
    const response = await catalogAPI.list()
    setCollections(response.data || [])
    setActiveId(response.data?.[0]?.id || null)
  }
  const bulkDeleteProducts = data => execute(
    () => catalogAPI.bulkDeleteProducts(activeId, data),
    'Produits supprimés.'
  )
  const reviewAllProducts = action => execute(
    () => catalogAPI.reviewAllProducts(activeId, action),
    'Fiches mises à jour.'
  )
  const reanalyzeSource = assetId => execute(
    () => catalogAPI.reanalyzeSource(activeId, assetId),
    'Source réanalysée.'
  )

  return {
    collections, active, activeId, setActiveId,
    files, results, busy, selectionError,
    setSelectionError,
    create, addFiles, removeFile, importFiles, saveProduct, reopenProduct,
    deleteProduct, moveProduct, mergeProducts, splitProduct, publish, getAssetUrl,
    updateCollection, archive, restore, purge, bulkDeleteProducts,
    reviewAllProducts, reanalyzeSource,
  }
}
