import { useCallback, useState } from 'react'
import { useKnowledge } from '@/hooks/use-knowledge'
import { useCrawl } from '@/hooks/use-crawl'
import { useToast } from '@/hooks/use-toast'
import { knowledgeAPI, knowledgeHelpers } from '@/lib/api-knowledge'
import { fileKey } from '@/lib/file-key.mjs'

const EMPTY_FORM = { title: '', content: '', tags: [] }

export function useKnowledgeUI() {
  const { toast } = useToast()
  const knowledgeState = useKnowledge()
  const refreshKnowledge = knowledgeState.refresh
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [createMethod, setCreateMethod] = useState('manual')
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [urlInput, setUrlInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState({})
  const [crawlOptions, setCrawlOptions] = useState({
    maxPages: 50, maxDepth: 3, includeSubdomains: false, sitemapUrl: ''
  })

  const handleCrawlFinished = useCallback(async () => {
    await refreshKnowledge?.()
  }, [refreshKnowledge])
  const crawl = useCrawl({ onFinished: handleCrawlFinished })

  const resetForm = () => {
    setFormData(EMPTY_FORM)
    setUrlInput('')
    setSelectedFiles([])
    setSelectedItem(null)
    setUploadResults({})
  }

  const uploadFiles = async () => {
    const failures = []
    const queue = [...selectedFiles]
    const uploadOne = async file => {
      const key = fileKey(file)
      try {
        const onProgress = progress => setUploadResults(previous => ({
          ...previous, [key]: { progress }
        }))
        const data = selectedFiles.length > 1 ? { ...formData, title: '' } : formData
        await knowledgeAPI.createKnowledgeFromFile(file, {
          title: data.title || knowledgeHelpers.generateTitleFromFilename(file.name),
          tags: knowledgeHelpers.cleanTags(data.tags)
        }, onProgress)
        setUploadResults(previous => ({ ...previous, [key]: { success: true } }))
      } catch (error) {
        failures.push(file)
        setUploadResults(previous => ({
          ...previous, [key]: { error: error.message || "Échec de l'import" }
        }))
      }
    }
    const worker = async () => {
      while (queue.length) await uploadOne(queue.shift())
    }
    await Promise.all([worker(), worker()])
    if (failures.length) {
      await knowledgeState.refresh?.()
      setSelectedFiles(failures)
      return false
    }
    await knowledgeState.refresh?.()
    return true
  }

  const handleCreate = async () => {
    if (createMethod === 'file' && !selectedFiles.length) {
      return toast.error('Sélectionnez au moins un fichier valide.')
    }
    if (createMethod === 'site') {
      return crawl.startCrawl(urlInput, {
        title: formData.title || undefined,
        tags: formData.tags,
        ...crawlOptions,
        sitemapUrl: crawlOptions.sitemapUrl || undefined
      }).catch(() => {})
    }
    try {
      setUploading(true)
      const success = createMethod === 'file'
        ? await uploadFiles()
        : await knowledgeState.createKnowledge(formData, createMethod, null, urlInput)
      if (success === false) return
      setIsCreateOpen(false)
      resetForm()
    } catch {
      // useKnowledge affiche déjà l'erreur.
    } finally {
      setUploading(false)
    }
  }

  const handleCreateOpenChange = open => {
    setIsCreateOpen(open)
    if (!open) {
      crawl.reset()
      resetForm()
    }
  }

  const handleUpdate = async () => {
    try {
      await knowledgeState.updateKnowledge(selectedItem.id, formData)
      setIsEditOpen(false)
      resetForm()
    } catch {}
  }

  const handleView = item => { setSelectedItem(item); setIsViewOpen(true) }
  const handleEdit = item => {
    setSelectedItem(item)
    setFormData({ title: item.title, content: item.fullContent || item.content, tags: item.tags || [] })
    setIsEditOpen(true)
  }
  const handleFilesSelected = items => {
    setSelectedFiles(previous => [...previous, ...items.map(item => item.file)])
    items.forEach(({ file, originalSize }) => {
      if (originalSize > file.size * 1.1) {
        toast.info(`Image compressée : ${knowledgeHelpers.formatFileSize(originalSize)} → ${knowledgeHelpers.formatFileSize(file.size)}`)
      }
    })
  }
  const handleRemoveFile = file => {
    setSelectedFiles(previous => previous.filter(candidate => candidate !== file))
    setUploadResults(previous => {
      const next = { ...previous }
      delete next[fileKey(file)]
      return next
    })
  }
  const handleTagsChange = value => setFormData(previous => ({
    ...previous, tags: knowledgeHelpers.cleanTags(value)
  }))
  const handleExport = () => knowledgeState.exportKnowledge('json', {
    includeInactive: knowledgeState.filters.isActive === 'all',
    sourceType: knowledgeState.filters.sourceType || undefined
  })

  return {
    ...knowledgeState,
    isCreateOpen, setIsCreateOpen,
    isEditOpen, setIsEditOpen,
    isViewOpen, setIsViewOpen,
    selectedItem,
    createMethod, setCreateMethod,
    formData, setFormData,
    urlInput, setUrlInput,
    selectedFiles, setSelectedFiles,
    uploading, uploadResults,
    crawlOptions, setCrawlOptions,
    crawlJob: crawl.job,
    crawlStarting: crawl.starting,
    handleCreate,
    handleCreateOpenChange,
    handleUpdate,
    handleView,
    handleEdit,
    handleDelete: knowledgeState.deleteKnowledge,
    handleFilesSelected,
    handleRemoveFile,
    handleFileError: message => toast.error(message),
    handleTagsChange,
    handleExport
  }
}
