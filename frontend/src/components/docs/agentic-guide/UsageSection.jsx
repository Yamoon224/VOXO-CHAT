import { DocCallout } from '@/components/docs/DocCallout'
import { DocSection } from '@/components/docs/DocSection'
import { DocTable } from '@/components/docs/DocTable'

const STOP_REASON_ROWS = [
  ['answered', 'Le chatbot a répondu normalement, sans atteindre de plafond.'],
  ['max_iterations / max_tool_calls', 'Un plafond d\'allers-retours ou d\'appels a été atteint.'],
  ['token_budget', 'Le budget de tokens de la réponse a été atteint.'],
  ['fallback_no_budget', 'Cas extrême : le visiteur a reçu un message générique d\'indisponibilité temporaire.'],
]

export function UsageSection() {
  return (
    <DocSection id="consommation" title="Lire la consommation agentique">
      <p>
        Le bloc &laquo; Consommation agentique &raquo; résume, sur une fenêtre de 7, 30 ou 90 jours, le volume
        de tokens consommé, le nombre d&apos;allers-retours LLM, le nombre d&apos;appels d&apos;actions et le nombre
        de &laquo; tours limités &raquo; (réponses où un plafond a été atteint).
      </p>

      <div>
        <h3 className="font-semibold text-gray-900">Statuts de fin visibles dans l&apos;historique</h3>
        <DocTable columns={['Statut', 'Signification']} rows={STOP_REASON_ROWS} />
      </div>

      <DocCallout variant="nutshell" title="Signal à surveiller">
        Un nombre élevé de &laquo; tours limités &raquo; indique qu&apos;il faut simplifier vos actions (réponses
        plus courtes côté API, descriptions plus précises) — ce n&apos;est pas un dysfonctionnement.
      </DocCallout>
    </DocSection>
  )
}
