'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import { useVerifyEmailUI } from '@/hooks/use-verify-email-ui'
import { VerifyingState, PendingState, ExpiredState } from '@/components/auth/verify-email/VerifyEmailStates'
import { useLocale, useTranslations } from 'next-intl'

function VerifyEmailContent() {
  const params = useSearchParams()
  const { status, error, email, isResending, deliveryFailed, alreadyPending, resend } = useVerifyEmailUI({
    token: params.get('token'),
    email: params.get('email'),
    sent: params.get('sent'),
    pending: params.get('pending'),
  })

  if (status === 'verifying') {
    return <VerifyingState />
  }

  if (status === 'expired') {
    return <ExpiredState error={error} isResending={isResending} onResend={resend} />
  }

  return (
    <PendingState
      email={email}
      error={error}
      isResending={isResending}
      deliveryFailed={deliveryFailed}
      alreadyPending={alreadyPending}
      onResend={resend}
    />
  )
}

export default function VerifyEmailPage() {
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
          <VerifyEmailContent />
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
