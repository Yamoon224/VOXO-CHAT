'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'

export function LoginFooter() {
  const locale = useLocale()
  const t = useTranslations('Login')
  return <div className="flex flex-col gap-3 text-center text-sm"><Link href={`/${locale}/auth/forgot-password`} className="font-medium text-blue-600 hover:text-blue-500">{t('forgotPassword')}</Link><div><span className="text-slate-500">{t('noAccount')} </span><Link href={`/${locale}/auth/register`} className="font-semibold text-blue-600 hover:text-blue-500">{t('createAccount')}</Link></div></div>
}
