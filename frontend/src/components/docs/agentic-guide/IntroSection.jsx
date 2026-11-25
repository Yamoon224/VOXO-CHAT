import { DocCallout } from '@/components/docs/DocCallout'
import { DocSection } from '@/components/docs/DocSection'

export function IntroSection() {
  return (
    <DocSection id="introduction" title="Introduction">
      <DocCallout variant="nutshell">
        Les actions agentiques permettent à votre chatbot d&apos;appeler <strong>votre propre API</strong> en
        cours de conversation pour répondre avec une donnée réelle et à jour — le statut d&apos;une
        commande, le solde d&apos;un compte client, la disponibilité d&apos;un créneau.
      </DocCallout>

      <p>
        Par défaut, votre chatbot répond uniquement à partir de votre base de connaissances (documents,
        FAQ, catalogue). Les actions agentiques lui donnent une capacité supplémentaire.
      </p>
      <p>
        Ce n&apos;est pas un accès à des données internes de VOXO : chaque action que vous créez appelle un
        endpoint que <strong>vous</strong> configurez, sur <strong>votre</strong> système. VOXO ne fait que
        relayer l&apos;appel et la réponse.
      </p>
      <p>
        Tant que le mode n&apos;est pas activé, ou qu&apos;aucune action active n&apos;est configurée, le chatbot se
        comporte exactement comme avant — aucun changement de comportement.
      </p>
    </DocSection>
  )
}
