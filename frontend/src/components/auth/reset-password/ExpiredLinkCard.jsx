import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale, useTranslations } from 'next-intl'

export function ExpiredLinkCard({ description }) {
  const t = useTranslations('AuthFlows')
  const locale = useLocale()
  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <CardTitle>{t('invalidLink')}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-gray-600">
          {t('resetLinkHint')}
        </p>
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/${locale}/auth/forgot-password`}>{t('requestNewLink')}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
