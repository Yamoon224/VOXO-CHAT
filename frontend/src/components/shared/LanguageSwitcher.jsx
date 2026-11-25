'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import useAuthStore from '@/stores/auth-store'
import useAdminAuthStore from '@/stores/admin-auth-store'
import { adminAuthAPI } from '@/lib/api-admin'

export function LanguageSwitcher({ className = '' }) {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('Locale')
  const user = useAuthStore(state => state.user)
  const updateProfile = useAuthStore(state => state.updateProfile)
  const admin = useAdminAuthStore(state => state.admin)

  const changeLocale = async (nextLocale) => {
    Cookies.set('NEXT_LOCALE', nextLocale, { expires: 365, sameSite: 'lax' })
    if (user) await updateProfile({
      firstName: user.firstName, lastName: user.lastName, email: user.email,
      preferredLocale: nextLocale,
    })
    if (admin) await adminAuthAPI.updateLocale(nextLocale)
    const parts = pathname.split('/')
    if (['fr', 'en'].includes(parts[1])) parts[1] = nextLocale
    else parts.splice(1, 0, nextLocale)
    router.push(`${parts.join('/')}${window.location.search}`)
    router.refresh()
  }

  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className="sr-only">{t('label')}</span>
      <select
        value={locale}
        onChange={(event) => changeLocale(event.target.value)}
        aria-label={t('label')}
        className="rounded-md border border-current/20 bg-transparent px-2 py-1"
      >
        <option className="text-black" value="fr">FR</option>
        <option className="text-black" value="en">EN</option>
      </select>
    </label>
  )
}
