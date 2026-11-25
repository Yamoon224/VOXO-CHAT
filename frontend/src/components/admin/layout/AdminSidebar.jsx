'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { BarChart3, Building2, CreditCard, LifeBuoy, ShieldCheck, Users, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ADMIN_NAV_ITEMS } from '@/lib/admin-navigation.mjs'
import { useAdminPermissions } from '@/hooks/use-admin-permissions'

const ICONS = { Users, ShieldCheck, Building2, CreditCard, BarChart3, LifeBuoy }

export function AdminSidebar({ admin, sidebarOpen, setSidebarOpen }) {
  const pathname = usePathname()
  const t = useTranslations('Shell')
  const locale = useLocale()
  const { canRead, isSystemRole, ready } = useAdminPermissions()

  // Une entrée inaccessible disparaît. Tant que `ready` est faux, on n'affiche
  // rien plutôt que d'ouvrir à tort.
  const navigation = ready
    ? ADMIN_NAV_ITEMS
      .filter(item => (item.systemOnly ? isSystemRole : !item.resource || canRead(item.resource)))
      .map(item => ({ ...item, icon: ICONS[item.icon] }))
    : []

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Bordure fine plutôt qu'ombre portée : la maquette repose sur le
          contraste avec le fond, pas sur l'élévation. */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-5 flex-shrink-0">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <span className="text-lg font-semibold text-gray-900">Voxo Admin</span>
              </div>
            </div>
            <button
              className="lg:hidden text-gray-400 hover:text-gray-600"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-3">
              <ul className="space-y-0.5">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                  return (
                    <li key={item.labelKey}>
                      <Link
                        href={`/${locale}${item.href}`}
                        className={`group flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                          isActive
                            ? 'bg-slate-100 font-medium text-slate-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon
                          className={`mr-3 h-[18px] w-[18px] flex-shrink-0 ${
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

          <div className="flex-shrink-0 p-3">
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-sm font-medium text-gray-900 truncate">
                {admin?.firstName} {admin?.lastName}
              </p>
              <Badge variant="secondary" className="mt-1 text-xs">
                {admin?.role?.name || '—'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
