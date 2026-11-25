# Widget VOXO

Widget de conversation JavaScript multi-tenant, sans framework, isolé du site hôte par un Shadow DOM ouvert.

Les conversations clôturées sont conservées dans l’historique local du navigateur pendant 30 jours. Cet historique est propre au navigateur et disparaît si ses données sont effacées.

## Développement et livraison

```bash
cd widget
npm install
npm run dev
npm test
npm run build:copy
```

`widget/src/` est l’unique source du widget. `dist/widget.js` et `backend/public/widget.js` sont des artefacts générés : ils ne doivent jamais être édités manuellement. Le serveur backend privilégie le fichier présent dans `backend/public`, donc utilisez toujours `npm run build:copy` avant une vérification via `http://localhost:3000/widget.js`.

Le budget de production est de 84 Ko minifiés et 26 Ko gzip au maximum. Il est
vérifié à chaque `npm run build:copy` : `copy-to-backend.js` sort en erreur et
ne copie rien si le bundle dépasse. Toute révision du budget doit être reportée
dans `copy-to-backend.js`, ce fichier et `WIDGET.md`.

## Intégration

```html
<script>
  window.ChatBotConfig = {
    apiUrl: 'https://your-domain.com/api',
    tenantId: 'your-tenant-id',
    locale: 'en', // optionnel : fr | en, sinon préférence visiteur puis navigateur
    showLanguageSwitcher: true,
    name: 'Assistant',
    welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
    theme: {
      primaryColor: '#3b82f6',
      textColor: '#333333',
      position: 'bottom-right'
    },
    options: {
      autoOpen: false,
      showPoweredBy: true,
      ui: {
        colorScheme: 'light',
        borderRadius: '16px',
        shadows: true,
        animations: true,
        mobileFullScreen: true,
        avatarUrl: null,
        launcherIconUrl: null,
        showUserAvatar: false
      },
      a11y: {
        trapFocus: 'auto',
        announceMessages: true
      },
      enableMarkdown: true,
      features: {
        messageFeedback: true,
        conversationRating: true,
        showTimestamps: true,
        showDeliveryStatus: true,
        dateSeparators: true,
        connectivityStatus: true,
        attachments: false,
        liveTypingPreview: false
      }
    }
  };
</script>
<script src="https://your-domain.com/widget.js" async></script>
```

Servez toujours la page d'intégration via HTTP(S). Une page ouverte directement
en `file://` possède une origine opaque et ne permet pas de tester correctement
les appels du widget vers l'API.

Pour les CMS qui n'acceptent pas de script de configuration séparé, utilisez
`<script src="https://your-domain.com/widget.js" data-tenant-id="..." data-api-url="https://your-domain.com/api" async></script>`.
La priorité est `window.ChatBotConfig`, puis les attributs `data-*`, puis l'URL déduite du script.

### Configuration

- `tenantId` est obligatoire.
- `locale` accepte `fr` ou `en`. La priorité est la configuration explicite, la préférence visiteur persistée par tenant, la langue du navigateur, puis `fr`.
- `showLanguageSwitcher` affiche le sélecteur FR/EN. `window.ChatBotWidget.setLocale(locale)` permet aussi un changement piloté par le site hôte.
- La locale est envoyée via `Accept-Language` et dans les métadonnées des messages.
- `theme.primaryColor` accepte une couleur hexadécimale. Le widget en dérive un accent sombre lisible avec du texte blanc.
- `theme.position` accepte `bottom-right`, `bottom-left`, `top-right` ou `top-left`.
- `options.ui.colorScheme` accepte `light` (défaut), `auto` ou `dark`.
- `options.ui.avatarUrl` configure l’avatar de l’assistant. Sans URL, l’icône VOXO est utilisée, puis les initiales si l’image est indisponible.
- `options.ui.launcherIconUrl` remplace uniquement l’icône du lanceur. À `null`, le SVG VOXO intégré au bundle est utilisé sans requête réseau ; une URL personnalisée invalide revient automatiquement à ce même SVG.
- `options.ui.showUserAvatar` affiche ou masque l’avatar utilisateur.
- `options.a11y.trapFocus` vaut `auto` par défaut : le focus est contenu uniquement sur mobile plein écran. Une valeur booléenne force le comportement.
- `options.a11y.announceMessages` contrôle l’annonce dédiée des nouvelles réponses.
- `options.enableMarkdown` active le sous-ensemble Markdown sécurisé pour les réponses assistant.
- `options.features.*` permet de désactiver individuellement feedback, notation, horodatages, statuts, séparateurs de dates et connectivité.
- `options.features.attachments` affiche le bouton trombone et autorise images et documents. La valeur reste `false` par défaut et se configure normalement depuis le dashboard.
- `options.features.liveTypingPreview` transmet au conseiller le texte en cours de frappe, **uniquement** pendant une prise en charge humaine. La valeur reste `false` par défaut et se configure depuis le dashboard. Le texte n’est ni stocké ni journalisé, et rien n’est transmis tant que la conversation est gérée par l’IA.

Toutes les anciennes clés restent acceptées avec leur sens actuel.

## API publique

```javascript
window.ChatBotWidget.open();
window.ChatBotWidget.close();
window.ChatBotWidget.toggle();
await window.ChatBotWidget.sendMessage('Bonjour !');
await window.ChatBotWidget.clearMessages();
window.ChatBotWidget.updateConfig({ theme: { primaryColor: '#10b981' } });
await window.ChatBotWidget.endConversation({ rating: 5, feedback: 'Très utile' });
window.ChatBotWidget.getStats();
window.ChatBotWidget.destroy();
```

Le bootstrap ignore une seconde injection tant qu’une instance active et son hôte `#voxo-chat` existent.

L’envoi utilise un `clientMessageId` stable. Une nouvelle tentative conserve cet identifiant et les identifiants des pièces jointes afin que le backend reprenne l’envoi ou renvoie une réponse déjà calculée sans duplication. Les statuts affichés sont volontairement limités à « Envoi en cours », « Traité par l’assistant » et « Échec ».

Fermer le panneau ne termine jamais la conversation. Seule l’action « Terminer et évaluer » appelle l’endpoint de fin. Après notation, la prochaine ouverture démarre une nouvelle session.

## Accessibilité et isolation

- Le panneau est une boîte de dialogue non modale, fermable avec `Escape`.
- Le focus est restauré à la fermeture et contenu automatiquement en plein écran mobile.
- Les messages ne constituent pas eux-mêmes une région live ; une région dédiée annonce une seule réponse à la fois.
- Les contrôles ont des libellés accessibles, des focus visibles et des cibles tactiles agrandies sur mobile.
- `prefers-reduced-motion`, `forced-colors` et les thèmes clair/sombre sont pris en charge.

Le Shadow DOM bloque les sélecteurs CSS ordinaires dans les deux sens. Les propriétés héritées marquées `!important` sur le site hôte peuvent néanmoins traverser la frontière ; le widget fixe donc explicitement sa pile typographique.

## CSP et navigateurs

Le widget utilise en priorité `adoptedStyleSheets`, qui évite une balise `<style>` injectée. Sur un navigateur sans feuilles construites, il utilise une balise `<style>` dans le Shadow Root ; une CSP sans autorisation des styles inline peut bloquer ce chemin de repli. La matrice de publication doit donc valider Chrome, Edge, Firefox et les versions Safari/iOS officiellement supportées avec la CSP du client.

Le Shadow DOM, `fetch`, `Promise` et les propriétés personnalisées CSS sont requis. Aucun repli light DOM n’est fourni.

## Markdown

Les réponses assistant prennent en charge paragraphes, gras, italique, code, blocs de code, listes et liens. Le HTML brut reste du texte. Les URL sont limitées à `http:`, `https:`, `mailto:`, `tel:` et aux chemins relatifs commençant par `/`. Au-delà de 8 000 caractères, le rendu repasse en texte simple.
