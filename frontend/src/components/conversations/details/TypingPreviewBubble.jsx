'use client'

import { useTranslations } from 'next-intl'

// Aperçu de la saisie en cours du visiteur. Contenu volatil et non validé :
// rendu en texte brut, jamais via SafeMarkdown, et jamais persisté.
export function TypingPreviewBubble({ text }) {
    const t = useTranslations('Conversations')
    if (!text) return null
    return (
        <div className="flex justify-start" aria-live="polite">
            <div className="flex flex-col max-w-[80%] items-start">
                <span className="text-[10px] font-medium text-gray-500 mb-1 px-1">{t('typingUser')}</span>
                <div className="px-4 py-3 rounded-2xl rounded-tl-none border border-dashed border-slate-300 bg-slate-50 text-sm italic leading-relaxed text-slate-500 whitespace-pre-wrap break-words">
                    {text}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">{t('typingNotSent')}</span>
            </div>
        </div>
    )
}
