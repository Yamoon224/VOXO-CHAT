# Actions agentiques — guide de configuration

## 1. Ce que fait la fonctionnalité

Par défaut, votre chatbot répond uniquement à partir de votre base de connaissances (documents, FAQ, catalogue). Les **actions agentiques** lui donnent une capacité supplémentaire : appeler **votre propre API métier** en cours de conversation pour répondre avec une donnée réelle et à jour — par exemple le statut d'une commande, le solde d'un compte client, la disponibilité d'un créneau.

Ce n'est pas un accès à des données internes de VOXO : chaque action que vous créez appelle un endpoint que **vous** configurez, sur **votre** système. VOXO ne fait que relayer l'appel et la réponse.

Tant que le mode n'est pas activé, ou qu'aucune action active n'est configurée, le chatbot se comporte exactement comme avant — aucun changement de comportement.

## 2. Où et qui peut configurer

Dans la barre latérale du dashboard : **Agentic**.

Cet onglet est réservé au **propriétaire du compte (owner)** par défaut. Un administrateur ou un membre standard n'y a accès que si le propriétaire lui accorde explicitement ce droit dans la gestion des permissions de l'équipe — ce n'est pas le cas par défaut, contrairement à d'autres réglages du chatbot.

La page contient trois blocs, dans cet ordre : **Mode agentic** (activation), **Actions API** (création et gestion des actions), **Consommation agentique** (suivi d'usage).

## 3. Activer le mode

Cochez **"Activer les actions agentiques"** puis cliquez sur **"Sauvegarder l'activation"**.

Si vous activez le mode sans avoir encore configuré d'action active, un avertissement s'affiche : c'est normal, le chatbot n'a simplement rien à appeler pour l'instant et continue de répondre uniquement via la base de connaissances.

## 4. Créer une action, champ par champ

### Nom
Identifiant technique de l'action (ex. `check_order_status`). Il doit être unique dans votre compte et stable dans le temps : c'est ce nom que le modèle utilise en interne pour désigner l'action, le changer revient à en créer une nouvelle à ses yeux.

### Description — le champ le plus important
C'est le **seul texte qui indique au chatbot quand utiliser cette action**. Une description vague ou trop générale donnera un chatbot qui n'utilise jamais l'action, ou qui l'utilise à tort.

Bonnes pratiques :
- Commencez par un verbe d'action et dites précisément ce que l'action retourne : *"Consulte le statut d'expédition d'une commande à partir de son numéro."* plutôt que *"Commandes"*.
- Si vous avez plusieurs actions proches (ex. statut de commande vs historique de commandes), rendez leurs descriptions clairement distinctes — le modèle choisit l'action à partir du texte seul.
- Ne décrivez que ce que fait l'action, pas des instructions de conversation ("réponds poliment...") : cela relève du ton général du chatbot, réglé ailleurs.

### Méthode et URL
Choisissez la méthode HTTP (GET, POST, PUT, PATCH, DELETE) et l'URL de votre endpoint. Vous pouvez insérer un paramètre directement dans le chemin avec des accolades, par exemple :

```
https://api.votre-entreprise.com/orders/{order_id}
```

`order_id` sera alors remplacé par la valeur que le chatbot extrait de la conversation, à condition qu'il figure aussi dans le schéma des paramètres (voir ci-dessous).

**Important** : l'URL doit être publiquement joignable sur internet. Toute adresse interne ou privée (`localhost`, un réseau local, une adresse de métadonnées cloud) est automatiquement refusée, y compris si elle se cache derrière un nom de domaine — c'est une protection de sécurité, pas une limitation à contourner.

### Schéma des paramètres
Décrit, au format JSON, les informations que le chatbot doit extraire de la conversation avant d'appeler votre API. Exemple pour l'action de statut de commande :

```json
{
  "type": "object",
  "properties": {
    "order_id": {
      "type": "string",
      "description": "Numéro de commande communiqué par le client"
    }
  },
  "required": ["order_id"]
}
```

Chaque paramètre accepte un type parmi `string`, `number`, `integer`, `boolean`, et doit avoir sa propre description — elle aussi lue par le modèle pour savoir quoi extraire. Un paramètre listé dans `required` sera systématiquement demandé par le chatbot au visiteur s'il manque à la conversation.

Pour une requête GET, les paramètres qui ne sont pas déjà utilisés dans l'URL sont envoyés en paramètres de requête ; pour POST/PUT/PATCH, ils sont envoyés dans le corps de la requête en JSON.

### En-têtes et secret
Le champ **en-têtes** définit les en-têtes HTTP envoyés à votre API (format JSON). Si votre API nécessite une authentification, utilisez le marqueur `{{secret}}` à l'endroit voulu, par exemple :

```json
{
  "Authorization": "Bearer {{secret}}"
}
```

Renseignez ensuite la valeur réelle dans le champ **secret**. Ce champ est à saisie unique : une fois enregistré, il n'est **jamais réaffiché**, même en modification (le champ reste vide — le laisser vide en modifiant l'action conserve le secret déjà enregistré, y saisir une nouvelle valeur le remplace). Il est stocké chiffré, jamais en clair.

Recommandation : créez pour cette intégration une clé API dédiée, avec le minimum de droits nécessaires côté de votre système (lecture seule si votre action ne fait que consulter une information). Évitez de réutiliser une clé d'administration à portée large.

### Délai et statut
Le délai (par défaut 5000 ms, réglable entre 500 et 30 000 ms) est le temps maximum laissé à votre API pour répondre avant que l'appel soit considéré en échec. La case "Action active" permet de désactiver temporairement une action sans la supprimer — une action inactive n'est jamais proposée au chatbot.

Vous pouvez configurer jusqu'à 50 actions par compte.

## 5. Tester avant d'activer

Le bouton **"Tester"** déclenche un appel réel vers votre endpoint (ce n'est pas une simulation) et affiche la réponse brute. C'est le meilleur moyen de vérifier que l'URL, l'authentification et le format de réponse sont corrects avant d'exposer l'action aux visiteurs de votre site.

À noter : ce bouton appelle votre action sans paramètre. Si l'action a des paramètres obligatoires, le test peut donc renvoyer une erreur côté de votre API — cela ne veut pas forcément dire que la configuration est fausse, mais que votre endpoint attend ces paramètres. Dans ce cas, vérifiez surtout que l'appel atteint bien votre serveur (pas d'erreur réseau/délai/URL) et que l'authentification passe.

Un résultat `success: false` peut indiquer :
- `timeout` : votre API n'a pas répondu dans le délai configuré,
- `network_error` : l'adresse est injoignable,
- si le test est déclenché autrement et signale `unknown_tool` ou `tool_call_limit_reached` : ce sont des messages internes vus par le chatbot pendant une vraie conversation (voir section suivante), pas des erreurs de configuration à corriger dans le formulaire.

## 6. Comprendre les limites

Pour garder des réponses rapides et un coût maîtrisé, chaque échange où le chatbot utilise une action est plafonné :

- au maximum **2 allers-retours** avec le modèle par réponse,
- au maximum **4 appels d'actions** par réponse,
- un **budget global** par réponse qui protège contre l'emballement de coût si une action renvoie une réponse très volumineuse,
- la réponse d'une action est **tronquée à 4096 caractères** avant d'être transmise au chatbot.

Ces plafonds sont volontairement prudents. Concrètement, cela veut dire :
- Concevez vos endpoints pour renvoyer une réponse **concise et ciblée** (le statut d'une commande, pas l'historique complet du compte) plutôt qu'un gros export JSON.
- Une description d'action claire (section 4) évite que le chatbot ait besoin de plusieurs tentatives pour comprendre quoi appeler.

Si ces plafonds sont atteints en cours de réponse, le chatbot est simplement forcé de conclure par une réponse texte sans nouvel appel — le visiteur reçoit toujours une réponse, potentiellement moins précise que si l'action avait pu aller au bout. Voir la section suivante pour repérer ces cas dans votre historique.

## 7. Lire la consommation agentique

Le bloc **"Consommation agentique"** résume, sur une fenêtre de 7, 30 ou 90 jours :

- **tokens** : volume total consommé par le modèle sur les réponses ayant utilisé une action,
- **appels LLM** : nombre total d'allers-retours avec le modèle,
- **outils** : nombre total d'appels d'actions exécutés,
- **tours limités** : nombre de réponses où l'un des plafonds de la section 6 a été atteint.

L'historique en dessous détaille chaque réponse individuelle avec son statut de fin :
- `answered` : le chatbot a répondu normalement, sans atteindre de plafond,
- `max_iterations` ou `max_tool_calls` : un plafond d'allers-retours ou d'appels a été atteint,
- `token_budget` : le budget de tokens de la réponse a été atteint,
- `fallback_no_budget` : cas extrême où même une réponse de repli n'a pas pu être formulée dans le budget restant ; le visiteur a reçu un message générique d'indisponibilité temporaire.

Un nombre élevé de "tours limités" est le signal à surveiller : c'est l'indication qu'il faut simplifier vos actions (réponses plus courtes côté API, descriptions plus précises) plutôt qu'un dysfonctionnement.

## 8. Dépannage

| Symptôme | Cause probable | À faire |
|---|---|---|
| "Cette URL pointe vers une ressource interne" à l'enregistrement | L'URL cible une adresse locale/privée | Utilisez l'URL publique de votre API (pas `localhost` ni une IP interne) |
| "Une action portant ce nom existe déjà" | Le nom choisi est déjà utilisé dans votre compte | Choisissez un nom différent |
| Le test renvoie `network_error` ou `timeout` | Votre API est injoignable ou trop lente | Vérifiez que l'URL est correcte et accessible depuis internet ; augmentez le délai si votre API est simplement lente |
| L'authentification semble échouer côté de votre API | Le secret n'a pas été (re)saisi, ou le marqueur `{{secret}}` est absent des en-têtes | Vérifiez la présence de `{{secret}}` dans le champ en-têtes et resaisissez le secret si nécessaire |
| Le chatbot n'utilise jamais l'action alors qu'elle est active | Description trop vague, ou question du visiteur trop éloignée du cas décrit | Reformulez la description en étant plus explicite sur le cas d'usage couvert |
| Beaucoup de "tours limités" dans la consommation | Réponses d'API trop volumineuses ou descriptions ambiguës qui poussent le modèle à essayer plusieurs actions | Simplifiez la réponse renvoyée par votre endpoint, clarifiez les descriptions |

## 9. Exemple complet

Une entreprise de vente en ligne veut permettre à ses visiteurs de connaître le statut de leur commande directement dans le chat.

**Configuration de l'action :**
- Nom : `check_order_status`
- Description : `Consulte le statut d'expédition d'une commande à partir de son numéro et renvoie l'étape actuelle (préparation, expédiée, livrée) et la date estimée.`
- Méthode : `GET`
- URL : `https://api.ma-boutique.com/v1/orders/{order_id}/status`
- Schéma des paramètres :
  ```json
  {
    "type": "object",
    "properties": {
      "order_id": { "type": "string", "description": "Numéro de commande communiqué par le client, ex. CMD-48213" }
    },
    "required": ["order_id"]
  }
  ```
- En-têtes : `{ "Authorization": "Bearer {{secret}}" }`
- Secret : la clé API en lecture seule dédiée à cette intégration
- Délai : 5000 ms — Statut : active

**Échange type avec un visiteur :**

> Visiteur : *Bonjour, où en est ma commande CMD-48213 ?*
> Chatbot : *(appelle `check_order_status` avec `order_id: "CMD-48213"`)* *Votre commande CMD-48213 a été expédiée et devrait arriver le 28 août.*

Si le visiteur n'a pas encore donné son numéro de commande, le chatbot le lui demande d'abord, puisque `order_id` est marqué comme requis dans le schéma.
