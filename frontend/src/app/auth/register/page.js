'use client'

import { useTranslations } from 'next-intl'
import { UserPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { useRegisterUI } from '@/hooks/use-register-ui'
import { StepIndicator } from '@/components/auth/register/StepIndicator'
import { CompanyStep } from '@/components/auth/register/CompanyStep'
import { AccountStep } from '@/components/auth/register/AccountStep'
import { RegisterFooter } from '@/components/auth/register/RegisterFooter'

export default function RegisterPage() {
  const t = useTranslations('Register')
  const { shouldRender, isLoading, error, currentStep, showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword, register, handleSubmit, control, errors, isSubmitting, onSubmit, nextStep, prevStep, subscriptionPlans } = useRegisterUI()
  if (!shouldRender) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return <AuthLayout title={currentStep === 1 ? t('detailsTitle') : t('accountTitle')} subtitle={currentStep === 1 ? t('detailsSubtitle') : t('accountSubtitle')} asideTitle={currentStep === 1 ? t('asideTitleDetails') : t('asideTitleAccount')} asideText={currentStep === 1 ? t('asideTextDetails') : t('asideTextAccount')} asideVariant={currentStep === 1 ? 'contacts' : 'chat'}>
    <div className="space-y-7">
      <StepIndicator currentStep={currentStep} />
      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('stepLabel', { current: currentStep })}</p><h2 className="mt-2 text-lg font-semibold text-slate-900">{currentStep === 1 ? t('companyInfoTitle') : t('accountInfoTitle')}</h2><p className="mt-1 text-sm text-slate-500">{currentStep === 1 ? t('companyInfoSubtitle') : t('accountInfoSubtitle')}</p></div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-5">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {currentStep === 1 ? <CompanyStep register={register} errors={errors} control={control} subscriptionPlans={subscriptionPlans} /> : <AccountStep register={register} errors={errors} showPassword={showPassword} setShowPassword={setShowPassword} showConfirmPassword={showConfirmPassword} setShowConfirmPassword={setShowConfirmPassword} />}
        </div>
        <div className="flex flex-col space-y-5 border-t border-slate-200 pt-6">
          <div className="flex w-full gap-4">
            {currentStep === 2 && <Button type="button" variant="outline" onClick={prevStep} className="h-12 flex-1 rounded-xl">{t('previous')}</Button>}
            {currentStep === 1 ? <Button type="button" onClick={nextStep} className="h-12 flex-1 rounded-xl bg-[#2563EB] hover:bg-[#1d4fd8]">{t('next')}</Button> : <Button type="submit" className="h-12 flex-1 rounded-xl bg-[#2563EB] hover:bg-[#1d4fd8]" disabled={isSubmitting || isLoading}>{isSubmitting || isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('submitting')}</> : <><UserPlus className="mr-2 h-4 w-4" />{t('submit')}</>}</Button>}
          </div>
          <RegisterFooter />
        </div>
      </form>
    </div>
  </AuthLayout>
}
