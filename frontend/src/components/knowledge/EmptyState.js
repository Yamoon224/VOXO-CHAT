'use client'

import { Brain, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function EmptyState({ filters, setIsCreateOpen }) {
  const t = useTranslations('Knowledge')
  return (
    <Card>
      <CardContent className="text-center py-12">
        <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('emptyTitle')}
        </h3>
        <p className="text-gray-600 mb-6">
          {filters.search || filters.sourceType ? t('emptyFiltered') : t('emptyDefault')}
        </p>
        {!filters.search && !filters.sourceType && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('createTitle')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
