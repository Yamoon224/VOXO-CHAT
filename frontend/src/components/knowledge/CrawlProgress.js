'use client'

import { Loader2, CheckCircle2, ShieldAlert, AlertTriangle, XCircle } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { formatNumber } from '@/lib/format.mjs'

// Causes d'échec renvoyées par le backend, résolues contre `Knowledge`.
const REASON_KEYS = {
  BLOCKED: 'crawlReasonBlocked',
  JS_ONLY: 'crawlReasonJsOnly',
  NOT_FOUND: 'crawlReasonNotFound',
  TIMEOUT: 'crawlReasonTimeout',
  SERVER_ERROR: 'crawlReasonServerError',
  UNSAFE_URL: 'crawlReasonUnsafeUrl',
  NETWORK: 'crawlReasonNetwork'
}

const STATUS_STYLES = {
  completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', labelKey: 'crawlStatusCompleted' },
  partial: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', labelKey: 'crawlStatusPartial' },
  blocked: { icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50', labelKey: 'crawlStatusBlocked' },
  failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', labelKey: 'crawlStatusFailed' }
}

export function CrawlProgress({ job }) {
  const t = useTranslations('Knowledge')
  const locale = useLocale()
  if (!job) return null

  const running = !job.isFinished
  const style = STATUS_STYLES[job.status] || STATUS_STYLES.failed
  const Icon = running ? Loader2 : style.icon

  const total = job.pagesDiscovered || 0
  const done = (job.pagesIndexed || 0) + (job.pagesFailed || 0)
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0

  return (
    <div className={`rounded-md border p-3 space-y-3 ${running ? 'bg-blue-50' : style.bg}`}>
      <div className="flex items-start gap-2">
        <Icon
          className={`h-4 w-4 mt-0.5 shrink-0 ${running ? 'animate-spin text-blue-600' : style.color}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {running ? t('crawlRunning') : t(style.labelKey)}
          </p>
          <p className="text-xs text-gray-600 truncate">{job.rootUrl}</p>
        </div>
      </div>

      {/* Barre de progression : n'a de sens qu'une fois les pages découvertes */}
      {total > 0 && (
        <div>
          <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${running ? 'bg-blue-600' : 'bg-gray-400'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {t('crawlIndexed', { indexed: formatNumber(job.pagesIndexed || 0, locale) })}
            {total > 0 && t('crawlDiscovered', { total: formatNumber(total, locale) })}
            {job.pagesFailed > 0 && t('crawlFailedCount', { failed: formatNumber(job.pagesFailed, locale) })}
          </p>
        </div>
      )}

      {running && total === 0 && (
        <p className="text-xs text-gray-600">{t('crawlSearching')}</p>
      )}

      {job.discoveredVia && (
        <p className="text-xs text-gray-500">
          {t('crawlDiscoveredVia', { source: job.discoveredVia })}
        </p>
      )}

      {/* Message explicite : anti-bot, quota, contenu JavaScript... */}
      {job.failureMessage && (
        <p className={`text-xs ${style.color}`}>{job.failureMessage}</p>
      )}

      {/* Détail des URLs en échec */}
      {job.errors?.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
            {t('crawlSeeFailures', { count: job.errors.length })}
          </summary>
          <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {job.errors.map((failure, index) => (
              <li key={`${failure.url}-${index}`} className="text-gray-600">
                <span className="font-medium">
                  {REASON_KEYS[failure.reason] ? t(REASON_KEYS[failure.reason]) : failure.reason}
                </span>
                {' — '}
                <span className="break-all">{failure.url}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
