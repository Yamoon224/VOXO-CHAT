import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { chatAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function useConversationExports() {
  const t = useTranslations('Conversations')
  const { toast } = useToast()
  const [selectedSessionIds, setSelectedSessionIds] = useState([])
  const [exporting, setExporting] = useState(false)
  const toggleConversation = sessionId => setSelectedSessionIds(items => (
    items.includes(sessionId) ? items.filter(item => item !== sessionId) : [...items, sessionId]
  ))
  const toggleVisibleConversations = conversations => {
    const ids = conversations.map(item => item.sessionId)
    setSelectedSessionIds(items => ids.every(id => items.includes(id))
      ? items.filter(id => !ids.includes(id)) : [...new Set([...items, ...ids])])
  }
  const downloadConversationPdf = async conversation => {
    try {
      setExporting(true)
      saveBlob(await chatAPI.downloadConversationPdf(conversation.sessionId), `conversation-${conversation.sessionId.slice(0, 8)}.pdf`)
      toast.success(t('toastPdfDownloaded'))
    } catch (error) {
      toast.error(error.message || t('toastDownloadFailed'))
    } finally { setExporting(false) }
  }
  const downloadSelected = async format => {
    if (!selectedSessionIds.length) return toast.error(t('toastSelectAtLeastOne'))
    try {
      setExporting(true)
      const blob = await chatAPI.downloadSelectedConversations(selectedSessionIds, format)
      saveBlob(blob, `conversations-export.${format === 'csv' ? 'csv' : 'zip'}`)
      toast.success(t('toastExportDownloaded'))
      return true
    } catch (error) {
      toast.error(error.message || t('toastExportCreateFailed'))
      return false
    } finally { setExporting(false) }
  }
  const emailConversationPdf = async (conversation, recipient) => {
    try {
      setExporting(true)
      await chatAPI.emailConversationPdf(conversation.sessionId, recipient)
      toast.success(t('toastExportEmailed'))
      return true
    } catch (error) {
      toast.error(error.message || t('toastExportEmailFailed'))
      return false
    } finally { setExporting(false) }
  }
  return { selectedSessionIds, toggleConversation, toggleVisibleConversations, downloadConversationPdf, downloadSelected, emailConversationPdf, exporting }
}
