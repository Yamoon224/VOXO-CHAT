'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth, useAuthGuard } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { HeaderSlotProvider } from '@/components/shared/PageHeader'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { useLocale, useTranslations } from 'next-intl'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const locale = useLocale()
  const t = useTranslations('Shell')
  // Les détails de conversation occupent tout l'écran : ni marge, ni pied de page.
  const fullBleed = Boolean(pathname?.startsWith('/dashboard/conversations/details'))
  
  // Protection de route
  const { isAuthenticated, isLoading } = useAuthGuard({ requireAuth: true })
  
  const { user, tenant, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    toast.success(t('logoutSuccess'))
    router.push(`/${locale}/auth/login`)
  }

  // Afficher un loader pendant la vérification d'authentification
  if (isLoading) {
    return (
      <PageSkeleton variant="shell" />
    )
  }

  if (!isAuthenticated) {
    return null // Le useAuthGuard se charge de la redirection
  }

  return (
    // Un seul provider pour tout le dashboard : les tooltips « lecture seule »
    // apparaissent dans les onglets, les tableaux et la base de connaissances.
    <TooltipProvider delayDuration={200}>
    <HeaderSlotProvider>
    <div className={`bg-gray-50 flex flex-col ${fullBleed ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <Sidebar
        tenant={tenant}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Content area */}
      <div className={`lg:pl-64 flex flex-col flex-1 ${fullBleed ? 'min-h-0' : 'min-h-screen'}`}>
        <Header
          user={user}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
        />

        {/* Main content. Largeur bornée hors plein écran : sans elle, les tuiles
            s'étirent démesurément sur les très larges moniteurs. La branche
            `fullBleed` reste sans marge NI conteneur, sinon les trois panneaux
            du détail d'une conversation perdraient leur pleine largeur. */}
        <main className={`flex-1 min-h-0 flex flex-col ${fullBleed ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`}>
          {fullBleed
            ? children
            : <div className="mx-auto w-full max-w-[1600px] space-y-6">{children}</div>}
        </main>

        {!fullBleed && <Footer />}
      </div>
    </div>
    </HeaderSlotProvider>
    </TooltipProvider>
  )
}
