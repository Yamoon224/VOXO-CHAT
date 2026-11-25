'use client'

import { LogOut, Menu } from 'lucide-react'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHeaderSlot } from '@/components/shared/PageHeader'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useTranslations } from 'next-intl'

export function AdminHeader({ admin, setSidebarOpen, onLogout }) {
  const t = useTranslations('Account')
  // Cible du portail : c'est ici que chaque page projette ses contrôles
  // (période, filtres), comme la maquette les place en haut plutôt que dans
  // le corps de la page.
  const { setContainer } = useHeaderSlot()

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
      {/* `flex-wrap` + hauteur minimale : sur petit écran les contrôles passent
          à la ligne au lieu de déborder. */}
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 px-4 sm:px-6 lg:px-8">
        <button
          className="lg:hidden text-gray-500 hover:text-gray-700"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>

        <div ref={setContainer} className="flex min-w-0 flex-1 items-center gap-2" />

        <LanguageSwitcher />
        <NotificationBell admin />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex flex-shrink-0 items-center space-x-2 hover:bg-gray-50">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-slate-900 text-white text-xs">
                  {admin?.firstName?.charAt(0)}{admin?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-700">
                  {admin?.firstName} {admin?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{admin?.email}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t('title')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
