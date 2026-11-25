import { DocCallout } from '@/components/docs/DocCallout'
import { DocSection } from '@/components/docs/DocSection'
import { DocTable } from '@/components/docs/DocTable'

const ERROR_ROWS = [
  ['timeout', "Votre API n'a pas répondu dans le délai configuré."],
  ['network_error', 'L\'adresse est injoignable.'],
  ['unknown_tool', 'Message interne vu par le chatbot en conversation réelle, pas une erreur de configuration.'],
  ['tool_call_limit_reached', 'Le plafond d\'appels du tour a été atteint (voir « Comprendre les limites »).'],
]

export function TestSection() {
  return (
    <DocSection id="tester" title="Tester avant d'activer">
      <p>
        Le bouton <strong>&laquo; Tester &raquo;</strong> déclenche un appel réel vers votre endpoint — ce n&apos;est
        pas une simulation — et affiche la réponse brute. C&apos;est le meilleur moyen de vérifier que
        l&apos;URL, l&apos;authentification et le format de réponse sont corrects avant d&apos;exposer l&apos;action aux
        visiteurs de votre site.
      </p>

      <DocCallout variant="warning" title="Le test n'envoie aucun paramètre">
        Ce bouton appelle votre action sans argument. Si l&apos;action a des paramètres obligatoires, le test
        peut renvoyer une erreur côté de votre API — cela ne veut pas forcément dire que la configuration
        est fausse. Vérifiez surtout que l&apos;appel atteint bien votre serveur et que l&apos;authentification
        passe.
      </DocCallout>

      <div>
        <h3 className="font-semibold text-gray-900">Lire un résultat en échec</h3>
        <DocTable columns={['Code', 'Signification']} rows={ERROR_ROWS} />
      </div>
    </DocSection>
  )
}
