import { Eye, EyeOff } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'

export function ResetPasswordFields({ register, errors, showPassword, setShowPassword }) {
  const t = useTranslations('AuthFlows')
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="newPassword">{t('resetTitle')}</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={t('resetTitle')}
            {...register('newPassword')}
            className={errors.newPassword ? 'border-red-500 pr-10' : 'pr-10'}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={t(showPassword ? 'hidePassword' : 'showPassword')}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
        {errors.newPassword && (
          <p className="text-sm text-red-500">{errors.newPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmNewPassword">{t('confirmPassword')}</Label>
        <Input
          id="confirmNewPassword"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder={t('confirmPassword')}
          {...register('confirmNewPassword')}
          className={errors.confirmNewPassword ? 'border-red-500' : ''}
        />
        {errors.confirmNewPassword && (
          <p className="text-sm text-red-500">{errors.confirmNewPassword.message}</p>
        )}
      </div>
    </>
  )
}
