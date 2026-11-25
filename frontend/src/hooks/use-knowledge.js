// frontend/src/hooks/use-knowledge.js - Version corrigée pour éviter les boucles infinies
import { useState, useEffect, useCallback, useRef } from 'react'
import { knowledgeAPI, knowledgeHelpers } from '@/lib/api-knowledge'
import { useToast } from './use-toast'

export const useKnowledge = () => {
  const { toast } = useToast()
  
  // États pour les données
  const [knowledge, setKnowledge] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    withEmbedding: 0,
    avgContentLength: 0,
    bySourceType: [],
    topTags: [],
    embeddingCoverage: 0,
    rag: {
      embeddingProviderAvailable: false,
      minSimilarity: 0.35,
      topK: 5,
      activeDocuments: 0,
      indexedDocuments: 0,
      embeddingCoverage: 0,
      chunks: { total: 0, done: 0, pending: 0, indexing: 0, error: 0 }
    }
  })
  
  // États pour la pagination et filtres
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    search: '',
    sourceType: '',
    tags: '',
    isActive: 'true',
    sortBy: 'createdAt',
    sortOrder: 'DESC'
  })
  
  // États de loading
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // Refs pour éviter les boucles infinies
  const loadingRef = useRef(false)
  const initialLoadDoneRef = useRef(false)
  const searchTimeoutRef = useRef(null)

  // Charger la liste des connaissances - Version stable sans dependencies qui changent
  const loadKnowledge = useCallback(async (page = 1, customFilters = null) => {
    // Éviter les appels multiples simultanés
    if (loadingRef.current) {
      return []
    }
    
    loadingRef.current = true
    setSearchLoading(true)
    
    try {
      // Utiliser les filtres fournis ou les filtres actuels
      const filtersToUse = customFilters || filters
      
      const response = await knowledgeAPI.getKnowledgeBase({
        page,
        limit: 20,
        search: filtersToUse.search,
        sourceType: filtersToUse.sourceType,
        tags: filtersToUse.tags,
        isActive: filtersToUse.isActive,
        sortBy: filtersToUse.sortBy,
        sortOrder: filtersToUse.sortOrder
      })

      setKnowledge(response.data)
      setTotalPages(response.pagination.pages)
      setCurrentPage(page)
      
      return response.data
    } catch (error) {
      toast.error('Erreur lors du chargement des connaissances')
      console.error('Load knowledge error:', error)
      return []
    } finally {
      setSearchLoading(false)
      loadingRef.current = false
    }
  }, [filters, toast])

  // Charger les statistiques - Version stable
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      const response = await knowledgeAPI.getKnowledgeStats()
      setStats(response.data)
      return response.data
    } catch (error) {
      console.error('Load stats error:', error)
      // Ne pas afficher d'erreur pour les stats, c'est moins critique
      return null
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Créer une nouvelle connaissance - Version optimisée
  const createKnowledge = useCallback(async (data, method = 'manual', file = null, url = '', onProgress) => {
    try {
      let response

      switch (method) {
        case 'manual':
          const validation = knowledgeHelpers.validateContent(data.content)
          if (!validation.isValid) {
            throw new Error(validation.error)
          }
          response = await knowledgeAPI.createKnowledge({
            ...data,
            tags: knowledgeHelpers.cleanTags(data.tags)
          })
          break

        case 'file':
          if (!file) {
            throw new Error('Fichier requis')
          }
          const fileValidation = knowledgeHelpers.validateFile(file)
          if (!fileValidation.isValid) {
            throw new Error(fileValidation.errors.join(', '))
          }
          response = await knowledgeAPI.createKnowledgeFromFile(file, {
            title: data.title || knowledgeHelpers.generateTitleFromFilename(file.name),
            tags: knowledgeHelpers.cleanTags(data.tags)
          }, onProgress)
          break

        case 'url':
          const urlValidation = knowledgeHelpers.validateUrl(url)
          if (!urlValidation.isValid) {
            throw new Error(urlValidation.error)
          }
          response = await knowledgeAPI.createKnowledgeFromUrl(url, {
            ...(data.title?.trim() && { title: data.title.trim() }),
            tags: knowledgeHelpers.cleanTags(data.tags)
          })
          break

        default:
          throw new Error('Méthode de création non supportée')
      }

      toast.success('Connaissance créée avec succès')
      
      // Recharger les données de manière contrôlée
      await Promise.all([
        loadKnowledge(currentPage),
        loadStats()
      ])
      
      return response.data
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la création')
      throw error
    }
  }, [toast, loadKnowledge, loadStats, currentPage])

  // Mettre à jour une connaissance
  const updateKnowledge = useCallback(async (id, data) => {
    try {
      const validation = knowledgeHelpers.validateContent(data.content)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }

      const response = await knowledgeAPI.updateKnowledge(id, {
        ...data,
        tags: knowledgeHelpers.cleanTags(data.tags)
      })

      toast.success('Connaissance mise à jour avec succès')
      
      // Recharger seulement la page courante
      await loadKnowledge(currentPage)
      
      return response.data
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la mise à jour')
      throw error
    }
  }, [toast, loadKnowledge, currentPage])

  // Supprimer une connaissance
  const deleteKnowledge = useCallback(async (id) => {
    try {
      await knowledgeAPI.deleteKnowledge(id)
      
      toast.success('Connaissance supprimée définitivement')
      
      // Recharger de manière contrôlée
      await Promise.all([
        loadKnowledge(currentPage),
        loadStats()
      ])
      
      return true
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la suppression')
      throw error
    }
  }, [toast, loadKnowledge, loadStats, currentPage])

  // Dupliquer une connaissance
  const duplicateKnowledge = useCallback(async (id) => {
    try {
      const response = await knowledgeAPI.duplicateKnowledge(id)
      
      toast.success('Connaissance dupliquée avec succès')
      
      await Promise.all([
        loadKnowledge(currentPage),
        loadStats()
      ])
      
      return response.data
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la duplication')
      throw error
    }
  }, [toast, loadKnowledge, loadStats, currentPage])

  // Archiver/Désarchiver une connaissance
  const archiveKnowledge = useCallback(async (id, archive = true) => {
    try {
      // Debug: log la valeur de archive
      console.debug('[archiveKnowledge] id:', id, 'archive:', archive)
      await knowledgeAPI.archiveKnowledge(id, archive)
      toast.success(`Connaissance ${archive ? 'archivée' : 'désarchivée'} avec succès`)
      await Promise.all([
        loadKnowledge(currentPage),
        loadStats()
      ])
      return true
    } catch (error) {
      toast.error(error.message || `Erreur lors de l'${archive ? 'archivage' : 'désarchivage'}`)
      throw error
    }
  }, [toast, loadKnowledge, loadStats, currentPage])

  // Rechercher dans la base de connaissances
  const searchKnowledge = useCallback(async (query, limit = 10) => {
    try {
      const response = await knowledgeAPI.searchKnowledge(query, limit)
      return response.data
    } catch (error) {
      toast.error('Erreur lors de la recherche')
      throw error
    }
  }, [toast])

  // Export des connaissances
  const exportKnowledge = useCallback(async (format = 'json', options = {}) => {
    try {
      await knowledgeAPI.exportKnowledge(format, options)
      toast.success('Export terminé')
      return true
    } catch (error) {
      toast.error(error.message || 'Erreur lors de l\'export')
      throw error
    }
  }, [toast])

  // Regénérer les embeddings
  const regenerateEmbeddings = useCallback(async (force = false) => {
    try {
      setRegenerating(true)
      const response = await knowledgeAPI.regenerateEmbeddings(force)
      const result = response.data
      const embedded = result.summary?.chunksEmbedded || 0
      const created = result.summary?.chunksCreated || 0
      const errors = result.status?.chunks?.error || 0

      toast.success(
        `Indexation terminée : ${created} chunks créés, ${embedded} embeddings générés${errors ? `, ${errors} en erreur` : ''}`
      )
      await loadStats()

      return result
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la régénération')
      throw error
    } finally {
      setRegenerating(false)
    }
  }, [toast, loadStats])

  // Mettre à jour les filtres - Version simplifiée
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters }
      
      // Recharger immédiatement avec les nouveaux filtres
      // mais seulement si ce n'est pas une recherche (qui a son propre debounce)
      if (!newFilters.hasOwnProperty('search')) {
        setTimeout(() => loadKnowledge(1, updated), 100)
      }
      
      return updated
    })
    setCurrentPage(1)
  }, [loadKnowledge])

  // Changer de page
  const changePage = useCallback((page) => {
    setCurrentPage(page)
    loadKnowledge(page)
  }, [loadKnowledge])

  // Recherche avec debounce
  const debouncedSearch = useCallback((searchTerm) => {
    clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      const newFilters = { ...filters, search: searchTerm }
      setFilters(newFilters)
      loadKnowledge(1, newFilters)
    }, 500)
  }, [filters, loadKnowledge])

  useEffect(() => () => {
    clearTimeout(searchTimeoutRef.current)
  }, [])

  // Import en lot
  const bulkImportKnowledge = useCallback(async (items) => {
    try {
      const response = await knowledgeAPI.bulkImport(items)
      
      const { imported, errors } = response.data
      
      if (errors.length > 0) {
        toast.warning(`Import terminé: ${imported} succès, ${errors.length} erreurs`)
      } else {
        toast.success(`${imported} connaissances importées avec succès`)
      }
      
      await Promise.all([
        loadKnowledge(currentPage),
        loadStats()
      ])
      
      return response.data
    } catch (error) {
      toast.error(error.message || 'Erreur lors de l\'import')
      throw error
    }
  }, [toast, loadKnowledge, loadStats, currentPage])

  // Chargement initial - Une seule fois
  useEffect(() => {
    if (initialLoadDoneRef.current) {
      return
    }
    
    initialLoadDoneRef.current = true
    setLoading(true)
    
    Promise.all([
      loadKnowledge(1),
      loadStats()
    ]).finally(() => {
      setLoading(false)
    })
  }, [loadKnowledge, loadStats])

  return {
    // Données
    knowledge,
    stats,
    currentPage,
    totalPages,
    filters,

    // États de loading
    loading,
    statsLoading,
    searchLoading,
    regenerating,

    // Actions CRUD
    createKnowledge,
    updateKnowledge,
    deleteKnowledge,
    duplicateKnowledge,
    archiveKnowledge,

    // Actions de recherche et filtrage
    searchKnowledge,
    updateFilters,
    debouncedSearch,
    changePage,

    // Actions en lot
    bulkImportKnowledge,
    exportKnowledge,
    regenerateEmbeddings,

    // Actions de rechargement manuel
    refresh: useCallback(() => {
      Promise.all([loadKnowledge(currentPage), loadStats()])
    }, [loadKnowledge, loadStats, currentPage])
  }
}

export default useKnowledge
