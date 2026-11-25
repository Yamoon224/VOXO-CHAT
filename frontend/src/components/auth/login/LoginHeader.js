'use client'

import { LogIn } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function LoginHeader() {
  const t = useTranslations('Login')
  return (
    <div className="text-center">
      <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
        <LogIn className="h-6 w-6 text-white" />
      </div>
      <h2 className="mt-6 text-3xl font-bold text-gray-900">
        {t('title')}
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        {t('subtitle')}
      </p>
    </div>
  )
}
