'use client'

import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { DocCodeBlock } from '@/components/docs/DocCodeBlock'
import { CredentialsCard } from '@/components/integration/CredentialsCard'
import { buildIntegrationSnippet } from '@shared/integration-snippet.mjs'
import { useAuth } from '@/hooks/use-auth'
import { useLocale } from 'next-intl'
import { EnglishIntegrationGuide } from '@/components/docs/EnglishIntegrationGuide'

const REPO_README =
  'https://github.com/guijo225/voxo-chat/blob/main/mobile/android/voxo-chat-android/README.md'

/**
 * SDK Kotlin (Android, Jetpack Compose).
 *
 * Page destinée au propriétaire du chatbot, pas à son développeur : elle dit ce
 * qu'il doit décider et ce qu'il transmet. La référence technique complète reste
 * le README du SDK, pour que les deux ne divergent pas.
 */
export default function KotlinIntegrationPage() {
  const { tenant } = useAuth()
  const locale = useLocale()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const snippet = buildIntegrationSnippet({ apiUrl, tenantId: tenant?.id, variant: 'kotlin' })
  if (locale === 'en') return <EnglishIntegrationGuide kind="kotlin" />

  return (
    <>
      <SurfaceCard>
        <CardHeader>
          <CardTitle className="text-base">Ce que le mobile change</CardTitle>
          <CardDescription>
            Votre assistant embarqué nativement dans votre application Android — avec la reprise
            par un conseiller, les pièces jointes et la notation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Aucun code à héberger.</strong> Le SDK parle directement à votre backend :
              pas de <code>widget.js</code>, et l&apos;interface est dessinée nativement avec Jetpack
              Compose, pas par une page web.
            </li>
            <li>
              <strong>Vos réglages restent pilotés d&apos;ici.</strong> Nom, message d&apos;accueil,
              couleur et fonctionnalités définis dans Paramètres → Chatbot sont lus au démarrage de
              l&apos;application. Les modifier ne demande aucune nouvelle version sur le Play Store.
            </li>
            <li>
              <strong>La restriction de domaines ne s&apos;applique pas.</strong> Une application
              n&apos;a pas de domaine d&apos;origine : votre liste protège votre site web, pas votre
              application. C&apos;est le <code>tenantId</code> seul qui identifie votre chatbot.
            </li>
            <li>
              <strong>Les conversations arrivent au même endroit.</strong> Vos conseillers répondent
              depuis l&apos;onglet Conversations, comme pour le web.
            </li>
          </ul>
        </CardContent>
      </SurfaceCard>

      <SurfaceCard>
        <CardHeader>
          <CardTitle className="text-base">Ce que vous transmettez à votre équipe</CardTitle>
          <CardDescription>
            Deux valeurs suffisent. Aucune n&apos;est un secret : le <code>tenantId</code> figure
            déjà dans le code public de votre widget web.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CredentialsCard apiUrl={apiUrl} tenantId={tenant?.id} />
        </CardContent>
      </SurfaceCard>

      <SurfaceCard>
        <CardHeader>
          <CardTitle className="text-base">Mise en route</CardTitle>
          <CardDescription>
            Pour une application Android en Kotlin avec Jetpack Compose. Vos identifiants sont déjà
            renseignés.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocCodeBlock code={snippet} label="Kotlin — mise en route" language="kotlin" />

          <div className="space-y-1 text-sm">
            <h3 className="font-semibold">Autorisations à prévoir</h3>
            <p className="text-muted-foreground">
              Aucune. Le SDK déclare lui-même l&apos;accès à internet, et le sélecteur de documents
              Android ne demande pas de permission de stockage.
            </p>
          </div>

          <div className="space-y-1 text-sm">
            <h3 className="font-semibold">Pendant le développement</h3>
            <p className="text-muted-foreground">
              Sur un émulateur Android, votre machine se joint par <code>10.0.2.2</code> et non par{' '}
              <code>localhost</code>, et le HTTP en clair doit être autorisé dans le manifeste de
              debug uniquement.
            </p>
          </div>

          <p className="text-sm">
            <a className="underline" href={REPO_README} target="_blank" rel="noopener noreferrer">
              Référence complète du SDK Kotlin
            </a>{' '}
            — installation, API, thème, interface sur mesure, tests.
          </p>
        </CardContent>
      </SurfaceCard>

      <SurfaceCard>
        <CardHeader>
          <CardTitle className="text-base">Limites à connaître</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Les mêmes que sur le web : 2 000 caractères par message, 3 pièces jointes de 10 Mo
            maximum, 15 messages par minute. Le SDK les applique avant tout envoi et affiche un
            message clair.
          </p>
          <p>
            La limite de débit est comptée par adresse IP. Derrière le réseau d&apos;un opérateur
            mobile, plusieurs de vos utilisateurs peuvent la partager : c&apos;est temporaire, et le
            SDK ne réessaie jamais tout seul.
          </p>
        </CardContent>
      </SurfaceCard>
    </>
  )
}
