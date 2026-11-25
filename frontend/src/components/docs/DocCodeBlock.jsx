'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

/**
 * Bloc de code copiable, présentation « fenêtre de terminal ».
 *
 * Détient son propre état de copie plutôt que de le recevoir d'un hook
 * partagé : une page de documentation en affiche plusieurs, et un état
 * partagé ferait clignoter toutes les coches à la fois.
 *
 * Déplacé depuis `components/integration/CodeBlock.jsx` : ce n'est pas un
 * composant propre à l'intégration du widget, toute page de doc en a besoin.
 */
export function DocCodeBlock({ code, label, language }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-slate-900 px-4 py-2.5">
        <span className="truncate text-sm font-medium text-gray-300">{label}</span>
        <div className="flex flex-shrink-0 items-center gap-2">
          {language && (
            <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
              {language}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={!code}
            onClick={copy}
            aria-label="Copier le code"
            className="text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto p-4 sm:p-5">
        <pre className="min-w-max text-sm leading-relaxed text-emerald-300">
          <code>{code || 'Aucun exemple disponible.'}</code>
        </pre>
      </div>
    </div>
  )
}
