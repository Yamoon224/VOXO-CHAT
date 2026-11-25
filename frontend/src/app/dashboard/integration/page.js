'use client'

import { useAuth } from '@/hooks/use-auth'
import { useChatbotSettings } from '@/hooks/use-chatbot-settings'
import { IntegrationSnippetCard } from '@/components/integration/IntegrationSnippetCard'
import { WebsiteQuickStart } from '@/components/integration/WebsiteQuickStart'
import { WebsitePlatforms } from '@/components/integration/WebsitePlatforms'
import { WebsiteConfigReference } from '@/components/integration/WebsiteConfigReference'
import { WebsiteJsApi } from '@/components/integration/WebsiteJsApi'
import { IntegrationsPanel } from '@/components/integrations/IntegrationsPanel'
import { IntegrationDocLayout } from '@/components/docs/IntegrationDocLayout'
import { DocSection } from '@/components/docs/DocSection'
import { DocCallout } from '@/components/docs/DocCallout'
import { useLocale } from 'next-intl'
import { EnglishIntegrationGuide } from '@/components/docs/EnglishIntegrationGuide'

const SECTIONS = [{ id: 'overview', title: 'Aperçu' }, { id: 'installation', title: 'Installation' }, { id: 'configuration', title: 'Configuration' }, { id: 'api', title: 'API JavaScript' }, { id: 'verification', title: 'Vérification' }]

export default function WebsiteIntegrationPage() {
  const { tenant } = useAuth()
  const { settings } = useChatbotSettings()
  const locale = useLocale()
  if (locale === 'en') return <EnglishIntegrationGuide kind="website" />
  return <IntegrationDocLayout sections={SECTIONS}>
    <DocSection id="overview" title="Intégrer VOXO à votre site" description="Installez le widget sur tout site web avec un snippet déjà configuré."><DocCallout>Vos identifiants sont insérés automatiquement. Copiez le code tel quel, sans y placer de secret.</DocCallout><IntegrationsPanel /></DocSection>
    <DocSection id="installation" title="Installation" description="Ajoutez le snippet avant la fermeture de la balise body."><IntegrationSnippetCard tenant={tenant} chatbotSettings={settings} /><WebsiteQuickStart /><WebsitePlatforms /></DocSection>
    <DocSection id="configuration" title="Configuration" description="Ajustez le comportement du widget depuis VOXO ou dans votre code."><WebsiteConfigReference /></DocSection>
    <DocSection id="api" title="API JavaScript" description="Pilotez le widget une fois chargé."><WebsiteJsApi /></DocSection>
    <DocSection id="verification" title="Vérifier l’installation" description="Publiez le site, ouvrez une page publique et envoyez un message de test."><DocCallout variant="warning" title="Si le widget n’apparaît pas">Vérifiez les domaines autorisés, la politique CSP et que votre page est servie en HTTP(S), jamais avec file://.</DocCallout><p>Une fois le message envoyé, confirmez sa réception dans <strong>Conversations</strong> puis testez la reprise par un conseiller.</p></DocSection>
  </IntegrationDocLayout>
}
