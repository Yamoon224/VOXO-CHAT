import { Fragment, useLayoutEffect, useMemo, useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MessageBubble } from './MessageBubble'
import { TypingPreviewBubble } from './TypingPreviewBubble'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/use-format'
import { dayLabel, stableSortMessages } from '@/lib/conversation-organization.mjs'
import { MessageListSkeleton } from '@/components/conversations/ConversationSkeletons'

function EmptyMessages() {
    const t = useTranslations('Conversations')
    return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm italic">{t('messagesEmpty')}</p>
        </div>
    )
}

export function MessageList({ conversation, typingPreview, historyLoading = false }) {
    const t = useTranslations('Conversations')
    const { date, dateTime } = useFormatters()
    // Le séparateur de jour arrive sous forme de clé : `dayDate` porte l'instant
    // à formater, les autres se résolvent directement dans le catalogue.
    const resolveDay = part => (part.key === 'dayDate' ? date(part.date) : t(part.key))
    const { messages, createdAt, status } = conversation
    const containerRef = useRef(null)
    const previousSessionRef = useRef(null)
    const nearBottomRef = useRef(true)
    const orderedMessages = useMemo(() => stableSortMessages((messages || []).filter(msg => msg.role !== 'internal_note')), [messages])

    useLayoutEffect(() => {
        const container = containerRef.current
        if (!container) return
        const changedConversation = previousSessionRef.current !== conversation.sessionId
        if (changedConversation || nearBottomRef.current) container.scrollTop = container.scrollHeight
        previousSessionRef.current = conversation.sessionId
    }, [conversation.sessionId, orderedMessages.length, typingPreview])

    const hasMessages = orderedMessages.length > 0
    const hasHistory = Array.isArray(messages)

    if (historyLoading && !hasHistory) return <MessageListSkeleton />

    return (
        <div ref={containerRef} onScroll={event => { const node = event.currentTarget; nearBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80 }} className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
            <div className="space-y-6 max-w-3xl mx-auto">
                <div className="flex justify-center mb-8">
                    <Badge variant="outline" className="bg-gray-100 text-gray-500 font-normal border-none px-4 py-1">
                        {t('messagesStart', { date: dateTime(createdAt) })}
                    </Badge>
                </div>

                {hasMessages
                    ? orderedMessages.map((msg, idx) => {
                        const currentDay = resolveDay(dayLabel(msg.timestamp))
                        const previousDay = idx ? resolveDay(dayLabel(orderedMessages[idx - 1].timestamp)) : null
                        return <Fragment key={msg.id || idx}>
                            {currentDay !== previousDay && <div className="flex items-center gap-3 py-2" role="separator" aria-label={currentDay}><span className="h-px flex-1 bg-gray-200" /><span className="rounded-full bg-white px-3 py-1 text-[10px] font-medium text-gray-500 shadow-sm">{currentDay}</span><span className="h-px flex-1 bg-gray-200" /></div>}
                            <MessageBubble message={msg} />
                        </Fragment>
                    })
                    : <EmptyMessages />
                }

                <TypingPreviewBubble text={typingPreview} />

                {status === 'ended' && (
                    <div className="flex flex-col items-center gap-2 mt-8 opacity-60 pb-4">
                        <div className="w-1/2 border-t border-gray-200" />
                        <p className="text-xs text-gray-400 font-medium italic">{t('messagesEnded')}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
