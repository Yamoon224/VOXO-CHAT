'use client'

import { LogIn, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { useLoginUI } from '@/hooks/use-login-ui'
import { LoginFormFields } from '@/components/auth/login/LoginFormFields'
import { LoginFooter } from '@/components/auth/login/LoginFooter'
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const t = useTranslations('Login')
  const { shouldRender, isLoading, error, showPassword, setShowPassword, register, handleSubmit, errors, isSubmitting, onSubmit } = useLoginUI()
  if (!shouldRender) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return <AuthLayout title={t('title')} subtitle={t('subtitle')} asideTitle={t('asideTitle')} asideText={t('asideText')}>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-5">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <LoginFormFields register={register} errors={errors} showPassword={showPassword} setShowPassword={setShowPassword} />
      </div>
      <div className="space-y-5 border-t border-slate-200 pt-6">
        <Button type="submit" className="h-12 w-full rounded-xl bg-[#2563EB] text-base font-semibold hover:bg-[#1d4fd8]" disabled={isSubmitting || isLoading}>
          {isSubmitting || isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />{t('submitting')}</> : <><LogIn className="mr-2 h-4 w-4" aria-hidden="true" />{t('submit')}</>}
        </Button>
        <LoginFooter />
      </div>
    </form>
  </AuthLayout>
}
