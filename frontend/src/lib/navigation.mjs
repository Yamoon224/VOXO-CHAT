/**
 * Entrées de la barre latérale et droits qu'elles requièrent.
 *
 * Deux axes de contrôle, volontairement distincts :
 *  - `resource` : accès en LECTURE à une ressource (permissions granulaires) ;
 *  - `roles`    : appartenance à un RÔLE. Gérer l'équipe ou la facturation est
 *    une prérogative du propriétaire, pas un niveau d'accès à une donnée.
 *
 * `resource: null` sans `roles` = toujours visible. C'est le cas du Support et
 * des Paramètres, qui contiennent l'onglet Profil, accessible à tout membre
 * quels que soient ses accès.
 *
 * SOURCE UNIQUE : cette table décrit l'accès aux DESTINATIONS. Les onglets
 * restés dans les Paramètres sont décrits par `use-settings-tabs`. Une zone ne
 * doit figurer que dans l'une des deux.
 */
export const NAV_ITEMS = [
  { labelKey: 'overview', href: '/dashboard', icon: 'BarChart3', resource: 'analytics' },
  { labelKey: 'conversations', href: '/dashboard/conversations', icon: 'MessageSquare', resource: 'conversations' },
  { labelKey: 'knowledge', href: '/dashboard/knowledge', icon: 'Brain', resource: 'knowledge' },
  { labelKey: 'channels', href: '/dashboard/channels', icon: 'Share2', resource: 'company' },
  { labelKey: 'agentic', href: '/dashboard/agentic', icon: 'Bot', resource: 'agentic' },
  { labelKey: 'integration', href: '/dashboard/integration', icon: 'BookOpen', resource: 'company' },
  { labelKey: 'team', href: '/dashboard/team', icon: 'Users', resource: null, roles: ['owner', 'admin'] },
  { labelKey: 'billing', href: '/dashboard/billing', icon: 'CreditCard', resource: null, roles: ['owner', 'admin'] },
  // `resource: null` comme Paramètres : tout membre doit pouvoir signaler un
  // problème, y compris celui qui n'a accès à rien d'autre.
  { labelKey: 'support', href: '/dashboard/support', icon: 'LifeBuoy', resource: null },
  { labelKey: 'settings', href: '/dashboard/settings', icon: 'Settings', resource: null },
]

/**
 * Règle d'accès unique, partagée par la barre latérale (qui masque l'entrée) et
 * par `RouteGuard` (qui refuse l'URL tapée à la main). Les deux DOIVENT répondre
 * la même chose : une entrée masquée dont la page reste ouverte est un trou.
 */
export function canAccessNavItem({ resource, roles }, { canRead, role }) {
  if (roles && !roles.includes(role)) return false
  if (resource && !canRead(resource)) return false
  return true
}
