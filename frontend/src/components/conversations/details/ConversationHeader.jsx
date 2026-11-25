'use client'

import { Download, Pencil, Check, X, UserRoundCheck, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

function getInitial(str) { return str ? str.charAt(0).toUpperCase() : '?' }

function HandoffStatus({ conversation, onTakeConversation }) {
  const t = useTranslations('Conversations')
  if (conversation.status === 'ended') return <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{t('statusEnded')}</span>
  if (conversation.handoffStatus === 'waiting') return <div className="mt-1 flex items-center gap-2"><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">{t('headerWaitingAgent')}</span><Button size="sm" onClick={() => onTakeConversation(conversation.sessionId)}><UserRoundCheck className="mr-1 h-3 w-3" />{t('headerTakeOver')}</Button></div>
  if (conversation.handoffStatus === 'human') return <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">{t('headerTakenBy', { name: conversation.assignedAgent?.name || t('headerAnAgent') })}</span>
  return <div className="mt-1 flex items-center gap-2"><span className="text-xs text-emerald-700">{t('headerAiActive')}</span><Button size="sm" variant="outline" onClick={() => onTakeConversation(conversation.sessionId)}>{t('headerResume')}</Button></div>
}

export function ConversationHeader({ conversation, onExportPDF, onEmailExport, onUpdateTitle, onTakeConversation }) {
  const t = useTranslations('Conversations')
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(conversation.title || '')
  useEffect(() => { setTitle(conversation.title || ''); setEditing(false) }, [conversation.sessionId, conversation.title])
  const saveTitle = async () => { if (title.trim()) { await onUpdateTitle(conversation.sessionId, title.trim()); setEditing(false) } }
  return <div className="p-4 border-b flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10"><div className="flex items-center gap-3"><Avatar className="h-10 w-10"><AvatarFallback className="bg-blue-600 text-white">{getInitial(conversation.userName)}</AvatarFallback></Avatar><div><div className="flex items-center gap-1">{editing ? <Input autoFocus value={title} onChange={event => setTitle(event.target.value)} className="h-8 max-w-xs" /> : <h3 className="font-bold text-gray-900">{conversation.title || conversation.userName || t('headerUntitled')}</h3>}{editing ? <><Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveTitle}><Check className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setTitle(conversation.title || ''); setEditing(false) }}><X className="h-4 w-4" /></Button></> : <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="h-3 w-3" /></Button>}</div><p className="text-xs text-gray-500">{conversation.userEmail || t('headerNoEmail')}</p><HandoffStatus conversation={conversation} onTakeConversation={onTakeConversation} /></div></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => onExportPDF(conversation)}><Download className="h-4 w-4 mr-2" />PDF</Button><Button variant="outline" size="sm" onClick={() => onEmailExport(conversation)}><Mail className="h-4 w-4 mr-2" />Email</Button></div></div>
}
