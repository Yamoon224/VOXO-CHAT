'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'

// Le tableau de bord plateforme est la porte d'entrée de l'administration.
export default function AdminHomePage() {
  const router = useRouter()
  const locale = useLocale()

  useEffect(() => {
    router.replace(`/${locale}/admin/stats`)
  }, [router, locale])

  return null
}
