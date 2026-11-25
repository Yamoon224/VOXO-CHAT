'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAdminAuth, useAdminAuthGuard, useAdminAuthInit } from '@/hooks/use-admin-auth'
import { useToast } from '@/hooks/use-toast'
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar'
import { AdminHeader } from '@/components/admin/layout/AdminHeader'
import { HeaderSlotProvider } from '@/components/shared/PageHeader'
import { TooltipProvider } from '@/components/ui/tooltip'
import { OneSignalIdentity } from '@/components/notifications/OneSignalIdentity'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { useLocale, useTranslations } from 'next-intl'

function AdminShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const locale = useLocale()
  const t = useTranslations('Shell')
  const { isAuthenticated, isLoading } = useAdminAuthGuard({ requireAuth: true })
  const { admin, logout } = useAdminAuth()

  const handleLogout = async () => {
    await logout()
    toast.success(t('logoutSuccess'))
    router.push(`/${locale}/admin/auth/login`)
  }

  if (isLoading) {
    return (
      <PageSkeleton variant="shell" />
    )
  }

  if (!isAuthenticated) return null // useAdminAuthGuard se charge de la redirection

  return (
    <TooltipProvider delayDuration={200}>
      <HeaderSlotProvider>
        <OneSignalIdentity admin />
        <div className="bg-gray-50 min-h-screen flex flex-col">
          <AdminSidebar admin={admin} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
            <AdminHeader admin={admin} setSidebarOpen={setSidebarOpen} onLogout={handleLogout} />
            {/* Largeur bornée : sans elle, les tuiles s'étirent démesurément
                sur les écrans très larges. */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              <div className="mx-auto w-full max-w-[1600px] space-y-6">{children}</div>
            </main>
          </div>
        </div>
      </HeaderSlotProvider>
    </TooltipProvider>
  )
}

export default function AdminLayout({ children }) {
  // La session admin s'initialise pour toute la zone /admin, y compris les
  // écrans de connexion : eux ont besoin de savoir si une session existe déjà.
  useAdminAuthInit()
  const pathname = usePathname()

  // Les écrans d'authentification s'affichent nus : les envelopper dans le
  // shell les rendrait inaccessibles, puisque celui-ci exige d'être connecté.
  if (pathname?.startsWith('/admin/auth')) return children

  return <AdminShell>{children}</AdminShell>
}
