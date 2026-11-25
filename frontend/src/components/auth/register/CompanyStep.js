import { useTranslations } from 'next-intl'
import { Building2 } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export function CompanyStep({ register, errors, control, subscriptionPlans }) {
  const t = useTranslations('Register')
  return (
    <>
      {/* Nom de l'entreprise */}
      <div className="space-y-2">
        <Label htmlFor="companyName">
          <Building2 className="inline w-4 h-4 mr-1" />
          {t('companyNameLabel')}
        </Label>
        <Input
          id="companyName"
          placeholder={t('companyNamePlaceholder')}
          {...register('companyName')}
          className={errors.companyName ? 'border-red-500' : ''}
        />
        {errors.companyName && (
          <p className="text-sm text-red-500">{errors.companyName.message}</p>
        )}
      </div>

      {/* Le site web de l'entreprise se renseigne dans Réglages > Entreprise :
          inutile à l'inscription, il ne servait qu'à bloquer le parcours. */}

      {/* Sous-domaine */}
      <div className="space-y-2">
        <Label htmlFor="subdomain">{t('subdomainLabel')}</Label>
        <div className="flex">
          <Input
            id="subdomain"
            placeholder={t('subdomainPlaceholder')}
            {...register('subdomain')}
            className={`rounded-r-none ${errors.subdomain ? 'border-red-500' : ''}`}
          />
          <div className="px-3 py-2 bg-gray-50 border border-l-0 rounded-r-md text-sm text-gray-500">
            .chatbot.com
          </div>
        </div>
        {errors.subdomain && (
          <p className="text-sm text-red-500">{errors.subdomain.message}</p>
        )}
      </div>

      {/* Plan d'abonnement */}
      <div className="space-y-2">
        <Label>{t('planLabel')}</Label>
        {/* Le Select n'est pas un input natif : sans Controller le champ n'est
            jamais monté dans react-hook-form et `trigger` porte sur du vide. */}
        <Controller
          name="subscriptionPlan"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('planPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {subscriptionPlans.map((plan) => (
                  <SelectItem key={plan.value} value={plan.value}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{plan.label}</div>
                        <div className="text-xs text-gray-500">{plan.description}</div>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {plan.price}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </>
  )
}
