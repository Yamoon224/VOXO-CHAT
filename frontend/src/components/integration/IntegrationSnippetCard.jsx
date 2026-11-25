'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Code, Copy, ExternalLink } from 'lucide-react'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { DocCodeBlock } from '@/components/docs/DocCodeBlock'
import { IntegrationMethodPicker, methodTitle } from '@/components/integration/IntegrationMethodPicker'
import { useIntegration } from '@/hooks/use-integration'
import { useWidgetTest } from '@/hooks/use-widget-test'

/**
 * Le snippet à copier, dans ses trois variantes web.
 *
 * Le code est généré avec les VRAIS `tenantId`, URL d'API et réglages du
 * chatbot : ce n'est pas un exemple à adapter, c'est le code à coller tel quel.
 *
 * `useIntegration` fournit la génération et l'état de copie du gros bouton ;
 * `DocCodeBlock` gère sa propre copie pour la petite icône. Les deux coexistaient
 * déjà ainsi dans l'ancien onglet.
 */
export function IntegrationSnippetCard({ tenant, chatbotSettings }) {
  const t = useTranslations('Integration')
  const [method, setMethod] = useState('script')
  const { generateIntegrationCode, copyToClipboard } = useIntegration(tenant, chatbotSettings)
  const { openWidgetTest } = useWidgetTest(tenant)

  const code = generateIntegrationCode(method)

  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle className="flex items-center text-base">
          <Code className="mr-2 h-5 w-5" />
          {t('integrationCode')}
        </CardTitle>
        <CardDescription>
          {t('integrationCodeDescription')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <IntegrationMethodPicker integrationMethod={method} setIntegrationMethod={setMethod} />

        <DocCodeBlock code={code} label={methodTitle(method, t)} language="html" />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            disabled={!code}
            onClick={() => copyToClipboard(code, 'main')}
            className="flex-1"
          >
            <Copy className="mr-2 h-4 w-4" />
            {t('copyCode')}
          </Button>
          <Button variant="outline" onClick={openWidgetTest}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {t('openDemo')}
          </Button>
        </div>
      </CardContent>
    </SurfaceCard>
  )
}
