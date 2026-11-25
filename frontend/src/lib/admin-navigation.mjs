/**
 * Entrées de la barre latérale de la plateforme d'administration.
 *
 * `resource` : ressource à posséder en lecture pour voir l'entrée.
 * `systemOnly` : réservé au rôle système (super administrateur), car définir
 * les rôles ne peut pas dépendre d'une permission qu'on pourrait s'accorder.
 */
export const ADMIN_NAV_ITEMS = [
  {
    labelKey: 'stats',
    href: '/admin/stats',
    icon: 'BarChart3',
    resource: 'stats',
    systemOnly: false,
  },
  {
    labelKey: 'support',
    href: '/admin/support',
    icon: 'LifeBuoy',
    resource: 'support',
    systemOnly: false,
  },
  {
    labelKey: 'tenants',
    href: '/admin/tenants',
    icon: 'Building2',
    resource: 'tenants',
    systemOnly: false,
  },
  {
    labelKey: 'plans',
    href: '/admin/plans',
    icon: 'CreditCard',
    resource: 'plans',
    systemOnly: false,
  },
  {
    labelKey: 'adminAccounts',
    href: '/admin/accounts',
    icon: 'Users',
    resource: 'admins',
    systemOnly: false,
  },
  {
    labelKey: 'roles',
    href: '/admin/roles',
    icon: 'ShieldCheck',
    resource: null,
    systemOnly: true,
  },
]
