'use client'

import Link from 'next/link'
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForgotPasswordUI } from '@/hooks/use-forgot-password-ui'
import { useLocale, useTranslations } from 'next-intl'

export default function ForgotPasswordPage() {
  const t = useTranslations('AuthFlows')
  const locale = useLocale()
  const {
    shouldRender,
    submittedEmail,
    error,
    register,
    handleSubmit,
    errors,
    isSubmitting,
    onSubmit,
  } = useForgotPasswordUI()

  if (!shouldRender) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('forgotTitle')}</CardTitle>
            <CardDescription>
              {t('forgotDescription')}
            </CardDescription>
          </CardHeader>

          {submittedEmail ? (
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {t('forgotSent', { email: submittedEmail })}
                </AlertDescription>
              </Alert>
              <p className="text-sm text-gray-600">
                {t('checkSpam')}
              </p>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="vous@entreprise.com"
                    className={errors.email ? 'border-red-500' : ''}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>
              </CardContent>

              <CardFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('sending')}
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      {t('forgotSubmit')}
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

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
