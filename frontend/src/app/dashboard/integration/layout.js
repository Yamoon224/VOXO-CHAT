'use client'

import { RouteGuard } from '@/components/common/RouteGuard'
import { PageHeader } from '@/components/shared/PageHeader'
import { IntegrationNav } from '@/components/integration/IntegrationNav'

/**
 * Coquille de la documentation d'intégration.
 *
 * `RouteGuard` est monté ICI, une seule fois : les trois pages partagent la
 * même condition d'accès, la répéter dans chacune la ferait diverger au premier
 * ajout de plateforme.
 *
 * `resource="company"` en LECTURE : c'est de la documentation, aucune écriture.
 * Les domaines autorisés, seul réglage modifiable de l'ancien onglet, sont
 * restés dans Paramètres → Chatbot.
 */
export default function IntegrationLayout({ children }) {
  return (
    <RouteGuard resource="company">
      <div className="space-y-6">
        <PageHeader
          title="Documentation et intégration"
          description="Installez VOXO sur votre site ou dans votre application."
        />

        {/* Menu à gauche sur grand écran, empilé au-dessus du contenu sinon. */}
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <aside className="lg:sticky lg:top-24">
            <IntegrationNav />
          </aside>
          <div className="min-w-0 space-y-6">{children}</div>
        </div>
      </div>
    </RouteGuard>
  )
}
