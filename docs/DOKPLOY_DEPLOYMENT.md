# Déployer VOXO Chat avec Dokploy

Ce dépôt se déploie comme une application **Docker Compose** composée de :

- `frontend` : dashboard Next.js, port interne `3000` ;
- `backend` : API Express et fichier `/widget.js`, port interne `3000` ;
- `redis` : cache privé persistant, non exposé publiquement.

PostgreSQL/Supabase reste externe. Aucun conteneur ne lance de migration automatiquement.

## 1. Préparer les secrets

Copiez les noms de variables de `.env.dokploy.example` dans l'onglet **Environment** de l'application Compose Dokploy, puis remplacez toutes les valeurs d'exemple.

Les variables minimales sont :

```dotenv
APP_BASE_PATH=
FRONTEND_URL=https://app.example.com
BACKEND_URL=https://api.example.com
NEXT_PUBLIC_FRONTEND_URL=https://app.example.com
NEXT_PUBLIC_API_URL=https://api.example.com/api
ALLOWED_ORIGINS=https://app.example.com
DATABASE_URL=postgresql://...
REDIS_PASSWORD=...
JWT_SECRET=...
SWAGGER_USERNAME=voxo-docs
SWAGGER_PASSWORD=...
```

Ajoutez ensuite les clés Anthropic/OpenAI, Supabase et les canaux réellement utilisés.

### Mot de passe Redis

Redis fait partie du stack Compose : il n'y a aucun service à créer dans Dokploy, seulement `REDIS_PASSWORD` à renseigner. Générez une valeur **hexadécimale ou alphanumérique** :

```sh
openssl rand -hex 32
```

Évitez `$`, `"`, `'` et `\` : la valeur transite par le shell du conteneur Redis et par le parseur d'environnement de Dokploy.

Le compose déclare `${REDIS_PASSWORD:?REDIS_PASSWORD is required}` : sans cette variable, le déploiement échoue au rendu plutôt que de démarrer un Redis sans authentification.

Le backend reçoit automatiquement `REDIS_URL=redis://redis:6379` depuis le compose. Ne surchargez cette variable que si vous déplacez Redis hors du stack ; une URL `rediss://` active le TLS automatiquement.

La recherche sémantique est **désactivée par défaut** : `OPENAI_DIRECT_KEY` doit rester vide ou absente. Le chatbot fonctionne alors en recherche lexicale, y compris pour la sélection de contexte des médias entrants.

```dotenv
OPENAI_DIRECT_KEY=
RAG_MIN_SIMILARITY=0.35
RAG_TOP_K=5
```

⚠️ Cette variable attend une clé **OpenAI directe** (`sk-proj-…`), envoyée à `api.openai.com/v1/embeddings`. OpenRouter n'expose pas d'endpoint embeddings : y placer la clé `sk-or-v1-…` provoque un 401 sur chaque requête. `OPENAI_API_KEY` (OpenRouter) sert au chat, à la vision et à la transcription — les deux ne sont pas interchangeables.

Pour réactiver la recherche sémantique, renseignez une vraie clé OpenAI directe et ajoutez `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`, puis relancez l'indexation décrite plus bas.

`APP_BASE_PATH` et les variables `NEXT_PUBLIC_*` sont injectés pendant la construction du frontend. Toute modification de ces variables nécessite donc un nouveau déploiement, pas seulement un redémarrage.

Ne commitez jamais le fichier `.env` généré par Dokploy. Le précédent `backend/.env` a été retiré du suivi Git, mais les secrets qui ont déjà été publiés dans l'historique doivent être révoqués et remplacés auprès de chaque fournisseur.

## 2. Créer l'application Compose

Dans Dokploy :

1. Créez un projet et un environnement.
2. Ajoutez une application **Docker Compose** depuis ce dépôt Git.
3. Sélectionnez la branche à déployer.
4. Configurez `./docker-compose.yml` comme chemin Compose.
5. Activez de préférence **Isolated Deployments**.
6. Ajoutez les variables préparées à l'étape précédente.
7. Utilisez **Preview Compose** pour vérifier les services et les variables avant le premier déploiement.

Dans l'aperçu, les `$${REDIS_PASSWORD}` de la commande et du healthcheck Redis doivent apparaître comme des `${REDIS_PASSWORD}` littéraux : le double `$` diffère volontairement l'expansion jusqu'au shell du conteneur. S'ils sont déjà résolus ou vidés, l'échappement a été consommé par Dokploy et le service Redis démarrera sans mot de passe.

Le contexte de construction est volontairement la racine du dépôt. L'image backend doit accéder à la fois à `backend/` et à `widget/` pour compiler le widget puis l'embarquer.

## 3. Associer les domaines

Dans l'onglet **Domains** de l'application Compose :

| Domaine | Service | Port interne | HTTPS |
| --- | --- | ---: | --- |
| `app.example.com` | `frontend` | `3000` | Activé |
| `api.example.com` | `backend` | `3000` | Activé |

N'ajoutez aucun domaine au service `redis`.

Les enregistrements DNS A/AAAA doivent pointer vers le serveur Dokploy. Remplacez également les domaines d'exemple dans les variables d'environnement avant de construire les images.

### Préproduction sous un chemin

Pour partager `app.voxo.chat` entre le frontend et le backend en préproduction, utilisez les arguments de build suivants :

```dotenv
APP_BASE_PATH=/console-front/pre-prod
NEXT_PUBLIC_FRONTEND_URL=https://app.voxo.chat/console-front/pre-prod
NEXT_PUBLIC_API_URL=https://app.voxo.chat/backserv-backend/pre-prod/api
```

Configurez le domaine frontend avec le chemin `/console-front/pre-prod`, le chemin interne `/`, le port `3000` et **Strip Path désactivé**. Next.js doit recevoir le préfixe puisqu'il est compilé avec ce `basePath`.

Le domaine backend peut utiliser `/backserv-backend/pre-prod`, le chemin interne `/`, le port `3000` et **Strip Path activé**.

Configurez également l'URL publique complète du backend et les identifiants de la documentation :

```dotenv
BACKEND_URL=https://app.voxo.chat/backserv-backend/pre-prod
SWAGGER_USERNAME=voxo-docs
SWAGGER_PASSWORD=<mot-de-passe-long-et-aléatoire>
```

Swagger est alors disponible sur `https://app.voxo.chat/backserv-backend/pre-prod/api-docs/`. Le slash final évite une redirection supplémentaire. Si Dokploy ne transmet pas `X-Forwarded-Prefix`, le backend reconstruit cette redirection avec le chemin de `BACKEND_URL`. Sans identifiants en production, seule la documentation répond `503` ; les routes de l'API restent disponibles.

### Production sans préfixe frontend

Construisez une nouvelle image avec :

```dotenv
APP_BASE_PATH=
NEXT_PUBLIC_FRONTEND_URL=https://app.voxo.chat
NEXT_PUBLIC_API_URL=https://app.voxo.chat/backserv-backend/prod/api
```

Configurez alors le chemin frontend sur `/`, avec **Strip Path désactivé**. Une image préproduction ne doit pas être promue telle quelle en production : le `basePath` est intégré aux bundles Next.js pendant le build.

## 4. Vérifier le déploiement

### Contrôler Redis

Dans le terminal du service `redis` :

```sh
redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping        # PONG
redis-cli --no-auth-warning -a "$REDIS_PASSWORD" info server
redis-cli ping                                               # doit répondre NOAUTH
```

La dernière commande est celle qui compte : une réponse `PONG` sans authentification signifie que `--requirepass` n'a pas été appliqué.

Les logs du service `backend` doivent contenir `✅ Connexion Redis établie` puis `✅ Test lecture/écriture Redis réussi`. Depuis le terminal du backend, `npm run test:connections` valide PostgreSQL et Redis avec la configuration réelle du conteneur.

Vérifiez enfin la persistance après un redéploiement :

```sh
redis-cli --no-auth-warning -a "$REDIS_PASSWORD" set voxo:persist-check 1
# redéployer l'application, puis
redis-cli --no-auth-warning -a "$REDIS_PASSWORD" get voxo:persist-check   # "1"
```

### Initialiser le RAG

Après le premier déploiement de la version contenant `knowledge_chunks`, ouvrez le terminal du service backend dans Dokploy et appliquez la migration :

```sh
npm run db:migrate:rag
```

La commande est idempotente : elle valide une table existante ou crée la table et l'extension `vector`. Elle échoue explicitement si la table est incomplète.

### Garantir les suppressions définitives

Après le déploiement de la fonctionnalité de suppression des comptes, appliquez également la migration idempotente des contraintes :

```sh
npm run db:migrate:tenant-deletion
```

Elle remplace les clés étrangères concernées par des contraintes `ON DELETE CASCADE`, sans supprimer de données lors de la migration.

Cette étape ne concerne que les déploiements ayant réactivé la recherche sémantique. Sans `OPENAI_DIRECT_KEY`, l'indexation laisse les chunks en `pending` sans erreur, ce qui est le comportement attendu.

Redémarrez ensuite le backend si `OPENAI_DIRECT_KEY` vient d'être ajoutée (le client embeddings est construit au chargement du module), puis ouvrez **Base de connaissances** dans le dashboard et cliquez sur la carte **IA Ready**. Attendez le bilan final de l'indexation. La couverture doit atteindre 100 %, avec zéro chunk en erreur.

En cas d'échec, vérifiez dans cet ordre :

1. la présence d'une clé `sk-proj-…` valide dans `OPENAI_DIRECT_KEY` — une clé OpenRouter `sk-or-v1-…` renvoie « 401 Incorrect API key provided » ;
2. l'existence de la table `knowledge_chunks` et de l'extension PostgreSQL `vector` ;
3. le détail `pending`, `indexing` et `error` affiché par la carte **IA Ready** ;
4. les logs backend contenant `RAG regeneration terminee` ou `Erreur RAG`.

Après le passage des trois services à l'état sain :

```text
https://api.example.com/health
https://api.example.com/api
https://api.example.com/widget.js
https://api.example.com/api/widget/health
https://api.example.com/api-docs/
https://app.example.com/
```

L'accès à Swagger demande d'abord les identifiants HTTP Basic `SWAGGER_USERNAME` et `SWAGGER_PASSWORD`. Le bouton **Authorize** de Swagger reste réservé au jeton JWT obtenu via `/api/auth/login`.

Le code d'intégration généré par le dashboard charge `https://api.example.com/widget.js` et renseigne explicitement `window.ChatBotConfig.apiUrl` avec `https://api.example.com/api`. Les attributs `data-*`, puis l'URL déduite du script, restent disponibles comme mécanismes de secours. La page d'intégration doit être servie via HTTP(S), jamais ouverte directement en `file://`.

## 5. Exploitation

- Le volume nommé `redis_data` conserve les données Redis entre les redéploiements.
- L'API refuse de démarrer en production si PostgreSQL ou Redis est indisponible.
- `GET /health` expose l'état du cache dans `services.redis` (`operational` ou `unavailable`). Le endpoint reste en `200` quand Redis tombe après le démarrage : aucune route applicative n'en dépend aujourd'hui, la panne est signalée sans sortir l'API de la rotation. Le client se reconnecte seul dès que Redis revient, sans redémarrer le backend.
- Les fichiers temporaires OCR sont placés dans le répertoire temporaire du conteneur et ne nécessitent pas de volume.
- Initialisez ou migrez le schéma Supabase séparément avant le déploiement d'une base neuve.
- Consultez les logs du service concerné dans Dokploy si un healthcheck échoue.
# Pièces jointes du widget

Avant d’activer les pièces jointes dans un chatbot :

```bash
cd backend
npm run db:migrate
npm run storage:init
```

Configurer `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_STORAGE_BUCKET` et `STORAGE_SIGNED_URL_TTL`. Le bucket doit rester
privé. Au démarrage, le backend journalise uniquement sa disponibilité, jamais
les clés fournisseur.

Planifier chaque heure un cron externe Dokploy exécutant :

```bash
cd backend && npm run attachments:purge
```

La commande utilise un verrou PostgreSQL afin que deux instances ne purgent pas
le même lot simultanément. Après déploiement, vérifier un upload image et
document, leur affichage dans la conversation et la suppression d’un upload
abandonné de plus d’une heure.
