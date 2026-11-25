'use client'

import { Download } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

import { useConversationsUI } from '@/hooks/use-conversations-ui'
import { ConversationsStats } from '@/components/conversations/ConversationsStats'
import { ConversationsFilters } from '@/components/conversations/ConversationsFilters'
import { ConversationsTable } from '@/components/conversations/ConversationsTable'
import { EmptyState } from '@/components/conversations/EmptyState'
import { ConversationsPagination } from '@/components/conversations/ConversationsPagination'
import { ConversationBulkExportDialog } from '@/components/conversations/ConversationBulkExportDialog'
import { useConversationExports } from '@/hooks/use-conversation-exports'
import { useConversationOrganization } from '@/hooks/use-conversation-organization'
import { ConversationsPageSkeleton } from '@/components/conversations/ConversationSkeletons'
import { useLocale, useTranslations } from 'next-intl'

export default function ConversationsPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('Conversations')
  const [exportOpen, setExportOpen] = useState(false)
  const exports = useConversationExports()
  const {
    filteredConversations,
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
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    stats,
    pagination,
    loading,
    setPagination,
    hasNewConversationsAtTop,
    clearNewConversationsAtTop,
    replaceConversation,
  } = useConversationsUI()
  const organization = useConversationOrganization(replaceConversation)

  const handleViewDetails = (conversation) => {
    router.push(`/${locale}/dashboard/conversations/details?id=${conversation.sessionId}`)
  }

  if (loading && filteredConversations.length === 0) return <ConversationsPageSkeleton />

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('pageTitle')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('pageDescription')}</p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <Button variant="outline" size="sm" onClick={() => router.push(`/${locale}/dashboard/conversations/details`)} className="shadow-sm">
            {t('inboxView')}
          </Button>
          <Button onClick={() => setExportOpen(true)} disabled={!exports.selectedSessionIds.length} variant="outline" size="sm" className="shadow-sm">
            <Download className="h-4 w-4 mr-2" />
            {t('exportSelection', { count: exports.selectedSessionIds.length })}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <ConversationsStats stats={stats} />

      {/* Filters */}
      <ConversationsFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        labelFilter={labelFilter}
        setLabelFilter={setLabelFilter}
        unreadFilter={unreadFilter}
        setUnreadFilter={setUnreadFilter}
        labels={organization.labels}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
      />
      {hasNewConversationsAtTop && <button type="button" className="text-sm text-blue-600" onClick={() => { setPagination(page => ({ ...page, page: 1 })); clearNewConversationsAtTop() }}>{t('newAtTop')}</button>}

      {/* Conversations Table */}
      <Card className="border-none shadow-xl shadow-blue-500/5 overflow-hidden">
        <ConversationsTable 
          filteredConversations={filteredConversations}
          handleViewDetails={handleViewDetails}
          handleExportDetails={exports.downloadConversationPdf}
          selectedSessionIds={exports.selectedSessionIds}
          onToggleConversation={exports.toggleConversation}
          onToggleVisible={exports.toggleVisibleConversations}
        />

        {filteredConversations.length === 0 ? (
          <EmptyState searchTerm={searchTerm} statusFilter={statusFilter} />
        ) : (
          <ConversationsPagination 
            pagination={pagination}
            setPagination={setPagination}
          />
        )}
      </Card>
      <ConversationBulkExportDialog open={exportOpen} onOpenChange={setExportOpen} count={exports.selectedSessionIds.length} exporting={exports.exporting} onExport={exports.downloadSelected} />
    </div>
  )
}
