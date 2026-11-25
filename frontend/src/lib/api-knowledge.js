// frontend/src/lib/api-knowledge.js - Version corrigée avec timeout et gestion d'erreurs
import apiClient from './api'
import { validateFile as validateSharedFile, acceptAttribute } from '@/hooks/file-rules.mjs'
import { createFileFormData } from './multipart.mjs'

const logKnowledgeError = (...args) => {
  if (process.env.NODE_ENV === 'development') console.error(...args)
}

// API Knowledge Base complète avec gestion d'erreurs améliorée
export const knowledgeAPI = {
  // Liste des connaissances avec filtres et pagination
  getKnowledgeBase: async (params = {}) => {
    const {
      page = 1,
      limit = 20,
      search = '',
      sourceType = '',
      tags = '',
      isActive = 'true',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = params

    try {
      return await apiClient.get('/knowledge', {
        params: {
          page,
          limit,
          ...(search && { search }),
          ...(sourceType && { sourceType }),
          ...(tags && { tags }),
          isActive,
          sortBy,
          sortOrder
        },
        timeout: 15000 // 15 secondes pour cette requête
      })
    } catch (error) {
      logKnowledgeError('Error in getKnowledgeBase:', error)
      
      // Retourner des données vides en cas d'erreur pour éviter les crashes
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Timeout: Le serveur met trop de temps à répondre. Vérifiez que le backend est démarré.')
      }
      
      throw error
    }
  },

  // Récupérer une connaissance spécifique
  getKnowledgeItem: async (id) => {
    try {
      return await apiClient.get(`/knowledge/${id}`, {
        timeout: 10000
      })
    } catch (error) {
      logKnowledgeError(`Error getting knowledge item ${id}:`, error)
      throw error
    }
  },

  // Créer une connaissance manuelle
  createKnowledge: async (data) => {
    try {
      return await apiClient.post('/knowledge', data, {
        timeout: 15000
      })
    } catch (error) {
      logKnowledgeError('Error creating knowledge:', error)
      throw error
    }
  },

  // Créer une connaissance à partir d'un fichier
  createKnowledgeFromFile: async (file, metadata = {}, onProgress) => {
    try {
      const formData = createFileFormData(file, metadata)

      return await apiClient.post('/knowledge/upload', formData, {
        // Content-Type volontairement omis : le navigateur doit poser
        // lui-même le boundary du multipart.
        timeout: 120000, // l'OCR d'un PDF scanné se fait dans la requête
        onUploadProgress: onProgress
          ? (event) => onProgress(event.total ? Math.round((event.loaded * 100) / event.total) : 0)
          : undefined
      })
    } catch (error) {
      logKnowledgeError('Error uploading file:', error)
      throw error
    }
  },

  // Lien signé de courte durée vers le fichier d'origine conservé
  getOriginalFileUrl: async (id) => {
    try {
      return await apiClient.get(`/knowledge/${id}/file`, { timeout: 15000 })
    } catch (error) {
      logKnowledgeError('Error fetching original file url:', error)
      throw error
    }
  },

  // Créer une connaissance à partir d'une URL
  createKnowledgeFromUrl: async (url, metadata = {}) => {
    try {
      return await apiClient.post('/knowledge/from-url', {
        url,
        ...metadata
      }, {
        timeout: 30000 // 30 secondes pour le scraping d'URL
      })
    } catch (error) {
      logKnowledgeError('Error creating knowledge from URL:', error)
      throw error
    }
  },

  // Lancer le crawl multi-pages d'un site (réponse immédiate, suivi par polling)
  crawlSite: async (url, options = {}) => {
    try {
      return await apiClient.post('/knowledge/crawl-site', {
        url,
        ...options
      }, {
        timeout: 30000
      })
    } catch (error) {
      logKnowledgeError('Error starting site crawl:', error)
      throw error
    }
  },

  // Consulter l'avancement d'un crawl
  getCrawlJob: async (id) => {
    try {
      return await apiClient.get(`/knowledge/crawl-jobs/${id}`, {
        timeout: 15000
      })
    } catch (error) {
      logKnowledgeError(`Error fetching crawl job ${id}:`, error)
      throw error
    }
  },

  // Lister les crawls du tenant
  listCrawlJobs: async (limit = 20) => {
    try {
      return await apiClient.get('/knowledge/crawl-jobs', {
        params: { limit },
        timeout: 15000
      })
    } catch (error) {
      logKnowledgeError('Error listing crawl jobs:', error)
      throw error
    }
  },

  // Mettre à jour une connaissance
  updateKnowledge: async (id, data) => {
    try {
      return await apiClient.put(`/knowledge/${id}`, data, {
        timeout: 15000
      })
    } catch (error) {
      logKnowledgeError(`Error updating knowledge ${id}:`, error)
      throw error
    }
  },

  // Supprimer une connaissance
  deleteKnowledge: async (id) => {
    try {
      return await apiClient.delete(`/knowledge/${id}`, {
        timeout: 10000
      })
    } catch (error) {
      logKnowledgeError(`Error deleting knowledge ${id}:`, error)
      throw error
    }
  },

  // Rechercher dans la base de connaissances
  searchKnowledge: async (query, limit = 10) => {
    try {
      return await apiClient.get('/knowledge/search', {
        params: { q: query, limit },
        timeout: 15000
      })
    } catch (error) {
      logKnowledgeError('Error searching knowledge:', error)
      throw error
    }
  },

  // Obtenir les statistiques
  getKnowledgeStats: async () => {
    try {
      return await apiClient.get('/knowledge/stats', {
        timeout: 10000
      })
    } catch (error) {
      logKnowledgeError('Error getting knowledge stats:', error)
      
      // Retourner des stats par défaut en cas d'erreur
      return {
        data: {
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
        }
      }
    }
  },

  // Import en lot
  bulkImport: async (items) => {
    try {
      return await apiClient.post('/knowledge/bulk-import', {
        knowledgeItems: items
      }, {
        timeout: 60000 // 60 secondes pour l'import en lot
      })
    } catch (error) {
      logKnowledgeError('Error in bulk import:', error)
      throw error
    }
  },

  // Regénérer les embeddings
  regenerateEmbeddings: async (force = false) => {
    try {
      return await apiClient.post('/knowledge/regenerate-embeddings', {}, {
        params: { force },
        timeout: 300000 // La reconstruction complete peut prendre plusieurs minutes
      })
    } catch (error) {
      logKnowledgeError('Error regenerating embeddings:', error)
      throw error
    }
  },

  // Dupliquer une connaissance
  duplicateKnowledge: async (id, options = {}) => {
    try {
      return await apiClient.post(`/knowledge/${id}/duplicate`, options, {
        timeout: 15000
      })
    } catch (error) {
      logKnowledgeError(`Error duplicating knowledge ${id}:`, error)
      throw error
    }
  },

  // Archiver/Désarchiver une connaissance
  archiveKnowledge: async (id, archive = true, reason = '') => {
    try {
      return await apiClient.patch(`/knowledge/${id}/archive`, {
        archive,
        ...(reason && { reason })
      }, {
        timeout: 10000
      })
    } catch (error) {
      logKnowledgeError(`Error archiving knowledge ${id}:`, error)
      throw error
    }
  },

  // Exporter les connaissances
  exportKnowledge: async (format = 'json', options = {}) => {
    try {
      const params = { ...options }

      const response = await apiClient.get(`/knowledge/export/${format}`, {
        params,
        responseType: 'blob',
        timeout: 30000
      })

      // Créer un lien de téléchargement
      const blob = new Blob([response.data], { 
        type: format === 'json' ? 'application/json' : 'text/plain' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `knowledge-base-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      return { success: true }
    } catch (error) {
      logKnowledgeError('Error exporting knowledge:', error)
      throw error
    }
  }
}

// Helpers pour validation côté client - Version améliorée
export const knowledgeHelpers = {
  // Valider un fichier avant upload.
  // Les règles (extensions, taille) viennent de shared/file-rules.mjs, partagé
  // avec le widget et miroir de backend/src/config/fileUploads.js.
  validateFile: (file) => {
    const { valid, error } = validateSharedFile(file, 'knowledge')
    return { isValid: valid, errors: valid ? [] : [error] }
  },

  // Extensions acceptées, pour l'attribut accept d'un input file
  fileAccept: () => acceptAttribute('knowledge'),

  // Valider une URL
  validateUrl: (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return {
        isValid: false,
        error: 'URL requise'
      }
    }

    try {
      const urlObj = new URL(url.trim())
      
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          isValid: false,
          error: 'Seuls les protocoles HTTP et HTTPS sont autorisés'
        }
      }
      
      // Empêcher les URLs locales
      const hostname = urlObj.hostname.toLowerCase()
      const localPatterns = [
        /^localhost$/,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2\d|3[01])\./,
        /^192\.168\./,
        /^0\.0\.0\.0$/,
        /^::1$/,
        /^0:0:0:0:0:0:0:1$/
      ]
      
      if (localPatterns.some(pattern => pattern.test(hostname))) {
        return {
          isValid: false,
          error: 'Les URLs locales ne sont pas autorisées'
        }
      }
      
      return { isValid: true }
    } catch {
      return {
        isValid: false,
        error: 'Format d\'URL invalide'
      }
    }
  },

  // Nettoyer et valider les tags
  cleanTags: (tagsInput) => {
    if (!tagsInput) return []
    
    let tags = []
    if (typeof tagsInput === 'string') {
      tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    } else if (Array.isArray(tagsInput)) {
      tags = tagsInput.filter(tag => typeof tag === 'string' && tag.trim().length > 0)
    }
    
    // Supprimer les doublons et limiter à 10
    return [...new Set(tags.map(tag => tag.toLowerCase()))].slice(0, 10)
  },

  // Valider le contenu textuel
  validateContent: (content) => {
    if (!content || typeof content !== 'string') {
      return {
        isValid: false,
        error: 'Contenu requis'
      }
    }
    
    const trimmed = content.trim()
    
    if (trimmed.length === 0) {
      return {
        isValid: false,
        error: 'Le contenu ne peut pas être vide'
      }
    }
    
    if (trimmed.length < 10) {
      return {
        isValid: false,
        error: 'Le contenu doit contenir au moins 10 caractères'
      }
    }
    
    if (trimmed.length > 10000) {
      return {
        isValid: false,
        error: 'Le contenu ne peut pas dépasser 10000 caractères'
      }
    }
    
    return { isValid: true }
  },

  // Générer un titre à partir du nom de fichier
  generateTitleFromFilename: (filename) => {
    if (!filename) return 'Document sans nom'
    
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "")
    return nameWithoutExt
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .slice(0, 100) || 'Document'
  },

  // Formater la taille de fichier
  formatFileSize: (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  },

  // Obtenir l'icône pour un type de source
  getSourceIcon: (sourceType) => {
    const icons = {
      manual: 'FileText',
      upload: 'Upload',
      url: 'Globe',
      api: 'Code'
    }
    return icons[sourceType] || 'FileText'
  },

  // Obtenir la couleur pour un type de source
  getSourceColor: (sourceType) => {
    const colors = {
      manual: 'blue',
      upload: 'green', 
      url: 'purple',
      api: 'orange'
    }
    return colors[sourceType] || 'gray'
  },

  // Tronquer le texte de manière intelligente
  truncateText: (text, maxLength = 200) => {
    if (!text || typeof text !== 'string') return ''
    if (text.length <= maxLength) return text
    
    // Chercher le dernier espace avant la limite
    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...'
    }
    
    return truncated + '...'
  },

  // Extraire les mots-clés pour suggestions de tags
  extractKeywords: (title, content) => {
    const commonWords = [
      'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'à', 
      'dans', 'sur', 'avec', 'pour', 'par', 'ce', 'cette', 'ces', 'il', 'elle', 
      'ils', 'elles', 'que', 'qui', 'dont', 'où', 'est', 'sont', 'était', 
      'étaient', 'être', 'avoir', 'faire', 'aller', 'voir', 'savoir', 'pouvoir', 
      'vouloir', 'devoir', 'dire', 'prendre', 'venir', 'partir', 'comment', 
      'pourquoi', 'quand', 'alors', 'aussi', 'mais', 'donc', 'car', 'ainsi'
    ]
    
    const text = ((title || '') + ' ' + (content || '')).toLowerCase()
    const words = text.match(/\b\w{4,}\b/g) || []
    
    const wordCount = {}
    words.forEach(word => {
      if (!commonWords.includes(word) && word.length >= 4) {
        wordCount[word] = (wordCount[word] || 0) + 1
      }
    })
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word)
  },

  // Valider les données avant création
  validateKnowledgeData: (data) => {
    const errors = []
    
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Titre requis')
    } else if (data.title.length > 500) {
      errors.push('Le titre ne peut pas dépasser 500 caractères')
    }
    
    if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
      errors.push('Contenu requis')
    } else if (data.content.length > 10000) {
      errors.push('Le contenu ne peut pas dépasser 10000 caractères')
    }
    
    if (data.sourceUrl && !this.validateUrl(data.sourceUrl).isValid) {
      errors.push('URL source invalide')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Détecter le type de contenu
  detectContentType: (content) => {
    if (!content) return 'unknown'
    
    const lowerContent = content.toLowerCase()
    
    if (lowerContent.includes('faq') || lowerContent.includes('question')) {
      return 'faq'
    }
    if (lowerContent.includes('prix') || lowerContent.includes('tarif') || lowerContent.includes('coût')) {
      return 'pricing'
    }
    if (lowerContent.includes('guide') || lowerContent.includes('tutoriel') || lowerContent.includes('comment')) {
      return 'guide'
    }
    if (lowerContent.includes('api') || lowerContent.includes('endpoint') || lowerContent.includes('développement')) {
      return 'technical'
    }
    
    return 'general'
  },

  // Estimer le temps de lecture
  estimateReadingTime: (content) => {
    if (!content) return 0
    
    const wordsPerMinute = 200
    const wordCount = content.split(/\s+/).length
    const minutes = Math.ceil(wordCount / wordsPerMinute)
    
    return minutes
  }
}
