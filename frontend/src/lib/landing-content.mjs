/**
 * Contenu statique de la landing page publique (route `/`).
 * Aucune donnée backend ici : la racine doit rester 100 % statique
 * (le healthcheck Docker sonde `GET /`).
 */

export const HERO = {
  badge: 'Agent IA de support client',
  title: 'Automatisez jusqu’à 60 % de vos conversations client',
  subtitle:
    'VOXO répond à vos clients 24 h/24 sur tous vos canaux, en s’appuyant sur vos vraies données. Votre équipe garde les demandes qui comptent vraiment.',
  primaryCta: 'Essayer gratuitement',
  secondaryCta: 'Voir la démo',
};

export const SOCIAL_PROOF = {
  title: 'Déjà adopté par des équipes support exigeantes',
  // TODO: remplacer par les vrais clients (logos ou noms) avant mise en ligne.
  logos: ['Aura', 'Neoburo', 'Decathlon', 'Reedsy', 'GoMoWorld', 'EmmaApp'],
};

export const WHY_ITEMS = [
  {
    icon: 'Radar',
    title: 'Conçu pour le réel',
    text: 'Des vraies conversations, des données métier complexes, des clients pressés. VOXO est pensé pour ça, pas pour une démo.',
  },
  {
    icon: 'Layers',
    title: 'Pensé pour durer',
    text: 'Rapide, modulaire, multi-tenant. L’architecture suit votre croissance sans vous obliger à tout réécrire.',
  },
  {
    icon: 'Eye',
    title: 'Transparent par conception',
    text: 'Chaque réponse est traçable : source utilisée, canal, sentiment. Vous voyez et modifiez la logique.',
  },
  {
    icon: 'BookCheck',
    title: 'Ancré dans la vérité',
    text: 'Les réponses viennent de votre base de connaissances, pas de l’imagination du modèle.',
  },
  {
    icon: 'HandHeart',
    title: 'L’autonomie, avec responsabilité',
    text: 'L’automatisation sert vos équipes. Quand un doute apparaît, VOXO passe la main à un humain.',
  },
];

export const SOLUTION_CARDS = [
  {
    icon: 'BrainCircuit',
    title: 'Intelligence contextuelle',
    text: 'VOXO garde le fil d’une conversation à l’autre : historique, commandes, préférences. Le client ne se répète jamais.',
  },
  {
    icon: 'Plug',
    title: 'Intégration profonde',
    text: 'Branché sur votre catalogue et vos outils, l’agent répond avec vos données à jour plutôt qu’avec des généralités.',
  },
  {
    icon: 'ArrowUpRight',
    title: 'Escalade intelligente',
    text: 'Quand la demande dépasse l’automatisation, elle arrive à votre équipe avec tout le contexte déjà rassemblé.',
  },
];

export const TRUST_BADGES = [
  {
    icon: 'ShieldCheck',
    badge: 'Sécurité',
    title: 'La sécurité au cœur',
    text: 'Chiffrement en transit, API authentifiées, contrôle d’accès strict par rôle et isolation stricte entre comptes.',
  },
  {
    icon: 'FileLock2',
    badge: 'Conformité',
    title: 'Conforme au RGPD',
    text: 'Traitement transparent, durée de conservation maîtrisée, suppression de compte et export de vos données à la demande.',
  },
  {
    icon: 'Globe2',
    badge: 'Hébergement',
    title: 'Données maîtrisées',
    text: 'Vos conversations et votre base de connaissances restent dans votre espace, cloisonnées par tenant.',
  },
];

export const INTEGRATIONS = {
  title: 'Compatible avec votre système d’information',
  subtitle:
    'Connectez vos canaux et vos outils autour de VOXO pour offrir une expérience de support cohérente, partout.',
  channels: [
    {
      icon: 'Globe',
      name: 'Widget site web',
      text: 'Un seul <script> à coller',
    },
    {
      icon: 'MessageCircle',
      name: 'WhatsApp',
      text: 'Conversations synchronisées',
    },
    { icon: 'Send', name: 'Telegram', text: 'Branchement par token' },
    {
      icon: 'MessagesSquare',
      name: 'Messenger',
      text: 'Pages Facebook connectées',
    },
    {
      icon: 'ShoppingCart',
      name: 'WooCommerce',
      text: 'Catalogue et commandes',
    },
    { icon: 'Webhook', name: 'Webhooks', text: 'Vos outils internes' },
  ],
};

// TODO: témoignages fictifs — à remplacer par de vrais clients avant mise en ligne.
export const TESTIMONIALS = [
  {
    company: 'Aura Cosmetics',
    person: 'Directrice de la relation client',
    quote:
      'Près de 60 % des demandes sont traitées de bout en bout sans intervention. L’équipe se concentre enfin sur les cas à valeur.',
    metric: '60 %',
    metricLabel: 'de demandes automatisées',
  },
  {
    company: 'Neoburo',
    person: 'Responsable des opérations',
    quote:
      'Le suivi de commande représentait la moitié de nos tickets. VOXO y répond seul, avec les bonnes données, à toute heure.',
    metric: '2 min',
    metricLabel: 'de temps de réponse moyen',
  },
  {
    company: 'GoMoWorld',
    person: 'Fondateur',
    quote:
      'Ce qui n’est pas automatisé arrive à l’équipe avec tout le contexte. Les transferts ne se perdent plus en route.',
    metric: '4,7/5',
    metricLabel: 'de satisfaction client',
  },
];

export const FINAL_CTA = {
  title: 'Démarrez avec VOXO dès aujourd’hui.',
  subtitle:
    'Votre agent de support peut répondre à son premier client cet après-midi.',
};

/**
 * Titres de section, en deux lignes de même taille : `title` en pleine
 * opacité, `accent` en gris. Motif typographique dominant du design.
 */
export const SECTION_HEADERS = {
  why: { ghost: 'Pourquoi ?' },
  solutions: ['1 agent IA.', 'Tous vos canaux.', 'Mille possibilités.'],
  testimonials: {
    title: 'Des équipes réelles, des résultats concrets.',
    accent: 'Ce qui se passe quand le support devient enfin simple.',
  },
  faq: { title: 'Des questions ?', accent: 'Nous avons les réponses.' },
};

export const FOOTER_LINKS = [
  {
    title: 'Produit',
    links: [
      { label: 'Pourquoi VOXO', href: '#pourquoi' },
      { label: 'Solutions', href: '#solutions' },
      { label: 'Fonctionnalités', href: '#fonctionnalites' },
      { label: 'Comment ça marche', href: '#etapes' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'Intégrations', href: '#integrations' },
      { label: 'Cas clients', href: '#clients' },
      { label: 'Tarifs', href: '#tarifs' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Compte',
    links: [
      { label: 'Se connecter', href: '/auth/login' },
      { label: 'Créer un compte', href: '/auth/register' },
      { label: 'Mot de passe oublié', href: '/auth/forgot-password' },
    ],
  },
];

export const NAV_LINKS = [
  { label: 'Pourquoi', href: '#pourquoi' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Intégrations', href: '#integrations' },
  { label: 'Tarifs', href: '#tarifs' },
  { label: 'FAQ', href: '#faq' },
];

export const FOOTER_COPY = {
  description: 'L’agent IA qui répond à vos clients 24 h/24, sur tous vos canaux, à partir de vos propres données.',
  rights: 'Tous droits réservés.', terms: 'Conditions générales', privacy: 'Politique de confidentialité',
};

export const FAQ_CONTACT = 'D’autres questions ? Contactez-nous';
