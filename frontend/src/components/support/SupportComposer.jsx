'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Lock, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const MAX_LENGTH = 5000

/**
 * Zone de réponse d'un fil de support.
 *
 * Forkée plutôt que dérivée de `HandoffComposer` : celui-ci s'auto-annule hors
 * d'une conversation reprise par un humain et affiche un bouton « rendre à
 * l'IA » sans objet ici.
 *
 * `allowInternal` n'est vrai que côté administration — aucune route tenant
 * n'accepte le drapeau, et le serveur le refuserait de toute façon.
 */
export function SupportComposer({ onSend, loading, allowInternal = false, disabled = false }) {
  const t = useTranslations('Support')
  const [content, setContent] = useState('')
  const [internal, setInternal] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    // Clé d'idempotence : un renvoi après échec réseau ne duplique pas.
    const succeeded = await onSend(trimmed, internal, crypto.randomUUID())
    // Le brouillon survit à l'échec, pour ne pas perdre ce qui a été écrit.
    if (succeeded) {
      setContent('')
      setInternal(false)
    }
  }

  if (disabled) {
    return (
      <p className="rounded-md border bg-slate-50 p-3 text-center text-sm text-muted-foreground">
        {t('closedTicket')}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={internal ? t('internalNotePlaceholder') : t('messagePlaceholderShort')}
        maxLength={MAX_LENGTH}
        rows={4}
        className={internal ? 'border-amber-300 bg-amber-50' : undefined}
      />

      <div className="flex items-center justify-between gap-4">
        {allowInternal ? (
          <div className="flex items-center gap-2">
            <Switch
              id="support-internal"
              checked={internal}
              onCheckedChange={setInternal}
              disabled={loading}
            />
            <Label htmlFor="support-internal" className="flex items-center gap-1.5 text-sm">
              <Lock className="h-3 w-3" />
              {t('internalNoteToggle')}
            </Label>
          </div>
        ) : <span />}

        <Button type="submit" disabled={loading || !content.trim()}>
          {loading
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Send className="mr-2 h-4 w-4" />}
          {internal ? t('saveNote') : t('sendShort')}
        </Button>
      </div>
    </form>
  )
}
