import { DocCodeBlock } from '@/components/docs/DocCodeBlock'
import { DocSection } from '@/components/docs/DocSection'
import { DocTable } from '@/components/docs/DocTable'

const CONFIG_ROWS = [
  ['Nom', 'check_order_status'],
  ['Description', "Consulte le statut d'expédition d'une commande à partir de son numéro et renvoie l'étape actuelle (préparation, expédiée, livrée) et la date estimée."],
  ['Méthode', 'GET'],
  ['URL', 'https://api.ma-boutique.com/v1/orders/{order_id}/status'],
  ['En-têtes', '{ "Authorization": "Bearer {{secret}}" }'],
  ['Secret', 'la clé API en lecture seule dédiée à cette intégration'],
  ['Délai / Statut', '5000 ms — active'],
]

const PARAMETERS_SCHEMA_EXAMPLE = `{
  "type": "object",
  "properties": {
    "order_id": {
      "type": "string",
      "description": "Numéro de commande communiqué par le client, ex. CMD-48213"
    }
  },
  "required": ["order_id"]
}`

export function ExampleSection() {
  return (
    <DocSection
      id="exemple"
      title="Exemple complet"
      description="Une entreprise de vente en ligne veut permettre à ses visiteurs de connaître le statut de leur commande directement dans le chat."
    >
      <DocTable columns={['Champ', 'Valeur']} rows={CONFIG_ROWS} />
      <DocCodeBlock code={PARAMETERS_SCHEMA_EXAMPLE} label="Schéma des paramètres" language="json" />

      <div>
        <h3 className="font-semibold text-gray-900">Échange type avec un visiteur</h3>
        <div className="space-y-2 rounded-lg border bg-gray-50 p-4 text-sm">
          <p><strong>Visiteur :</strong> Bonjour, où en est ma commande CMD-48213 ?</p>
          <p className="text-muted-foreground">
            (le chatbot appelle <code>check_order_status</code> avec <code>order_id: &quot;CMD-48213&quot;</code>)
          </p>
          <p>
            <strong>Chatbot :</strong> Votre commande CMD-48213 a été expédiée et devrait arriver le
            28 août.
          </p>
        </div>
        <p className="mt-2">
          Si le visiteur n&apos;a pas encore donné son numéro de commande, le chatbot le lui demande d&apos;abord,
          puisque <code>order_id</code> est marqué comme requis dans le schéma.
        </p>
      </div>
    </DocSection>
  )
}
