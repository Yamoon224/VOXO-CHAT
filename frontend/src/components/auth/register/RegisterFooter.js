import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'

export function RegisterFooter() {
  const locale = useLocale()
  const t = useTranslations('Register')
  return <div className="text-center text-sm"><span className="text-slate-500">{t('alreadyAccount')} </span><Link href={`/${locale}/auth/login`} className="font-semibold text-blue-600 hover:text-blue-500">{t('signIn')}</Link></div>
}
