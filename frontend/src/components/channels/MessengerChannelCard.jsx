'use client'

import { useTranslations } from 'next-intl'
import { Facebook } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/** Canal annoncé, pas encore raccordé : volontairement inerte et estompé. */
export function MessengerChannelCard() {
  const t = useTranslations('Channels')
  return (
    <Card className="opacity-60">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-blue-600 p-2 text-white">
            <Facebook className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>Messenger</CardTitle>
            <CardDescription>Facebook Messenger &amp; Instagram</CardDescription>
          </div>
          <Badge variant="outline" className="ml-auto">{t('comingSoon')}</Badge>
        </div>
      </CardHeader>
    </Card>
  )
}
