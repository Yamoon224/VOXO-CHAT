'use client'

import Link from 'next/link'
import {
  Menu,
  LogOut,
  User,
  Settings
} from 'lucide-react'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { useHeaderSlot } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useTranslations, useLocale } from 'next-intl'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'

export function Header({ user, setSidebarOpen, handleLogout }) {
  const t = useTranslations('Account')
  const locale = useLocale()
  // Cible du portail : c'est ici que chaque page projette ses contrôles
  // (période, actions), comme la maquette les place en haut plutôt que dans le
  // corps de la page.
  const { setContainer } = useHeaderSlot()

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
      {/* `flex-wrap` + hauteur minimale : sur petit écran les contrôles passent
          à la ligne au lieu de déborder. */}
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <button
          className="lg:hidden text-gray-500 hover:text-gray-700"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Emplacement d'actions. Remplace un champ de recherche qui n'avait ni
            état ni gestionnaire : il ne cherchait rien. */}
        <div ref={setContainer} className="flex min-w-0 flex-1 items-center gap-2" />

        {/* Right side */}
        <div className="flex flex-shrink-0 items-center space-x-4">
          <LanguageSwitcher />
          <NotificationBell />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100">
                <Avatar className="h-8 w-8">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('title')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/dashboard/settings?tab=profile`} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('profile')}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/dashboard/settings`} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('settings')}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
