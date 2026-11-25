'use client'

import { Eye, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

const STATUS_KEYS = {
  analyzing: 'sourceStatusAnalyzing',
  complete: 'sourceStatusComplete',
  failed: 'sourceStatusFailed',
}

export function CatalogSources({ sources = [], disabled, onReanalyze, onPreview }) {
  const t = useTranslations('Knowledge')
  if (!sources.length) return null
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">{t('sourcesTitle')}</p>
      {sources.map(source => (
        <div key={source.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="min-w-0 flex-1 truncate">{source.originalName || source.name}</span>
          <span className="text-xs text-muted-foreground">
            {t(STATUS_KEYS[source.metadata?.importStatus] || 'sourceStatusPending')}
            {source.metadata?.pageCount ? t('sourcePageCount', { count: source.metadata.pageCount }) : ''}
          </span>
          <Button type="button" size="sm" variant="ghost" onClick={() => onPreview(source.id)}>
            <Eye className="mr-1 h-4 w-4" />{t('sourcePreview')}
          </Button>
          <Button disabled={disabled} type="button" size="sm" variant="outline" onClick={() => onReanalyze(source.id)}>
            <RefreshCw className="mr-1 h-4 w-4" />{t('sourceReanalyze')}
          </Button>
        </div>
      ))}
    </div>
  )
}
