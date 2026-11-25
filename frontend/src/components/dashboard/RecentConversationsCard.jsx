'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocale, useTranslations } from 'next-intl'

/** Trois dernières conversations, avec un raccourci vers la liste complète. */
export function RecentConversationsCard({ conversations = [] }) {
  const recent = conversations.slice(0, 3)
  const t = useTranslations('Dashboard')
  const locale = useLocale()

  return (
    <SurfaceCard className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('recentConversations')}</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${locale}/dashboard/conversations`}>
              {t('viewAll')}
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('noneYet')}
          </p>
        ) : (
          <div className="space-y-3">
            {recent.map((conversation) => (
              <div
                key={conversation.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {conversation.userEmail || t('anonymousUser')}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {conversation.summary || t('noContent')}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(conversation.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <Badge
                    variant={conversation.status === 'active' ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {conversation.status === 'active' ? t('active') : t('completed')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </SurfaceCard>
  )
}
