'use client'

import { useTranslations } from 'next-intl'
import { Code, ShieldCheck } from 'lucide-react'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'

/**
 * API publique `window.ChatBotWidget`, d'après `widget/README.md`.
 *
 * WIDGET.md pose que ce contrat « ne doit jamais être cassé par une évolution
 * interne » : ce qui est listé ici est donc stable. Notes résolues via
 * `noteKey` contre le namespace `Integration`.
 */
const METHODS = [
  { call: 'ChatBotWidget.open()', noteKey: 'apiOpen' },
  { call: 'ChatBotWidget.close()', noteKey: 'apiClose' },
  { call: 'ChatBotWidget.toggle()', noteKey: 'apiToggle' },
  { call: 'await ChatBotWidget.sendMessage(text)', noteKey: 'apiSendMessage' },
  { call: 'await ChatBotWidget.clearMessages()', noteKey: 'apiClearMessages' },
  { call: 'ChatBotWidget.updateConfig({ … })', noteKey: 'apiUpdateConfig' },
  { call: 'await ChatBotWidget.endConversation({ rating, feedback })', noteKey: 'apiEndConversation' },
  { call: 'ChatBotWidget.getStats()', noteKey: 'apiGetStats' },
  { call: 'ChatBotWidget.destroy()', noteKey: 'apiDestroy' },
]

export function WebsiteJsApi() {
  const t = useTranslations('Integration')
  return (
    <>
      <SurfaceCard>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Code className="mr-2 h-4 w-4" />
            {t('jsApiTitle')}
          </CardTitle>
          <CardDescription>
            {t('jsApiDescription')} <code>widget.js</code>{' '}
            {t('jsApiLoaded')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {METHODS.map(({ call, noteKey }) => (
              <li key={call} className="flex flex-col gap-1 border-b pb-2 last:border-0 last:pb-0">
                <code className="break-all text-xs">window.{call}</code>
                <span className="text-sm text-muted-foreground">{t(noteKey)}</span>
              </li>
            ))}
          </ul>

          {/* Distinction que les intégrateurs manquent régulièrement. */}
          <p className="rounded-lg bg-gray-50 p-4 text-sm text-muted-foreground">
            {t('closingNeverEndsConversation')}
            <code className="mx-1">endConversation()</code> {t('closingNeverEndsConversationTail')}
          </p>
        </CardContent>
      </SurfaceCard>

      <SurfaceCard>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <ShieldCheck className="mr-2 h-4 w-4" />
            {t('cspBrowsersA11yTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              {t('cspAllowBackend')} <code>script-src</code> {t('and')} <code>connect-src</code>.
            </li>
            <li>
              {t('cspAdoptedStyleSheets')} <code>adoptedStyleSheets</code>{t('cspAdoptedStyleSheetsFallback')} <code>&lt;style&gt;</code> {t('cspAdoptedStyleSheetsTail')}
            </li>
            <li>
              {t('cspShadowDomRequirements')} <code>fetch</code>, <code>Promise</code> {t('cspShadowDomRequirementsTail')}
            </li>
            <li>
              {t('cspDialogA11y')} <code>Escape</code>{t('cspDialogA11yFocus')} <code>prefers-reduced-motion</code> {t('and')}{' '}
              <code>forced-colors</code> {t('cspDialogA11ySupported')}
            </li>
            <li>
              {t('cspShadowDomIsolation')} <code>!important</code> {t('cspShadowDomIsolationTail')}
            </li>
          </ul>
        </CardContent>
      </SurfaceCard>
    </>
  )
}
