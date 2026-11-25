'use client'

import { useEffect, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useConversationsUI } from '@/hooks/use-conversations-ui'
import { ConversationInbox } from '@/components/conversations/details/ConversationInbox.jsx'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { useConversationExports } from '@/hooks/use-conversation-exports'
import { useAuth } from '@/hooks/use-auth'
import { ConversationEmailExportDialog } from '@/components/conversations/details/ConversationEmailExportDialog'
import { useConversationOrganization } from '@/hooks/use-conversation-organization'
import { ConversationInboxSkeleton } from '@/components/conversations/ConversationSkeletons'
import { useLocale } from 'next-intl'

function ConversationDetailsContent() {
    const router = useRouter()
    const locale = useLocale()
    const searchParams = useSearchParams()
    const sessionId = searchParams.get('id')
    const { tenant } = useAuth()
    const [emailConversation, setEmailConversation] = useState(null)
    const exports = useConversationExports()

    const {
        filteredConversations,
        selectedConversation,
        setSelectedConversation,
        fetchConversationHistory,
        updateConversationTitle,
        takeConversation,
        returnConversationToAi,
        sendAgentMessage,
        replaceConversation,
        markConversationRead,
        listLoading,
        historyLoading,
    } = useConversationsUI()
    const organization = useConversationOrganization(replaceConversation)

    useEffect(() => {
        if (sessionId && filteredConversations.length > 0) {
            const conv = filteredConversations.find(c => c.sessionId === sessionId)
            if (conv) {
                setSelectedConversation(conv)
            }
        }
    }, [sessionId, filteredConversations, setSelectedConversation])

    const handleSelectConversation = (conversation) => {
        setSelectedConversation(conversation)
        router.replace(`/${locale}/dashboard/conversations/details?id=${conversation.sessionId}`)
    }

    if (listLoading && filteredConversations.length === 0) return <ConversationInboxSkeleton />

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 items-center gap-4 border-b bg-white px-4 py-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/${locale}/dashboard/conversations`)}
                >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Retour à la liste
                </Button>
                <h1 className="text-lg font-bold text-gray-900">Détails de la conversation</h1>
            </div>

            <div className="flex-1 min-h-0">
                <ConversationInbox
                    conversations={filteredConversations}
                    selectedConversation={selectedConversation}
                    onSelectConversation={handleSelectConversation}
                    onBack={() => router.push(`/${locale}/dashboard/conversations`)}
                    fetchHistory={fetchConversationHistory}
                    onExportPDF={exports.downloadConversationPdf}
                    onEmailExport={setEmailConversation}
                    onUpdateTitle={updateConversationTitle}
                    onTakeConversation={takeConversation}
                    onReturnToAi={returnConversationToAi}
                    onSendAgentMessage={sendAgentMessage}
                    onMarkRead={markConversationRead}
                    organization={organization}
                    listLoading={listLoading}
                    historyLoading={historyLoading}
                />
            </div>
            <ConversationEmailExportDialog open={Boolean(emailConversation)} onOpenChange={open => !open && setEmailConversation(null)} recipients={tenant?.settings?.conversationExport?.allowedRecipients || []} exporting={exports.exporting} onSend={recipient => exports.emailConversationPdf(emailConversation, recipient)} />
        </div>
    )
}

export default function ConversationDetailsPage() {
    return (
        <Suspense fallback={
            <ConversationInboxSkeleton />
        }>
            <ConversationDetailsContent />
        </Suspense>
    )
}
