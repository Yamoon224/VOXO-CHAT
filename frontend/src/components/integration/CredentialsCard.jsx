'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'

// Les deux valeurs que le tenant transmet à son équipe de développement. Ni
// l'une ni l'autre n'est un secret : le tenantId figure déjà dans le <script>
// public du widget web.
function CopyableValue({ label, value, hint, unavailableLabel }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <code className="block truncate text-xs text-muted-foreground">
            {value || unavailableLabel}
          </code>
        </div>
        <Button size="sm" variant="ghost" disabled={!value} onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function CredentialsCard({ apiUrl, tenantId }) {
  const t = useTranslations('Integration')
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CopyableValue
        label="apiUrl"
        value={apiUrl}
        hint={t('apiUrlHint')}
        unavailableLabel={t('unavailable')}
      />
      <CopyableValue
        label="tenantId"
        value={tenantId}
        hint={t('tenantIdHint')}
        unavailableLabel={t('unavailable')}
      />
    </div>
  )
}
