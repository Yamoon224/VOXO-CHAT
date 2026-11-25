'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { IntegrationDocLayout } from '@/components/docs/IntegrationDocLayout'
import { DocSection } from '@/components/docs/DocSection'
import { DocCallout } from '@/components/docs/DocCallout'
import { DocChecklist } from '@/components/docs/DocChecklist'

const COPY = {
  fr: {
    sections: ['Aperçu', 'Installation', 'WooCommerce', 'Vérification', 'Dépannage'],
    overview: 'WordPress et WooCommerce', overviewDescription: 'Le même snippet VOXO fonctionne pour votre site, boutique et paiement.', guideBefore: 'Commencez par récupérer le snippet personnalisé depuis le guide',
    installationDescription: 'Insérez le code une seule fois, juste avant la fermeture de body.', installation: ['Ajoutez le snippet avec un thème enfant ou un plugin d’insertion de code fiable.', 'Publiez les changements.', 'Videz le cache du site, du plugin et du CDN.'],
    wooTitle: 'Contrôles WooCommerce', woo1: 'Testez le catalogue, le panier et la page de paiement : cette dernière applique souvent une politique CSP plus stricte.', woo2: 'Autorisez votre backend dans script-src et connect-src si le widget disparaît au paiement.',
    verifyTitle: 'Vérifier l’installation', verify: ['Ouvrez une page publique dans une fenêtre privée.', 'Ouvrez le widget et envoyez un message.', 'Confirmez que la conversation apparaît dans VOXO.'],
    troubleshootTitle: 'Le widget n’apparaît pas', troubleshoot: 'Désactivez temporairement la minification, la concaténation et le chargement différé JavaScript. Vérifiez ensuite les domaines autorisés et l’onglet Réseau pour widget.js.'
  },
  en: {
    sections: ['Overview', 'Installation', 'WooCommerce', 'Verification', 'Troubleshooting'],
    overview: 'WordPress and WooCommerce', overviewDescription: 'The same VOXO snippet works across your site, store and checkout.', guideBefore: 'Start by getting your personalized snippet from the',
    installationDescription: 'Insert the code once, just before the closing body tag.', installation: ['Add the snippet with a child theme or a reliable code-insertion plugin.', 'Publish the changes.', 'Clear the site, plugin and CDN caches.'],
    wooTitle: 'WooCommerce checks', woo1: 'Test the catalog, cart and checkout page: checkout often applies a stricter CSP.', woo2: 'Allow your backend in script-src and connect-src if the widget disappears at checkout.',
    verifyTitle: 'Verify the installation', verify: ['Open a public page in a private window.', 'Open the widget and send a message.', 'Confirm that the conversation appears in VOXO.'],
    troubleshootTitle: 'The widget does not appear', troubleshoot: 'Temporarily disable JavaScript minification, concatenation and deferred loading. Then check allowed domains and the Network tab for widget.js.'
  }
}

export default function WordPressIntegrationPage() {
  const locale = useLocale()
  const copy = COPY[locale] || COPY.fr
  const ids = ['overview', 'installation', 'woocommerce', 'verification', 'troubleshooting']
  const sections = ids.map((id, index) => ({ id, title: copy.sections[index] }))
  return <IntegrationDocLayout sections={sections}>
    <DocSection id="overview" title={copy.overview} description={copy.overviewDescription}><DocCallout>{copy.guideBefore} <Link className="underline" href={`/${locale}/dashboard/integration`}>Website</Link>.</DocCallout></DocSection>
    <DocSection id="installation" title={copy.sections[1]} description={copy.installationDescription}><DocChecklist items={copy.installation} /></DocSection>
    <DocSection id="woocommerce" title={copy.wooTitle}><p>{copy.woo1}</p><p>{copy.woo2}</p></DocSection>
    <DocSection id="verification" title={copy.verifyTitle}><DocChecklist items={copy.verify} /></DocSection>
    <DocSection id="troubleshooting" title={copy.troubleshootTitle}><DocCallout variant="warning">{copy.troubleshoot}</DocCallout></DocSection>
  </IntegrationDocLayout>
}
