# Guides d’intégration des canaux VOXO

Ce document accompagne les pages **Documentation et intégration > Canaux** de VOXO. Les secrets (jetons et App Secret) ne doivent jamais être envoyés par e-mail, chat ou capture d’écran.

## WhatsApp Business Cloud API (Meta)

### Avant de commencer

Préparez un compte Facebook, un accès administrateur à Meta Business, un numéro disponible pour WhatsApp Business et une instance VOXO publiquement accessible en HTTPS. Prévoyez 30 à 60 minutes pour la première configuration.

Un numéro de test Meta et son jeton temporaire sont utiles pour découvrir le parcours. Ils expirent et ne remplacent pas votre numéro professionnel ni un jeton de production.

### 1. Créer l’application Meta

1. Ouvrez [Meta for Developers](https://developers.facebook.com/) puis **Mes applications**.
2. Cliquez sur **Créer une application**, choisissez **Autre**, puis **Entreprise**.
3. Dans le tableau de bord, ajoutez le produit **WhatsApp** et ouvrez **Configuration de l’API**.
4. Créez ou sélectionnez le compte WhatsApp Business (WABA), puis ajoutez le numéro qui répondra à vos clients.

Un numéro déjà utilisé dans WhatsApp peut devoir être migré : vérifiez les règles Meta avant de l’utiliser en production.

### 2. Obtenir les identifiants

VOXO demande trois valeurs.

| Valeur | Emplacement Meta | Utilité |
| --- | --- | --- |
| Phone Number ID | **WhatsApp > Configuration de l’API** | Identifie le numéro connecté ; ce n’est pas le numéro de téléphone. |
| App Secret | **Paramètres > Général** de l’application | Vérifie que les webhooks viennent de Meta. |
| Jeton d’accès permanent | **Paramètres d’entreprise > Utilisateurs > Utilisateurs système** | Autorise VOXO à lire le numéro et envoyer des messages. |

Pour le jeton permanent, créez un utilisateur système, attribuez-lui l’application et le WABA comme ressources, puis générez un jeton avec `whatsapp_business_messaging` et `whatsapp_business_management`. Conservez le jeton dans un gestionnaire de mots de passe.

### 3. Connecter VOXO

1. Dans VOXO, ouvrez **Canaux > WhatsApp via Meta**.
2. Collez le Phone Number ID, le jeton permanent et l’App Secret.
3. Cliquez sur **Vérifier** : le numéro professionnel doit être reconnu.
4. Cliquez sur **Enregistrer**.
5. Copiez immédiatement l’URL webhook et le jeton de vérification affichés par VOXO.

Le jeton de vérification n’est pas réaffiché après un rechargement ; conservez-le jusqu’à la validation dans Meta.

### 4. Déclarer le webhook chez Meta

1. Dans Meta, ouvrez **WhatsApp > Configuration**.
2. Dans la zone Webhook, cliquez sur **Configurer** ou **Modifier**.
3. Collez l’URL VOXO et le jeton de vérification, puis cliquez sur **Vérifier et enregistrer**.
4. Ouvrez **Gérer** et abonnez-vous au champ `messages`.

Si Meta ne valide pas l’URL, vérifiez l’HTTPS, l’URL complète et le jeton caractère par caractère.

### 5. Tester et passer en production

1. Envoyez un message au numéro WhatsApp Business depuis un téléphone autorisé.
2. Vérifiez que le message apparaît dans **Conversations** dans VOXO.
3. Vérifiez que la réponse du bot arrive dans WhatsApp.
4. Testez une pièce jointe si votre scénario utilise images ou documents.

Après le dernier message d’un client, vous avez une fenêtre de 24 heures pour répondre librement. Au-delà, utilisez un modèle Meta approuvé et contactez uniquement des personnes ayant donné leur consentement.

### Dépannage WhatsApp

- **Jeton refusé** : vérifiez les permissions, les ressources associées à l’utilisateur système et son expiration.
- **Webhook non validé** : vérifiez l’HTTPS, l’URL et le jeton fournis par VOXO.
- **Messages absents** : vérifiez l’abonnement `messages` et le Phone Number ID.
- **Réponse impossible** : contrôlez la fenêtre de 24 heures, l’état du numéro et les limites imposées par Meta.

En cas de perte ou de suspicion de fuite, révoquez le jeton Meta, créez-en un nouveau et reconnectez le canal dans VOXO.

## Telegram

### 1. Créer le bot

1. Ouvrez [@BotFather](https://t.me/botfather) dans Telegram et vérifiez qu’il s’agit du compte officiel.
2. Envoyez `/newbot`.
3. Choisissez le nom visible, puis un identifiant qui se termine par `bot`.
4. Copiez le Bot Token affiché par BotFather et rangez-le dans un gestionnaire de mots de passe.

Le Bot Token donne le contrôle du bot ; ne le publiez jamais. En cas de doute, révoquez-le dans BotFather et créez-en un nouveau.

### 2. Connecter VOXO

1. Ouvrez **Canaux > Telegram** dans VOXO.
2. Collez le Bot Token.
3. Cliquez sur **Vérifier** : le nom et l’identifiant du bot doivent apparaître.
4. Cliquez sur **Activer l’intégration**.

VOXO enregistre automatiquement le webhook Telegram. Vous n’avez aucune URL à copier dans Telegram.

### 3. Tester et personnaliser

1. Ouvrez `https://t.me/votre_identifiant_bot`.
2. Cliquez sur **Démarrer** ou envoyez `/start`.
3. Envoyez une question, puis vérifiez le message et la réponse dans VOXO.

Dans BotFather, utilisez `/setdescription`, `/setabouttext`, `/setuserpic` et `/setcommands` pour présenter le bot. Pour les groupes, réglez `/setprivacy` : laissez-le actif pour un bot privé de support, désactivez-le uniquement si le bot doit lire tous les messages d’un groupe.

### Dépannage Telegram

- **Token invalide ou révoqué** : obtenez un nouveau token dans BotFather, puis reconnectez le canal.
- **Le bot ne répond pas** : envoyez `/start`, vérifiez l’état du canal dans VOXO et assurez-vous que son webhook n’a pas été remplacé.
- **Le bot ignore un groupe** : vérifiez qu’il y est ajouté et contrôlez le réglage `/setprivacy`.

## Checklist sécurité

- Limitez les secrets aux administrateurs.
- Révoquez et remplacez tout secret suspecté d’être compromis.
- Testez le canal après chaque renouvellement de jeton.
- Vérifiez régulièrement l’état et le dernier message d’erreur dans **Canaux**.
