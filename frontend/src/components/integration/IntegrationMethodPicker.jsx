'use client'

import { useTranslations } from 'next-intl'
import { Code, Globe, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

/**
 * Variantes du snippet WEB uniquement.
 *
 * `flutter` a quitté cette liste : chaque plateforme a désormais sa propre page
 * dans la documentation, et un sélecteur mêlant web et mobile n'avait plus de
 * sens. La page Flutter appelle directement `buildIntegrationSnippet` avec son
 * variant.
 *
 * Les `id` doivent correspondre à ce que `buildIntegrationSnippet` sait
 * produire — voir `shared/integration-snippet.mjs`. Libellés résolus via
 * `labelKey`/`hintKey`/`titleKey` contre le namespace `Integration`, comme
 * `navigation.mjs`.
 */
export const WEB_METHODS = [
  { id: 'script', icon: Code, labelKey: 'methodScriptLabel', hintKey: 'methodRecommended', titleKey: 'methodScriptTitle' },
  { id: 'html', icon: Globe, labelKey: 'methodHtmlLabel', hintKey: 'methodFullPage', titleKey: 'methodHtmlTitle' },
  { id: 'config', icon: Settings, labelKey: 'methodConfigLabel', hintKey: 'methodAdvancedOptions', titleKey: 'methodConfigTitle' },
]

export function methodTitle(id, t) {
  const method = WEB_METHODS.find(method => method.id === id)
  return t(method?.titleKey || 'methodScriptTitle')
}

export function IntegrationMethodPicker({ integrationMethod, setIntegrationMethod }) {
  const t = useTranslations('Integration')
  return (
    <div>
      <Label className="font-medium">{t('integrationType')}</Label>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {WEB_METHODS.map(({ id, icon: Icon, labelKey, hintKey }) => (
          <Button
            key={id}
            variant={integrationMethod === id ? 'default' : 'outline'}
            onClick={() => setIntegrationMethod(id)}
            className="h-auto w-full flex-col py-3"
          >
            <Icon className="mb-1 h-5 w-5" />
            {t(labelKey)}
            <span className="text-xs opacity-75">{t(hintKey)}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
