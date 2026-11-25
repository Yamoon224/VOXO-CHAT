# WIDGET SYSTEM

## Rôle du document
- Ce document est la référence d'implémentation du volet widget (bundle chat embarqué, distribué en `<script>` unique sur les sites clients).
- Il complète `CLAUDE.md` / `CODEX.md`.
- Toute feature widget doit respecter ce document avant toute implémentation.
- En cas de doute, on suit cet ordre :
  - `CLAUDE.md` / `CODEX.md`
  - `WIDGET.md`
  - `widget/README.md` (contrat public documenté)
  - les patterns déjà validés dans le repo

## Stack technique réelle
- Vite 5, JavaScript vanilla (aucun framework — pas de React/Preact/Vue).
- Build en bundle IIFE unique, nom `ChatBotWidget`, fichier de sortie fixe `widget.js`, minifié via terser (`widget/vite.config.js`, `formats: ['iife']`). L’icône de marque SVG reste un asset externe afin de ne pas gonfler le JavaScript.
- `package.json.dependencies` est intentionnellement vide (`{}`) : zéro dépendance npm runtime.
- Styles générés et injectés en JS (`src/styles.js`), aucune dépendance CSS externe (pas de Tailwind, pas de framework CSS) — le bundle doit rester self-contained.

## Règles de base à ne surtout pas négliger (Clean Code / SOLID)
- **Limite de taille stricte : 250 lignes maximum par fichier.**
  - `utils.js` (~817 lignes) et `styles.js` (~523 lignes) sont des dettes existantes reconnues, pas une norme à suivre pour du nouveau code. Toute évolution de ces fichiers doit viser à extraire plutôt qu'à grossir davantage.
- **Single Responsibility** : chaque fichier a un rôle unique et ne doit pas en absorber d'autres.
  - `widget.js` : état, cycle de vie, session/profil, timers, rate limiting.
  - `api.js` : communication réseau uniquement (`ChatAPI`).
  - `ui-builder.js` : construction du DOM uniquement.
  - `styles.js` : génération/injection des styles uniquement.
  - `utils.js` : helpers génériques sans état (UUID, debounce, escape HTML, tracking, storage).
- **Fonctions courtes** (< 20 lignes visées), noms explicites.
- **Pas de code mort ou dupliqué** : pas de deuxième client API, pas de logique de style dupliquée hors de `styles.js`.

## Règles absolues
- **Zéro dépendance npm runtime.** Le widget doit rester 100% vanilla JS, sans framework, sans lib CSS externe — `package.json.dependencies` doit rester `{}`. Les modules de `shared/` (ex. `shared/file-rules.mjs`) sont du code source du dépôt bundlé par Vite, pas des dépendances : les importer est autorisé et permet de partager une règle avec le dashboard sans la dupliquer.
- **Budget du bundle : 84 Ko minifiés et 26 Ko gzip.** Vérifié et **bloquant** dans `copy-to-backend.js` : un dépassement fait échouer la copie. Toute révision se reporte dans `copy-to-backend.js`, `widget/README.md` et ce fichier.
- Toute communication backend passe exclusivement par `src/api.js` (`ChatAPI`), sur les endpoints sous le préfixe `/widget/*`, avec le header `X-Tenant-ID` obligatoire sur chaque requête. Endpoints existants : `POST /widget/message`, `POST /widget/upload`, `GET /widget/conversation/:sessionId`, `POST /widget/conversation/:sessionId/end`, `POST /widget/conversation/:sessionId/message-feedback`, `GET /widget/config`, `GET /widget/quick-replies`, `GET /widget/health`.
- Le temps réel passe par la socket `ChatAPI.conversationSocketUrl(sessionId)` (`/widget/conversation/:sessionId/socket?tenantId=`), ouverte dès l'initialisation — donc avant l'existence de la conversation côté serveur. Elle est en réception seule, à une exception près : `src/typing.js` y émet `{ type: 'typing', text }` pour l'aperçu de saisie. Cet émetteur ne parle que si `options.features.liveTypingPreview` est actif **et** que `handoffStatus === 'human'` ; il tempère à 300 ms et signale l'arrêt après 3 s d'inactivité ou à l'envoi. Le contrat serveur complet des événements est dans `BACKEND.md`.
- Les pièces jointes passent par `POST /widget/upload` (multipart, un fichier), qui répond un `id` à placer dans `attachmentIds` de `POST /widget/message`. Ne jamais poser d'en-tête `Content-Type` à la main sur un `FormData` : le navigateur doit écrire lui-même le boundary.
- Le build reste un bundle IIFE unique — ne jamais introduire de code-splitting ni de fichiers de sortie multiples.
- Workflow de déploiement local obligatoire après tout changement : `npm run build` (ou `npm run build:copy` / `npm run deploy`) qui exécute `copy-to-backend.js` pour copier tout `dist/` vers `backend/public/`, dont `widget.js` et `widget-assets/chat-icon.svg`. Ne jamais éditer ces artefacts à la main — ils seront écrasés.
- Styles toujours générés/injectés en JS via `styles.js` — jamais de fichier `.css` externe, jamais de dépendance CSS framework dans ce volet.
- Toute nouvelle option de configuration doit suivre le contrat `window.ChatBotConfig` documenté dans `widget/README.md`, notamment `options.ui.avatarUrl` et `options.ui.launcherIconUrl`, et rester rétrocompatible.
- L'API publique exposée (`window.ChatBotWidget.open/close/sendMessage/destroy`) ne doit jamais être cassée par une évolution interne.

## Point de vigilance connu
- Un possible drift existe entre `widget/README.md` (qui documente des scripts shell sous `widget/scripts/*.sh` et mentionne `dist/widget.js`) et le build Vite réel, qui peut produire `dist/widget.iife.js` avant que `copy-to-backend.js` ne le renomme/copie en `widget.js`. Si on touche au build ou au README, vérifier et corriger cette cohérence plutôt que la reproduire.

## Structure de dossiers
```text
widget/
  src/
    index.js           # entrée / auto-init, lit window.ChatBotConfig
    widget.js          # classe principale ChatBotWidget
    api.js             # ChatAPI — toute la communication réseau
    ui-builder.js      # construction du DOM
    styles.js          # génération et injection des styles
    utils.js           # helpers génériques
    markdown.js        # rendu Markdown sûr (nœuds DOM, jamais innerHTML)
    attachments.js     # file d'attente des pièces jointes (compression + envoi)
    typing.js          # émission throttlée de l'aperçu de saisie (handoff humain)
    branding-ui.js     # avatars de marque et icône du lanceur
    icons.js           # registre des SVG inline
    tokens.js          # variables CSS dérivées de la config
    color.js           # normalisation et dérivation des couleurs d'accent
  assets/chat-icon.svg # icône VOXO distribuée hors du bundle
  runtime-config.js  # apiUrl / frontendUrl et asset de marque par défaut
  test/                # node --test + jsdom
  copy-to-backend.js   # contrôle du budget puis copie vers backend/public/widget.js
  vite.config.js
  README.md            # contrat public à tenir à jour
```

Le corpus de test Markdown et les règles de fichiers sont partagés avec le
dashboard dans `shared/` (`markdown-corpus.mjs`, `file-rules.mjs`).

## Tests / build
- Scripts (`widget/package.json`) : `dev` (vite), `build` (vite build), `build:copy` (build + copy), `preview`, `serve` (http-server sur `dist/`, port 8080), `copy`, `deploy` (build + copy).
- Tests via `node --test` + `jsdom` dans `widget/test/` (`npm test`). Ne pas introduire de framework de test supplémentaire sans demande explicite.

## Checklist avant merge
- `package.json.dependencies` toujours vide.
- Aucun fichier modifié/créé ne dépasse 250 lignes (hors dette déjà connue sur `utils.js`/`styles.js`, à ne pas aggraver).
- Build IIFE unique généré et copié vers `backend/public/widget.js` via `copy-to-backend.js`, budget (84 Ko / 26 Ko gzip) respecté.
- Toute nouvelle propriété ou méthode durable de `ChatBotWidget` ajoutée à la regex `mangle.properties` de `vite.config.js`, sinon elle échappe au mangling et alourdit le bundle.
- Contrat public `window.ChatBotConfig` / `window.ChatBotWidget` non cassé.
- `widget/README.md` mis à jour si le contrat change.
- Cohérence vérifiée entre les scripts documentés dans le README et les scripts réels de `package.json`.
