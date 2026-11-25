import { DocChecklist } from '@/components/docs/DocChecklist'
import { DocSection } from '@/components/docs/DocSection'

export function AccessSection() {
  return (
    <DocSection id="acces" title="Où et qui peut configurer">
      <p>
        Dans la barre latérale du dashboard : <strong>Agentic</strong>. La page contient trois blocs,
        dans cet ordre : Mode agentic (activation), Actions API (création et gestion), et
        Consommation agentique (suivi d&apos;usage).
      </p>
      <DocChecklist
        items={[
          'Le propriétaire du compte (owner) y a accès en écriture par défaut.',
          "Un administrateur ou un membre standard n'y a accès que si le propriétaire le lui accorde explicitement dans la gestion des permissions de l'équipe.",
          "Ce n'est pas le cas par défaut, contrairement à d'autres réglages du chatbot.",
        ]}
      />
    </DocSection>
  )
}
