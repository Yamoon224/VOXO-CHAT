import { DocCallout } from '@/components/docs/DocCallout'
import { DocCodeBlock } from '@/components/docs/DocCodeBlock'
import { DocSection } from '@/components/docs/DocSection'

const PARAMETERS_SCHEMA_EXAMPLE = `{
  "type": "object",
  "properties": {
    "order_id": {
      "type": "string",
      "description": "Numéro de commande communiqué par le client"
    }
  },
  "required": ["order_id"]
}`

const HEADERS_EXAMPLE = `{
  "Authorization": "Bearer {{secret}}"
}`

export function FieldsSection() {
  return (
    <DocSection id="creer-une-action" title="Créer une action, champ par champ">
      <div>
        <h3 className="font-semibold text-gray-900">Nom</h3>
        <p>
          Identifiant technique de l&apos;action (ex. <code>check_order_status</code>). Il doit être unique
          dans votre compte et stable dans le temps : c&apos;est ce nom que le modèle utilise en interne pour
          désigner l&apos;action — le changer revient à en créer une nouvelle à ses yeux.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">Description — le champ le plus important</h3>
        <p>
          C&apos;est le <strong>seul texte qui indique au chatbot quand utiliser cette action</strong>. Une
          description vague donnera un chatbot qui ne l&apos;utilise jamais, ou qui l&apos;utilise à tort.
        </p>
        <DocCallout variant="nutshell" title="Bonnes pratiques">
          Commencez par un verbe d&apos;action et dites précisément ce que l&apos;action retourne. Si vous avez
          plusieurs actions proches, rendez leurs descriptions clairement distinctes — le modèle choisit
          l&apos;action à partir du texte seul, jamais de ce que fait vraiment votre code.
        </DocCallout>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">Méthode et URL</h3>
        <p>
          Choisissez la méthode HTTP et l&apos;URL de votre endpoint. Vous pouvez insérer un paramètre
          directement dans le chemin avec des accolades :
        </p>
        <DocCodeBlock
          code="https://api.votre-entreprise.com/orders/{order_id}"
          label="Exemple d'URL avec paramètre de chemin"
          language="text"
        />
        <DocCallout variant="warning" title="URL publique uniquement">
          L&apos;URL doit être joignable publiquement sur internet. Toute adresse interne ou privée
          (<code>localhost</code>, un réseau local, une adresse de métadonnées cloud) est automatiquement
          refusée, y compris derrière un nom de domaine — c&apos;est une protection de sécurité.
        </DocCallout>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">Schéma des paramètres</h3>
        <p>
          Décrit, au format JSON, les informations que le chatbot doit extraire de la conversation avant
          d&apos;appeler votre API :
        </p>
        <DocCodeBlock code={PARAMETERS_SCHEMA_EXAMPLE} label="Schéma des paramètres" language="json" />
        <p>
          Chaque paramètre accepte un type parmi <code>string</code>, <code>number</code>,{' '}
          <code>integer</code>, <code>boolean</code>. Un paramètre listé dans <code>required</code> sera
          systématiquement demandé par le chatbot au visiteur s&apos;il manque à la conversation.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">En-têtes et secret</h3>
        <p>
          Utilisez le marqueur <code>{'{{secret}}'}</code> dans le champ en-têtes à l&apos;endroit voulu :
        </p>
        <DocCodeBlock code={HEADERS_EXAMPLE} label="En-têtes" language="json" />
        <p>
          Renseignez ensuite la valeur réelle dans le champ secret. Une fois enregistré, il n&apos;est{' '}
          <strong>jamais réaffiché</strong> — le laisser vide en modifiant l&apos;action conserve le secret déjà
          enregistré, y saisir une nouvelle valeur le remplace.
        </p>
        <DocCallout variant="nutshell" title="Recommandation">
          Créez pour cette intégration une clé API dédiée, avec le minimum de droits nécessaires côté de
          votre système (lecture seule si l&apos;action ne fait que consulter une information).
        </DocCallout>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">Délai et statut</h3>
        <p>
          Le délai (par défaut 5000 ms, réglable entre 500 et 30 000 ms) est le temps maximum laissé à
          votre API pour répondre. La case &laquo; Action active &raquo; permet de désactiver temporairement
          une action sans la supprimer. Vous pouvez configurer jusqu&apos;à 50 actions par compte.
        </p>
      </div>
    </DocSection>
  )
}
