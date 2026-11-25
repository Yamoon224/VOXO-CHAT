/**
 * Grille tarifaire affichée sur la landing publique.
 *
 * Contenu volontairement statique : la racine `/` ne doit dépendre d'aucun appel
 * backend (le healthcheck Docker la sonde). Les limites réellement appliquées
 * vivent en base (table `plans`) et sont éditables depuis l'administration —
 * cette grille est une vitrine, pas la source de vérité.
 *
 * Les identifiants `id` sont alignés sur l'ENUM `Tenant.subscription_plan`
 * du backend (`backend/src/config/quotaPlans.js`).
 *
 * TODO: valider les montants avec l'équipe commerciale avant mise en ligne.
 */

export const PRICING_HEADER = {
  title: 'Sans surprises, sans frais cachés.',
  accent: 'Une tarification qui s’adapte à votre croissance.',
};

export const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Découverte',
    price: '0 €',
    period: 'pour toujours',
    tagline: 'Pour tester VOXO sur un vrai cas.',
    ctaLabel: 'Commencer gratuitement',
    features: [
      '100 messages par mois',
      '3 documents dans la base de connaissances',
      'Widget site web',
      'Statistiques de base',
    ],
  },
  {
    id: 'basic',
    name: 'Essentiel',
    price: '29 €',
    period: 'par mois',
    tagline: 'Pour une petite équipe qui reçoit du volume.',
    featured: true,
    ctaLabel: 'Commencer gratuitement',
    features: [
      '500 messages par mois',
      '10 documents dans la base de connaissances',
      'WhatsApp, Telegram et Messenger',
      'Capture de prospects',
      'Boîte de réception unifiée',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '99 €',
    period: 'par mois',
    tagline: 'Pour un support qui tourne à plein régime.',
    ctaLabel: 'Commencer gratuitement',
    features: [
      'Messages illimités',
      'Base de connaissances illimitée',
      'Tous les canaux',
      'Statistiques avancées et sentiment',
      'Support prioritaire',
    ],
  },
];

export const PRICING_ENTERPRISE = {
  name: 'Entreprise',
  text: 'Volumes importants, engagements contractuels, exigences de conformité spécifiques ou accompagnement dédié ?',
  ctaLabel: 'Parlons-en',
};

export const PRICING_COPY = {
  currency: 'Devise', unavailable: 'Tarif bientôt disponible', loading: 'Chargement…', perYear: 'par an', perMonth: 'par mois', featured: 'Le plus choisi',
  unlimitedMessages: 'Messages illimités', unlimitedDocuments: 'Documents illimités', messagesPerMonth: count => `${count} messages par mois`, documents: count => `${count} documents`,
  fallbackTagline: 'Un forfait VOXO adapté à votre activité.', fallbackCta: 'Commencer gratuitement',
  features: { analytics: 'Statistiques avancées', customBranding: 'Personnalisation de marque', leadGeneration: 'Capture de prospects', customAiInstructions: 'Instructions IA personnalisées' },
};
