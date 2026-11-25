'use client'

import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/use-format'
import { StarRating } from './StarRating'
import { ConversationOrganizationPanel } from './ConversationOrganizationPanel'
import { ClientMetadataList } from './ClientMetadataList'

export function UserDetailsSidebar({ conversation, organization }) {
    const t = useTranslations('Conversations')
    const { dateTime } = useFormatters()
    const { sessionId, satisfactionRating } = conversation

    return (
        <div className="w-64 shrink-0 overflow-y-auto border-l bg-gray-50 p-4 hidden lg:block">
            <h4 className="font-semibold text-sm mb-4">{t('detailsTitle')}</h4>
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('detailsSessionId')}</label>
                    <p className="text-xs font-mono break-all">{sessionId}</p>
                </div>
                <div className="border-t border-gray-200 my-4" />
                <ConversationOrganizationPanel conversation={conversation} organization={organization} />
                <div className="border-t border-gray-200 my-4" />
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('detailsPages')}</label>
                    {!conversation.pageHistory?.length ? <p className="mt-1 text-xs text-gray-500">{t('detailsNoPages')}</p> : <ul className="mt-2 space-y-2">{conversation.pageHistory.map((page, index) => <li key={`${page.messageId || page.url}-${index}`} className="text-xs"><a href={page.url} target="_blank" rel="noreferrer" className="block truncate text-blue-600" title={page.url}>{page.url}</a><span className="text-[10px] text-gray-400">{dateTime(page.visitedAt)}</span></li>)}</ul>}
                </div>
                <div className="border-t border-gray-200 my-4" />
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('detailsSatisfaction')}</label>
                    <StarRating value={satisfactionRating} />
                </div>
                <div className="border-t border-gray-200 my-4" />
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('detailsMetadata')}</label>
                    <ClientMetadataList conversation={conversation} />
                </div>
            </div>
        </div>
    )
}
