import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { chatAPI } from '@/lib/api'
import { useToast } from './use-toast'

export function useConversationOrganization(onConversationUpdate) {
  const t = useTranslations('Conversations')
  const { toast } = useToast()
  const [labels, setLabels] = useState([])
  const loadLabels = useCallback(async () => {
    try {
      const response = await chatAPI.getConversationLabels()
      setLabels(response.data?.labels || [])
    } catch { toast.error(t('toastLabelsLoadFailed')) }
  }, [t, toast])
  useEffect(() => { loadLabels() }, [loadLabels])

  const updatePriority = useCallback(async (sessionId, value) => {
    try {
      const response = await chatAPI.updateConversationPriority(sessionId, value)
      onConversationUpdate(sessionId, { priority: response.data?.priority })
    } catch { toast.error(t('toastPriorityFailed')) }
  }, [onConversationUpdate, t, toast])

  const assignLabels = useCallback(async (sessionId, labelIds) => {
    try {
      const response = await chatAPI.assignConversationLabels(sessionId, labelIds)
      onConversationUpdate(sessionId, { labels: response.data?.labels || [] })
    } catch { toast.error(t('toastLabelsUpdateFailed')) }
  }, [onConversationUpdate, t, toast])

  const createLabel = useCallback(async data => {
    try {
      const response = await chatAPI.createConversationLabel(data)
      const label = response.data?.label
      setLabels(items => [...items, label].filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)))
      return label
    } catch (error) { toast.error(error.message || t('toastLabelCreateFailed')); return null }
  }, [t, toast])

  const updateLabel = useCallback(async (id, data) => {
    try {
      const response = await chatAPI.updateConversationLabel(id, data)
      const label = response.data?.label
      setLabels(items => items.map(item => item.id === id ? label : item))
      return label
    } catch (error) { toast.error(error.message || t('toastLabelUpdateFailed')); return null }
  }, [t, toast])

  const deleteLabel = useCallback(async id => {
    try {
      await chatAPI.deleteConversationLabel(id)
      setLabels(items => items.filter(item => item.id !== id))
      return true
    } catch { toast.error(t('toastLabelDeleteFailed')); return false }
  }, [t, toast])

  return { labels, updatePriority, assignLabels, createLabel, updateLabel, deleteLabel }
}
