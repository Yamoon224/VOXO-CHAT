import { useState, useEffect, useCallback, useRef } from 'react'
import Cookies from 'js-cookie'
import { useLocale, useTranslations } from 'next-intl'
import { chatAPI } from '@/lib/api'
import { formatDateShort, formatDateTime } from '@/lib/format.mjs'
import { useToast } from './use-toast'
import { useRealtimeChannel } from './use-realtime-channel'

export function useConversationsUI() {
  const t = useTranslations('Conversations')
  const locale = useLocale()
  const { toast } = useToast()
  const [conversations, setConversations] = useState([])
  const [filteredConversations, setFilteredConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [labelFilter, setLabelFilter] = useState([])
  const [unreadFilter, setUnreadFilter] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // Statistiques calculées localement sur les données chargées
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    ended: 0,
    avgRating: 0
  })

  // Charger les conversations depuis l'API
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 })
  const [hasNewConversationsAtTop, setHasNewConversationsAtTop] = useState(false)
  const refreshTimer = useRef(null)

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: 20
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      if (priorityFilter !== 'all') params.priority = priorityFilter
      if (labelFilter.length) params.labelId = labelFilter.join(',')
      params.sortBy = sortBy === 'priority' ? 'priority' : 'updatedAt'
      params.sortOrder = sortOrder

      const response = await chatAPI.getConversations(params)

      if (response.success) {
        // Le backend renvoie { conversations: [], pagination: {} } dans data
        const data = response.data?.conversations || []
        setConversations(data)

        if (response.data?.pagination) {
          setPagination(response.data.pagination)
        }

        // Calculer les stats simples basées sur les conversations chargées
        // Note: Idéalement ces stats viendraient d'un endpoint analytics dédié
        const total = response.data?.pagination?.total || data.length
        const active = data.filter(c => c.status === 'active').length
        const ended = data.filter(c => c.status === 'ended').length
        const rated = data.filter(c => c.satisfactionRating)
        const avgRating = rated.length > 0
          ? rated.reduce((acc, c) => acc + c.satisfactionRating, 0) / rated.length
          : 0

        setStats({ total, active, ended, avgRating })
      }
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setError(err.message)
      toast.error(t('toastLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter, labelFilter, sortBy, sortOrder, pagination.page, t, toast])

  const fetchConversationHistory = useCallback(async (sessionId) => {
    try {
      setHistoryLoading(true)
      const response = await chatAPI.getConversationHistory(sessionId)

      if (response.success) {
        const data = response.data || {}
        const messages = data.messages || []
        
        setSelectedConversation(prev => {
          if (prev && prev.sessionId === sessionId) {
            return { ...prev, ...data, messages }
          }
          return { ...data, messages }
        })
        return data
      }
    } catch (err) {
      console.error('Error fetching conversation history:', err)
      toast.error(t('toastHistoryFailed'))
    } finally {
      setHistoryLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => () => clearTimeout(refreshTimer.current), [])
  useRealtimeChannel({
    path: '/conversations/socket',
    token: Cookies.get('accessToken'),
    onEvent: event => {
      if (event.type !== 'conversation.list.changed') return
      if (pagination.page > 1) setHasNewConversationsAtTop(true)
      clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(fetchConversations, 350)
    },
  })

  // Filtrage et tri des conversations (côté client pour la recherche instantanée)
  useEffect(() => {
    let filtered = [...conversations]

    // Filtrage par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(conv =>
        (conv.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (conv.userEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (conv.topic?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (conv.sessionId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (conv.messages && conv.messages.some(msg =>
          (msg.content?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        ))
      )
    }
    if (unreadFilter) filtered = filtered.filter(conv => conv.isUnread)

    // Tri
    filtered.sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]

      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      }

      if (sortBy === 'priority') {
        const rank = { normal: 1, important: 2, urgent: 3, critical: 4 }
        aValue = rank[a.priority?.value || a.priority] || 1
        bValue = rank[b.priority?.value || b.priority] || 1
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredConversations(filtered)
  }, [conversations, searchTerm, sortBy, sortOrder, unreadFilter])

  const handleViewDetails = (conversation) => {
    setSelectedConversation(conversation)
    setIsDetailOpen(true)
  }

  const handleExport = () => {
    // Implémentation basique de l'export CSV
    if (conversations.length === 0) return

    const headers = [t('csvId'), t('csvName'), t('csvEmail'), t('csvStatus'), t('csvSubject'), t('csvMessages'), t('csvRating'), t('csvDate')]
    const rows = conversations.map(c => [
      c.id,
      c.userName || t('dialogAnonymous'),
      c.userEmail || t('dialogAnonymous'),
      c.status,
      c.topic || 'N/A',
      c.messages?.length || 0,
      c.satisfactionRating || 'N/A',
      formatDateShort(c.createdAt, locale)
    ])

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `conversations_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(t('toastCsvSuccess'))
  }

  const handleExportPDF = async (conversation) => {
    if (!conversation) return
    
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      
      // Header
      doc.setFontSize(20)
      doc.setTextColor(59, 130, 246) // Blue 600
      doc.text(t('pdfReportTitle'), 14, 22)
      
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(t('pdfGeneratedOn', { date: formatDateTime(new Date(), locale) }), 14, 30)
      
      // User Info Box
      doc.setDrawColor(229, 231, 235)
      doc.setFillColor(249, 250, 251)
      doc.rect(14, 35, pageWidth - 28, 30, 'F')
      
      doc.setFontSize(12)
      doc.setTextColor(0)
      doc.setFont(undefined, 'bold')
      doc.text(t('pdfCustomer', { name: conversation.userName || t('dialogAnonymous') }), 20, 45)
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      doc.text(t('pdfEmail', { email: conversation.userEmail || 'N/A' }), 20, 52)
      doc.text(t('pdfSessionId', { sessionId: conversation.sessionId }), 20, 58)
      
      doc.text(t('pdfStatus', { status: conversation.status === 'active' ? t('statusActive') : t('statusEnded') }), pageWidth / 2, 45)
      doc.text(t('pdfDate', { date: formatDateTime(conversation.createdAt, locale) }), pageWidth / 2, 52)
      doc.text(t('pdfChannel', { channel: conversation.channel || t('channelWeb') }), pageWidth / 2, 58)

      // Messages Table
      const tableData = conversation.messages.map(msg => [
        msg.role === 'user' ? (conversation.userName || t('senderUser')) : t('senderAi'),
        msg.content,
        formatDateTime(msg.timestamp, locale)
      ])

      autoTable(doc, {
        startY: 70,
        head: [[t('pdfColumnSender'), t('pdfColumnMessage'), t('pdfColumnDate')]],
        body: tableData,
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 40 }
        },
        styles: { fontSize: 9, cellPadding: 5 },
        margin: { top: 70 }
      })

      // Footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(t('pdfPageOf', { page: i, total: pageCount }), pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' })
      }

      doc.save(`conversation_${conversation.sessionId.substring(0, 8)}.pdf`)
      toast.success(t('toastPdfSuccess'))
    } catch (error) {
      console.error('PDF Error:', error)
      toast.error(t('toastPdfFailed'))
    }
  }

  const updateConversationTitle = useCallback(async (sessionId, title) => {
    const response = await chatAPI.updateConversationTitle(sessionId, title)
    if (!response.success) throw new Error(response.message || t('toastTitleFailed'))
    setConversations(items => items.map(item => (
      item.sessionId === sessionId ? { ...item, title } : item
    )))
    setSelectedConversation(item => item?.sessionId === sessionId ? { ...item, title } : item)
    toast.success(t('toastTitleUpdated'))
  }, [t, toast])

  const replaceConversation = useCallback((sessionId, conversation) => {
    setConversations(items => items.map(item => item.sessionId === sessionId ? { ...item, ...conversation } : item))
    setSelectedConversation(item => item?.sessionId === sessionId ? { ...item, ...conversation } : item)
  }, [])
  const markConversationRead = useCallback(async sessionId => {
    await chatAPI.markConversationRead(sessionId)
    replaceConversation(sessionId, { isUnread: false })
  }, [replaceConversation])

  const takeConversation = useCallback(async sessionId => {
    const response = await chatAPI.takeConversation(sessionId)
    if (!response.success) throw new Error(response.message || t('toastTakeFailed'))
    replaceConversation(sessionId, { ...response.data.conversation, handoffStatus: response.data.handoff?.status, handoffReason: response.data.handoff?.reason, assignedAgent: response.data.handoff?.assignedAgent })
    toast.success(t('toastTaken'))
  }, [replaceConversation, t, toast])

  const returnConversationToAi = useCallback(async sessionId => {
    const response = await chatAPI.returnConversationToAi(sessionId)
    if (!response.success) throw new Error(response.message || t('toastReturnFailed'))
    replaceConversation(sessionId, { ...response.data.conversation, handoffStatus: response.data.handoff?.status, handoffReason: response.data.handoff?.reason, assignedAgent: response.data.handoff?.assignedAgent })
    toast.success(t('toastReturned'))
  }, [replaceConversation, t, toast])

  const sendAgentMessage = useCallback(async (sessionId, content, internal, attachment, clientMessageId) => {
    const response = await chatAPI.sendAgentMessage(sessionId, content, internal, attachment, clientMessageId)
    if (!response.success) throw new Error(response.message || t('toastSendFailed'))
    await fetchConversationHistory(sessionId)
    // Le message est enregistré même quand le canal refuse la livraison : sans ce retour,
    // le conseiller croit avoir répondu au client.
    if (response.data?.deliveryStatus === 'failed') {
      toast.error(t('toastDeliveryFailed'))
      return false
    }
    return true
  }, [fetchConversationHistory, t, toast])

  return {
    conversations,
    filteredConversations,
    fetchConversationHistory,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    labelFilter,
    setLabelFilter,
    unreadFilter,
    setUnreadFilter,
    selectedConversation,
    setSelectedConversation,
    isDetailOpen,
    setIsDetailOpen,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    stats,
    loading,
    listLoading: loading,
    historyLoading,
    error,
    handleViewDetails,
    handleExport,
    handleExportPDF,
    updateConversationTitle,
    takeConversation,
    returnConversationToAi,
    sendAgentMessage,
    replaceConversation,
    markConversationRead,
    pagination,
    setPagination,
    hasNewConversationsAtTop,
    clearNewConversationsAtTop: () => setHasNewConversationsAtTop(false),
    refresh: fetchConversations
  }
}
