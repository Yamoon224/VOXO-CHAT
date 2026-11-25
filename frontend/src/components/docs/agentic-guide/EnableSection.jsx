import { DocCallout } from '@/components/docs/DocCallout'
import { DocSection } from '@/components/docs/DocSection'

export function EnableSection() {
  return (
    <DocSection id="activer" title="Activer le mode">
      <p>
        Cochez <strong>&laquo; Activer les actions agentiques &raquo;</strong> puis cliquez sur{' '}
        <strong>&laquo; Sauvegarder l&apos;activation &raquo;</strong>.
      </p>
      <DocCallout variant="nutshell" title="Sans action configurée">
        Si vous activez le mode sans avoir encore configuré d&apos;action active, un avertissement s&apos;affiche :
        c&apos;est normal, le chatbot n&apos;a simplement rien à appeler pour l&apos;instant et continue de répondre
        uniquement via la base de connaissances.
      </DocCallout>
    </DocSection>
  )
}
