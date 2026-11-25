'use client'

import { Brain, Globe, RefreshCw, FileText } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { formatNumber, formatPercent } from '@/lib/format.mjs'
import { Card, CardContent } from '@/components/ui/card'

export function StatsCards({ stats, onRegenerateEmbeddings, regenerating = false }) {
  const t = useTranslations('Knowledge')
  const locale = useLocale()
  const rag = stats.rag || {}
  const chunks = rag.chunks || {}
  const providerReady = rag.embeddingProviderAvailable === true

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Carte Total */}
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="bg-blue-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">{t('statsTotal')}</p>
                <p className="text-2xl font-bold">{formatNumber(stats.total, locale)}</p>
              </div>
              <Brain className="h-8 w-8 text-white/80" />
            </div>
          </div>
          <div className="p-3 bg-white">
            <p className="text-xs text-green-600">{t('statsActive', { count: formatNumber(stats.active, locale) })}</p>
          </div>
        </CardContent>
      </Card>

      {/* Carte Sources */}
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="bg-green-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">{t('statsSources')}</p>
                <p className="text-2xl font-bold">{formatNumber(stats.bySourceType.length, locale)}</p>
              </div>
              <Globe className="h-8 w-8 text-white/80" />
            </div>
          </div>
          <div className="p-3 bg-white">
            <p className="text-xs text-gray-500">{t('statsSourceTypes')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Carte IA Ready - Cliquable pour régénérer */}
      <Card 
        className={`overflow-hidden transition-all ${regenerating ? 'cursor-wait opacity-75' : 'hover:shadow-md cursor-pointer hover:bg-gray-50'}`}
        onClick={regenerating ? undefined : onRegenerateEmbeddings}
      >
        <CardContent className="p-0">
          <div className="bg-purple-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">{t('statsAiReady')}</p>
                <p className="text-2xl font-bold">{formatPercent(stats.embeddingCoverage, locale, { maximumFractionDigits: 0 })}</p>
              </div>
              <RefreshCw className={`h-8 w-8 text-white/80 ${regenerating ? 'animate-spin' : ''}`} />
            </div>
          </div>
          <div className="p-3 bg-white">
            <p className={`text-xs ${providerReady ? 'text-gray-500' : 'text-red-600'}`}>
              {regenerating
                ? t('statsIndexing')
                : providerReady
                  ? t(chunks.error ? 'statsChunksErrors' : 'statsChunks', {
                    documents: formatNumber(stats.withEmbedding, locale),
                    chunks: formatNumber(chunks.done || 0, locale),
                    errors: formatNumber(chunks.error || 0, locale),
                  })
                  : t('statsNoProvider')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Carte Mots moyens */}
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="bg-orange-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">{t('statsWords')}</p>
                <p className="text-2xl font-bold">
                  {formatNumber(Math.round(stats.avgContentLength / 5) || 0, locale)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-white/80" />
            </div>
          </div>
          <div className="p-3 bg-white">
            <p className="text-xs text-gray-500">{t('statsWordsAverage')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
