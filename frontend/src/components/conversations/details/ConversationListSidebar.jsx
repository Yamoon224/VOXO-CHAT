'use client'

import { Search, MessageSquare, PanelLeftClose, BellRing } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'
import { useTimeAgo } from '@/hooks/use-format'
import { groupConversations } from '@/lib/conversation-organization.mjs'
import { LabelBadges, PriorityBadge } from '../ConversationOrganizationBadges'

function useName() {
  const t = useTranslations('Conversations')
  return conversation => conversation.title || conversation.userName || conversation.userEmail || t('headerUntitled')
}
function Status({ conversation }) {
  const t = useTranslations('Conversations')
  if (conversation.status === 'ended') return t('statusEnded')
  if (conversation.handoffStatus === 'waiting') return <span className="flex items-center text-amber-700"><BellRing className="mr-1 h-3 w-3" />{t('sidebarToTakeOver')}</span>
  if (conversation.handoffStatus === 'human') return <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">{t('statusActive')}</span>
  return conversation.status === 'active' ? t('sidebarAi') : t('statusEnded')
}

function ConversationItem({ conversation, selected, onSelect }) {
  const t = useTranslations('Conversations')
  const getName = useName()
  const timeAgo = useTimeAgo()
  return <button type="button" onClick={() => onSelect(conversation)} className={`w-full border-b p-4 text-left hover:bg-blue-50 ${selected ? 'border-l-4 border-l-blue-600 bg-blue-50' : ''} ${conversation.isUnread ? 'bg-blue-50/60' : ''}`}>
    <div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarFallback className="bg-blue-100 text-xs text-blue-700">{getName(conversation).charAt(0).toUpperCase()}</AvatarFallback></Avatar><p className={`flex-1 truncate text-sm ${conversation.isUnread ? 'font-bold' : 'font-medium'}`}>{getName(conversation)}</p>{conversation.isUnread && <span className="h-2 w-2 rounded-full bg-blue-600" aria-label={t('sidebarUnread')} />}<span className="text-[10px] text-gray-400">{timeAgo(conversation.updatedAt)}</span></div>
    <p className="mt-2 line-clamp-2 text-xs text-gray-500">{conversation.summary || t('sidebarNoMessage')}</p>
    <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500"><MessageSquare className="h-3 w-3" />{conversation.messageCount || 0} · <Status conversation={conversation} /></div>
    <div className="mt-2 flex flex-wrap items-center gap-1"><PriorityBadge priority={conversation.priority} compact /><LabelBadges labels={conversation.labels} limit={2} /></div>
  </button>
}

export function ConversationListSidebar({ conversations, selectedId, onSelect, query, onQueryChange, onClose }) {
  const t = useTranslations('Conversations')
  const groups = groupConversations(conversations)
  return <aside className="flex min-h-0 w-80 shrink-0 flex-col border-r bg-gray-50">
    <div className="space-y-3 border-b bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">{t('sidebarTitle')}</h2>{onClose && <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}><PanelLeftClose className="h-4 w-4" /></Button>}</div><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><Input value={query} onChange={event => onQueryChange(event.target.value)} placeholder={t('sidebarSearch')} className="pl-9" /></div></div>
    <div className="flex-1 overflow-y-auto">{!groups.length ? <p className="p-6 text-sm text-gray-500">{t('sidebarEmpty')}</p> : groups.map(group => <section key={group.labelKey}><h3 className="sticky top-0 z-10 border-b bg-gray-100/95 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">{t(group.labelKey)}</h3>{group.items.map(conversation => <ConversationItem key={conversation.id} conversation={conversation} selected={conversation.sessionId === selectedId} onSelect={onSelect} />)}</section>)}</div>
  </aside>
}
