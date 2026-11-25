'use client'

import { MessageSquare } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function EmptyState({ searchTerm, statusFilter }) {
  const t = useTranslations('Conversations')
  return (
    <div className="text-center py-12">
      <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {t('emptyTitle')}
      </h3>
      <p className="text-gray-600">
        {searchTerm || statusFilter !== 'all' ? t('emptyFiltered') : t('emptyDefault')}
      </p>
    </div>
  )
}
