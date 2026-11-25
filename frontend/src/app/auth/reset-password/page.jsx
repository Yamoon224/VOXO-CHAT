'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { KeyRound, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useResetPasswordUI } from '@/hooks/use-reset-password-ui'
import { ResetPasswordFields } from '@/components/auth/reset-password/ResetPasswordFields'
import { ExpiredLinkCard } from '@/components/auth/reset-password/ExpiredLinkCard'
import { useLocale, useTranslations } from 'next-intl'

function ResetPasswordForm() {
  const t = useTranslations('AuthFlows')
  const token = useSearchParams().get('token')
  const {
    hasToken,
    isLinkExpired,
    error,
    showPassword,
    setShowPassword,
    register,
    handleSubmit,
    errors,
    isSubmitting,
    onSubmit,
  } = useResetPasswordUI(token)

  if (!hasToken) {
    return <ExpiredLinkCard description={t('missingResetToken')} />
  }

  if (isLinkExpired) {
    return <ExpiredLinkCard description={error} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('resetTitle')}</CardTitle>
        <CardDescription>
          {t('resetDescription')}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <ResetPasswordFields
            register={register}
            errors={errors}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('loading')}
              </>
            ) : (
              <>
                <KeyRound className="mr-2 h-4 w-4" />
                {t('resetSubmit')}
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function ResetPasswordPage() {
  const t = useTranslations('AuthFlows')
  const locale = useLocale()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Suspense
          fallback={(
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        >
          <ResetPasswordForm />
        </Suspense>

        <div className="text-center text-sm">
          <Link
            href={`/${locale}/auth/login`}
            className="inline-flex items-center text-blue-600 hover:text-blue-500 font-medium"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}
