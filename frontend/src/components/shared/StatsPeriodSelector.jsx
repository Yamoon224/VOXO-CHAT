'use client'

import { useTranslations } from 'next-intl'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { STATS_PERIODS } from '@/lib/stats-periods.mjs'

/**
 * Sélecteur de fenêtre, partagé par `/admin/stats` et le tableau de bord
 * client. Il importe la liste depuis `lib/`, et non plus depuis le hook admin :
 * le tableau de bord client aurait dû charger un hook d'administration pour
 * afficher trois options.
 */
export function StatsPeriodSelector({ period, onChange, disabled }) {
  const t = useTranslations('Stats')
  return (
    <Select value={period} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {STATS_PERIODS.map((item) => (
          <SelectItem key={item.value} value={item.value}>{t(item.labelKey)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
