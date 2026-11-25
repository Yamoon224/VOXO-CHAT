'use client'

import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/use-format'
import { SafeMarkdown } from './SafeMarkdown'
import { MessageAttachments } from './MessageAttachments'

export function MessageBubble({ message }) {
    const t = useTranslations('Conversations')
    const { dateTime } = useFormatters()
    const isUser = message.role === 'user'
    const isAgent = message.role === 'agent'
    const sender = isUser ? t('senderUser') : isAgent ? (message.metadata?.agentName || t('senderAgent')) : t('senderAi')
    return (
        <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
            <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-start' : 'items-end'}`}>
                <span className="text-[10px] font-medium text-gray-500 mb-1 px-1">{sender}</span>
                <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${isUser
                        ? 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tl-none'
                        : isAgent ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-blue-600 text-white rounded-tr-none'
                    }`}>
                    <MessageAttachments attachments={message.attachments} isUser={isUser} />
                    {message.content && <SafeMarkdown enabled={!isUser}>{message.content}</SafeMarkdown>}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                    {dateTime(message.timestamp)}
                    {isAgent && message.metadata?.deliveryStatus === 'failed' && (
                        <span className="ml-2 font-medium text-red-600">{t('deliveryFailed')}</span>
                    )}
                    {isAgent && message.metadata?.deliveryStatus === 'sent' && (
                        <span className="ml-2">{t('deliverySent')}</span>
                    )}
                </span>
            </div>
        </div>
    )
}
