'use client'

import { MessageSquare, Star } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { formatNumber } from '@/lib/format.mjs'

export function ConversationsStats({ stats }) {
  const t = useTranslations('Conversations')
  const locale = useLocale()
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-blue-500 p-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-white/90">{t('statsTotal')}</p>
              <p className="text-2xl font-bold text-white">{formatNumber(stats.total, locale)}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-white/80" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-green-500 p-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-white/90">{t('statsActive')}</p>
              <p className="text-2xl font-bold text-white">{formatNumber(stats.active, locale)}</p>
            </div>
            <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
              <div className="h-3 w-3 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gray-600 p-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-white/90">{t('statsEnded')}</p>
              <p className="text-2xl font-bold text-white">{formatNumber(stats.ended, locale)}</p>
            </div>
            <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
              <div className="h-3 w-3 bg-white rounded-full"></div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-yellow-500 p-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-white/90">{t('statsAvgRating')}</p>
              <p className="text-2xl font-bold text-white">{formatNumber(stats.avgRating, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/5</p>
            </div>
            <Star className="h-8 w-8 text-white/80 fill-current" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
