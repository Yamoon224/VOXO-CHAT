import { DocChecklist } from '@/components/docs/DocChecklist'
import { DocSection } from '@/components/docs/DocSection'
import { DocTable } from '@/components/docs/DocTable'

const LIMIT_ROWS = [
  ['Allers-retours LLM', '2 par réponse'],
  ['Appels d\'actions', '4 par réponse'],
  ['Résultat d\'une action', 'tronqué à 4096 caractères'],
  ['Actions par compte', '50 maximum'],
]

export function LimitsSection() {
  return (
    <DocSection id="limites" title="Comprendre les limites">
      <p>
        Pour garder des réponses rapides et un coût maîtrisé, chaque échange où le chatbot utilise une
        action est plafonné. Un budget global de tokens par réponse protège en plus contre l&apos;emballement
        de coût si une action renvoie une réponse très volumineuse.
      </p>

      <DocTable columns={['Plafond', 'Valeur par défaut']} rows={LIMIT_ROWS} />

      <div>
        <h3 className="font-semibold text-gray-900">Ce que ça change concrètement</h3>
        <DocChecklist
          items={[
            'Concevez vos endpoints pour renvoyer une réponse concise et ciblée (le statut d\'une commande, pas l\'historique complet du compte).',
            'Une description d\'action claire évite que le chatbot ait besoin de plusieurs tentatives pour comprendre quoi appeler.',
          ]}
        />
      </div>

      <p>
        Si un plafond est atteint en cours de réponse, le chatbot est simplement forcé de conclure par une
        réponse texte sans nouvel appel — le visiteur reçoit toujours une réponse, potentiellement moins
        précise que si l&apos;action avait pu aller au bout.
      </p>
    </DocSection>
  )
}
