/**
 * Fonctionnalités et étapes de la landing publique.
 *
 * Séparé de `landing-content.mjs` pour tenir la limite de 250 lignes par
 * fichier. Chaque entrée porte :
 *  - `tint` : la teinte du grand panneau (classes Tailwind explicites) ;
 *  - `shot` : le nom du fichier de capture attendu dans `public/landing/`.
 *    Tant que `shot` est `null`, `ScreenshotFrame` affiche son squelette.
 */

export const FEATURES_HEADER = {
  title: 'Tout ce dont vous avez besoin, rien de plus.',
  accent: 'Voici ce qui fait la différence.',
};

export const FEATURES = [
  {
    title: 'Résolvez des demandes complexes avec un vrai contexte.',
    text: 'Suivi de commande, disponibilité produit, conditions de retour : VOXO va chercher l’information au moment de répondre, dans vos propres données.',
    tint: 'bg-[#2A1A0F]',
    shot: '/landing/inbox.png',
    alt: 'Boîte de réception VOXO avec le fil d’une conversation client',
  },
  {
    title: 'Lancez un support IA puissant sans écrire une ligne de code.',
    text: 'Une interface pensée pour les équipes support. Vous configurez, testez et publiez sans passer par la technique.',
    tint: 'bg-[#0D2A30]',
    shot: '/landing/settings.png',
    alt: 'Écran de configuration de l’agent VOXO',
  },
  {
    title: 'Adoptez le modèle le mieux adapté à votre activité.',
    text: 'Choisissez le modèle de génération et ajustez le ton, la langue et la longueur des réponses depuis les réglages.',
    tint: 'bg-[#4A5340]',
    shot: '/landing/settings.png',
    alt: 'Réglages du ton et du modèle de réponse',
  },
  {
    title: 'Gardez le contrôle sur l’automatisation.',
    text: 'Règles d’escalade, horaires, sujets interdits, quotas : vous décidez de ce que l’agent a le droit de faire, et de ce qui remonte à votre équipe.',
    tint: 'bg-[#3A2010]',
    shot: '/landing/channels.png',
    alt: 'Canaux connectés et règles de diffusion',
  },
  {
    title: 'Mesurez et améliorez à chaque interaction.',
    text: 'Volume, taux de résolution, temps de réponse, sentiment client : les statistiques sont disponibles en continu.',
    tint: 'bg-[#1B2440]',
    shot: '/landing/analytics.png',
    alt: 'Statistiques de conversations et satisfaction client',
  },
  {
    title: 'Gardez votre savoir toujours à jour.',
    text: 'Documents, pages web, catalogue produits : votre base de connaissances se met à jour et l’agent suit immédiatement.',
    tint: 'bg-[#2E1A2E]',
    shot: '/landing/knowledge.png',
    alt: 'Import d’un document dans la base de connaissances',
  },
];

export const STEPS_HEADER = {
  title: 'Quatre étapes.',
  accent: 'De la configuration aux conversations en quelques minutes.',
};

export const STEPS = [
  {
    title: 'Donnez votre savoir à VOXO.',
    text: 'Importez votre documentation, vos FAQ, vos pages web ou votre catalogue produits.',
    shot: '/landing/knowledge.png',
    alt: 'Ajout d’une connaissance depuis un fichier ou une URL',
  },
  {
    title: 'Faites-en votre agent.',
    text: 'Ajustez le ton, les couleurs, le message d’accueil et vos règles d’acheminement.',
    shot: '/landing/settings.png',
    alt: 'Personnalisation de l’apparence et du ton de l’agent',
  },
  {
    title: 'Testez-le pour de vrai.',
    text: 'Discutez avec votre agent depuis l’aperçu intégré avant toute mise en ligne.',
    shot: '/landing/widget.png',
    alt: 'Aperçu du widget de discussion VOXO',
  },
  {
    title: 'Laissez VOXO travailler.',
    text: 'Publiez le widget, connectez vos canaux et suivez tout depuis une boîte unifiée.',
    shot: '/landing/inbox.png',
    alt: 'Boîte de réception unifiée des conversations',
  },
];

export const STEPS_CTA = {
  title: 'Intéressé par VOXO ?',
  accent: 'Essayez-le en moins de 5 minutes.',
};
