'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Lock } from 'lucide-react'
import { formatMessageDate } from '@/lib/support.mjs'

/**
 * Fil d'une demande de support, partagé par les deux interfaces.
 *
 * L'affichage d'une note interne n'est PAS ce qui la protège : le serveur ne
 * l'envoie tout simplement pas au client. Le style distinct ci-dessous sert à
 * l'administrateur, pour qu'il voie d'un coup d'œil ce que le client ne lit pas.
 */
function MessageRow({ message, viewerType, locale, internalNoteLabel }) {
  const isInternal = message.role === 'internal_note'
  const isMine = message.authorType === viewerType

  if (isInternal) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-amber-800">
          <Lock className="h-3 w-3" />
          {internalNoteLabel}
        </div>
        <p className="whitespace-pre-wrap text-sm text-amber-900">{message.content}</p>
        <p className="mt-1 text-xs text-amber-700">
          {message.authorName} · {formatMessageDate(message.createdAt, locale)}
        </p>
      </div>
    )
  }

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg p-3 ${
        isMine ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'
      }`}>
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        <p className={`mt-1 text-xs ${isMine ? 'text-blue-100' : 'text-slate-500'}`}>
          {message.authorName} · {formatMessageDate(message.createdAt, locale)}
        </p>
      </div>
    </div>
  )
}

export function SupportThread({ messages = [], viewerType }) {
  const t = useTranslations('Support')
  const tAdmin = useTranslations('AdminSupport')
  const locale = useLocale()

  if (messages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t('emptyThread')}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} viewerType={viewerType} locale={locale} internalNoteLabel={tAdmin('internalNote')} />
      ))}
    </div>
  )
}
