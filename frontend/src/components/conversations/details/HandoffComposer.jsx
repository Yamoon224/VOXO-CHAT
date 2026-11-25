'use client'

import { useRef, useState } from 'react'
import { Paperclip, Send, StickyNote, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function HandoffComposer({ conversation, onSend, onReturnToAi, canCompose = true }) {
  const t = useTranslations('Conversations')
  const [content, setContent] = useState('')
  const [internal, setInternal] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const [sending, setSending] = useState(false)
  const pendingMessageId = useRef(null)
  const submit = async event => {
    event.preventDefault()
    if (sending || (!content.trim() && !attachment)) return
    setSending(true)
    const clientMessageId = pendingMessageId.current || (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)
    pendingMessageId.current = clientMessageId
    try {
      // Livraison refusée : on garde le texte et l'identifiant pour que le renvoi relance
      // ce même message au lieu d'en créer un doublon.
      if (await onSend(conversation.sessionId, content.trim(), internal, attachment, clientMessageId) === false) return
      setContent('')
      setAttachment(null)
      pendingMessageId.current = null
    } finally { setSending(false) }
  }
  if (conversation.status === 'ended' || conversation.handoffStatus !== 'human') return null
  if (!canCompose) return <div className="border-t bg-gray-50 p-3 text-sm text-gray-500">{t('composerTakenByOther', { name: conversation.assignedAgent?.name || t('composerAnotherAgent') })}</div>
  return <form onSubmit={submit} className="border-t bg-white p-3 space-y-2">
    <div className="flex items-center gap-2 text-xs">
      <Button disabled={sending} type="button" size="sm" variant={internal ? 'secondary' : 'outline'} onClick={() => setInternal(false)}>{t('composerReply')}</Button>
      <Button disabled={sending} type="button" size="sm" variant={internal ? 'outline' : 'secondary'} onClick={() => { setInternal(true); setAttachment(null) }}><StickyNote className="mr-1 h-3 w-3" />{t('composerInternalNote')}</Button>
      <Button disabled={sending} type="button" size="sm" variant="ghost" className="ml-auto" onClick={() => onReturnToAi(conversation.sessionId)}>{t('composerReturnToAi')}</Button>
    </div>
    {attachment && <div className="flex items-center gap-2 text-xs text-gray-600"><span className="truncate">{t('composerAttachment', { name: attachment.name })}</span><Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachment(null)}><X className="h-3 w-3" /></Button></div>}
    <div className="flex gap-2"><Input disabled={sending} value={content} onChange={event => setContent(event.target.value)} placeholder={internal ? t('composerInternalPlaceholder') : t('composerReplyPlaceholder')} maxLength={2000} /><label className={`inline-flex ${internal || sending ? 'hidden' : ''}`}><input className="sr-only" type="file" accept="image/*,application/pdf,.pdf" onChange={event => setAttachment(event.target.files?.[0] || null)} /><Button type="button" variant="outline" size="icon" asChild><span title={t('composerAddFile')}><Paperclip className="h-4 w-4" /></span></Button></label><Button disabled={sending} type="submit"><Send className="h-4 w-4" /></Button></div>
  </form>
}
