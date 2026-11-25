'use client'

import { useEffect, useMemo, useState } from 'react'
import Cookies from 'js-cookie'
import { Menu, MessageSquare } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useConversationFetch } from '@/hooks/use-conversation-fetch'
import { ConversationHeader } from './ConversationHeader'
import { ConversationListSidebar } from './ConversationListSidebar'
import { MessageList } from './MessageList'
import { UserDetailsSidebar } from './UserDetailsSideBar'
import { HandoffComposer } from './HandoffComposer'
import { useAuth } from '@/hooks/use-auth'
import { ConversationInboxSkeleton, ConversationListSkeleton } from '@/components/conversations/ConversationSkeletons'

const TYPING_PREVIEW_TTL = 4000

function NoSelection() {
  const t = useTranslations('Conversations')
  return <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center bg-gray-50/50">
    <MessageSquare className="h-12 w-12 text-blue-200 mb-4" />
    <h3 className="text-lg font-semibold text-gray-600 mb-2">{t('inboxSelectPrompt')}</h3>
    <p className="text-sm max-w-xs">{t('inboxSelectHint')}</p>
  </div>
}

export function ConversationInbox({ conversations, selectedConversation, onSelectConversation, fetchHistory, onExportPDF, onEmailExport, onUpdateTitle, onTakeConversation, onReturnToAi, onSendAgentMessage, onMarkRead, organization, listLoading = false, historyLoading = false }) {
  const { user } = useAuth()
  useConversationFetch(selectedConversation, fetchHistory)
  const [query, setQuery] = useState('')
  const [mobileListOpen, setMobileListOpen] = useState(false)
  const [typingPreview, setTypingPreview] = useState({ sessionId: null, text: '' })
  const visibleTypingPreview = typingPreview.sessionId === selectedConversation?.sessionId ? typingPreview.text : ''
  const visibleConversations = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return conversations
    return conversations.filter(item => [item.title, item.userName, item.userEmail, item.sessionId]
      .some(value => value?.toLowerCase().includes(term)))
  }, [conversations, query])
  const selectConversation = conversation => {
    onSelectConversation(conversation)
    if (conversation.isUnread) onMarkRead?.(conversation.sessionId).catch(() => {})
    setMobileListOpen(false)
  }
  useEffect(() => {
    if (selectedConversation?.isUnread) onMarkRead?.(selectedConversation.sessionId).catch(() => {})
  }, [selectedConversation?.sessionId, selectedConversation?.isUnread, onMarkRead])
  useEffect(() => {
    if (!selectedConversation?.sessionId) return undefined
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/^http/, 'ws')
    const tenantId = Cookies.get('tenantId')
    if (!tenantId) return undefined
    let closed = false
    let retry = null
    let attempt = 0
    let socket = null
    let typingTimer = null
    const sessionId = selectedConversation.sessionId
    // L'aperçu porte sa session : au changement de conversation, la saisie de la
    // précédente cesse d'être affichée sans avoir à réinitialiser d'état ici.
    // Une frappe interrompue (visiteur déconnecté, onglet fermé) ne produit
    // aucun événement d'arrêt, d'où l'expiration automatique.
    const showTyping = text => {
      clearTimeout(typingTimer)
      setTypingPreview({ sessionId, text })
      if (text) typingTimer = setTimeout(() => setTypingPreview({ sessionId, text: '' }), TYPING_PREVIEW_TTL)
    }
    const connect = () => {
      socket = new WebSocket(`${base}/widget/conversation/${selectedConversation.sessionId}/socket?tenantId=${tenantId}`)
      socket.onopen = () => { attempt = 0; fetchHistory(selectedConversation.sessionId) }
      socket.onmessage = event => {
        try {
          const data = JSON.parse(event.data)
          // Volontairement avant le rechargement : un aperçu de saisie ne doit
          // jamais déclencher de refetch, sinon chaque frappe relit l'historique.
          if (data.type === 'typing') return showTyping(data.text || '')
          if (data.type === 'message') showTyping('')
          if (data.type === 'message' || data.type === 'handoff' || data.type === 'conversation.sync' || data.type === 'conversation.updated') fetchHistory(selectedConversation.sessionId)
        } catch {}
      }
      socket.onclose = () => {
        if (!closed) retry = setTimeout(connect, Math.min(1000 * (2 ** attempt++), 15000))
      }
    }
    connect()
    return () => { closed = true; clearTimeout(retry); clearTimeout(typingTimer); socket?.close() }
  }, [selectedConversation?.sessionId, fetchHistory])

  if (listLoading && conversations.length === 0) return <ConversationInboxSkeleton />
  return <div className="relative flex h-full min-h-0 bg-white overflow-hidden">
    <div className={`${mobileListOpen ? 'absolute inset-y-0 left-0 z-20 shadow-xl' : 'hidden'} md:static md:flex`}>
      {listLoading && !conversations.length ? <ConversationListSkeleton /> : <ConversationListSidebar conversations={visibleConversations} selectedId={selectedConversation?.sessionId} onSelect={selectConversation} query={query} onQueryChange={setQuery} onClose={() => setMobileListOpen(false)} />}
    </div>
    <div className="flex-1 flex flex-row overflow-hidden min-w-0">
      {selectedConversation ? <>
        <div className="relative flex-1 flex flex-col bg-white min-w-0 border-r overflow-hidden">
          <Button variant="ghost" size="icon" className="absolute top-3 left-3 z-20 md:hidden" onClick={() => setMobileListOpen(true)}><Menu className="h-4 w-4" /></Button>
          <ConversationHeader conversation={selectedConversation} onExportPDF={onExportPDF} onEmailExport={onEmailExport} onUpdateTitle={onUpdateTitle} onTakeConversation={onTakeConversation} />
          <MessageList conversation={selectedConversation} typingPreview={visibleTypingPreview} historyLoading={historyLoading} />
          <HandoffComposer conversation={selectedConversation} onSend={onSendAgentMessage} onReturnToAi={onReturnToAi} canCompose={!selectedConversation.assignedAgent?.id || selectedConversation.assignedAgent.id === user?.id} />
        </div>
        <UserDetailsSidebar conversation={selectedConversation} organization={organization} />
      </> : <NoSelection />}
    </div>
  </div>
}
