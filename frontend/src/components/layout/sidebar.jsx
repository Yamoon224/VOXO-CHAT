'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import {
  BarChart3,
  BookOpen,
  MessageSquare,
  Brain,
  Settings,
  X,
  Building2,
  CreditCard,
  Share2,
  Users,
  LifeBuoy
} from 'lucide-react'
import { Bot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { NAV_ITEMS, canAccessNavItem } from '@/lib/navigation.mjs'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { useTenantQuota } from '@/hooks/use-tenant-quota'

const ICONS = { BarChart3, MessageSquare, Brain, Settings, Share2, BookOpen, Users, CreditCard, LifeBuoy, Bot }

export function Sidebar({ tenant, sidebarOpen, setSidebarOpen }) {
  const pathname = usePathname()
  const t = useTranslations('Shell')
  const locale = useLocale()
  const { canRead, ready } = usePermissions()
  const { user } = useAuth()
  const { quota } = useTenantQuota(Boolean(tenant))

  // Une entrée inaccessible disparaît, selon la même règle que `RouteGuard`.
  // Tant que `ready` est faux, on n'affiche rien plutôt que d'ouvrir à tort.
  const navigation = ready
    ? NAV_ITEMS
      .filter(item => canAccessNavItem(item, { canRead, role: user?.role }))
      .map(item => ({ ...item, icon: ICONS[item.icon] }))
    : []

  return (
    <>
      {/* Sidebar mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar fixe */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center">
              <div className="h-8 w-8 overflow-hidden bg-blue-600 rounded-lg flex items-center justify-center">
                {tenant?.logoUrl ? <img src={tenant.logoUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5 text-white" />}
              </div>
              <div className="ml-3">
                <span className="text-lg font-semibold text-gray-900">
                  {tenant?.name || 'Dashboard'}
                </span>
                <Badge className="ml-2 text-xs" variant="secondary">
                  {tenant?.subscriptionPlan?.toUpperCase() || 'FREE'}
                </Badge>
              </div>
            </div>
            <button
              className="lg:hidden text-gray-400 hover:text-gray-600"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation - scrollable */}
          <div className="flex-1 overflow-y-auto py-6">
            <nav className="px-3">
              <ul className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/dashboard' && pathname.startsWith(item.href.split('?')[0]))
                  
                  return (
                    <li key={item.labelKey}>
                      <Link
                        href={`/${locale}${item.href}`}
                        className={`group flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                          isActive
                            ? 'bg-slate-100 font-medium text-slate-900'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon
                          className={`mr-3 h-5 w-5 flex-shrink-0 ${
                            isActive ? 'text-slate-900' : 'text-gray-400 group-hover:text-gray-600'
                          }`}
                        />
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>

          {/* Forfait et consommation réelle - fixé en bas.
              Rappel sobre : la carte détaillée vit sur la page d'accueil. Le
              dégradé d'avant faisait de la barre latérale l'élément le plus
              bruyant de l'écran, pour une information secondaire.
              Les chiffres viennent de `/tenant/quota`. */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-gray-900">
                {quota?.planLabel || tenant?.subscriptionPlan || t('free')}
              </p>
              <span className="flex-shrink-0 text-xs text-muted-foreground">
                {quota
                  ? `${quota.messages.used} / ${quota.messages.unlimited ? '∞' : quota.messages.limit}`
                  : '—'}
              </span>
            </div>
            {quota && !quota.messages.unlimited && (
              <Progress
                value={Math.min(Math.round((quota.messages.used / quota.messages.limit) * 100), 100)}
                className="mt-2 h-1"
              />
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">{t('messagesThisMonth')}</p>
          </div>
        </div>
      </div>
    </>
  )
}
