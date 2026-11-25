/**
 * Table de correspondance entre les noms d'icônes déclarés dans
 * `landing-content.mjs` et les composants `lucide-react`.
 *
 * Le contenu reste ainsi purement déclaratif (pas de composant React dans les
 * fichiers de copy) tout en évitant un import barrel dans chaque section.
 */
import {
  ArrowUpRight,
  BookCheck,
  BrainCircuit,
  Eye,
  FileLock2,
  Globe,
  Globe2,
  HandHeart,
  Layers,
  LineChart,
  MessageCircle,
  MessagesSquare,
  MousePointerClick,
  Plug,
  Radar,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Webhook,
  Workflow,
} from 'lucide-react';

const ICONS = {
  ArrowUpRight,
  BookCheck,
  BrainCircuit,
  Eye,
  FileLock2,
  Globe,
  Globe2,
  HandHeart,
  Layers,
  LineChart,
  MessageCircle,
  MessagesSquare,
  MousePointerClick,
  Plug,
  Radar,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Webhook,
  Workflow,
};

/** Retourne le composant d'icône associé au nom, avec un repli sûr. */
export function getLandingIcon(name) {
  return ICONS[name] || Sparkles;
}
