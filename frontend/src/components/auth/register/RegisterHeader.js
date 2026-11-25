import { useTranslations } from 'next-intl'
import { UserPlus } from 'lucide-react'

export function RegisterHeader() {
  const t = useTranslations('Register')
  return (
    <div className="text-center">
      <div className="mx-auto h-12 w-12 bg-green-600 rounded-xl flex items-center justify-center">
        <UserPlus className="h-6 w-6 text-white" />
      </div>
      <h2 className="mt-6 text-3xl font-bold text-gray-900">
        {t('headerTitle')}
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        {t('headerSubtitle')}
      </p>
    </div>
  )
}
