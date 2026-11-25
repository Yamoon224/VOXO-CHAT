'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { RouteGuard } from '@/components/common/RouteGuard'
import { PageHeader } from '@/components/shared/PageHeader'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'

import { AccessSection } from '@/components/docs/agentic-guide/AccessSection'
import { EnableSection } from '@/components/docs/agentic-guide/EnableSection'
import { ExampleSection } from '@/components/docs/agentic-guide/ExampleSection'
import { FieldsSection } from '@/components/docs/agentic-guide/FieldsSection'
import { IntroSection } from '@/components/docs/agentic-guide/IntroSection'
import { LimitsSection } from '@/components/docs/agentic-guide/LimitsSection'
import { TestSection } from '@/components/docs/agentic-guide/TestSection'
import { TroubleshootingSection } from '@/components/docs/agentic-guide/TroubleshootingSection'
import { UsageSection } from '@/components/docs/agentic-guide/UsageSection'
import { useLocale } from 'next-intl'
import { EnglishIntegrationGuide } from '@/components/docs/EnglishIntegrationGuide'

/**
 * Guide de configuration des actions agentiques, accessible depuis l'onglet
 * Agentic du dashboard. Contenu repris de `docs/agent-actions.md` (source
 * de référence), mis en forme avec le gabarit de documentation VOXO
 * (`components/docs/*`).
 */
export default function AgenticGuidePage() {
  const locale = useLocale()
  if (locale === 'en') return <RouteGuard resource="agentic"><EnglishIntegrationGuide kind="agentic" /></RouteGuard>
  return (
    <RouteGuard resource="agentic">
      <div className="space-y-6">
        <PageHeader
          title="Actions agentiques — guide de configuration"
          description="Comment permettre à votre chatbot d'appeler votre propre API pendant une conversation."
        />

        <Button asChild variant="outline" size="sm">
          <Link href={`/${locale}/dashboard/agentic`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à Agentic
          </Link>
        </Button>

        <SurfaceCard>
          <CardContent className="space-y-8 pt-6">
            <IntroSection />
            <AccessSection />
            <EnableSection />
            <FieldsSection />
            <TestSection />
            <LimitsSection />
            <UsageSection />
            <TroubleshootingSection />
            <ExampleSection />
          </CardContent>
        </SurfaceCard>
      </div>
    </RouteGuard>
  )
}
