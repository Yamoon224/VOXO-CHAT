'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { LABEL_COLORS, priorityConfig } from '@/lib/conversation-organization.mjs'

export function PriorityBadge({ priority, compact = false }) {
  const t = useTranslations('Conversations')
  const config = priorityConfig(priority)
  return <Badge variant="outline" className={`${config.className} ${compact ? 'px-1.5 py-0 text-[10px]' : ''} gap-1`}>
    <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />
    {t(config.labelKey)}
  </Badge>
}

export function LabelBadges({ labels = [], limit = 3 }) {
  const visible = labels.slice(0, limit)
  return <div className="flex min-w-0 flex-wrap gap-1">
    {visible.map(label => <Badge key={label.id} variant="outline" className={`${LABEL_COLORS[label.color] || LABEL_COLORS.slate} max-w-32 truncate rounded-full px-2.5 py-0.5 text-[10px] font-semibold shadow-none`}>{label.name}</Badge>)}
    {labels.length > limit && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">+{labels.length - limit}</Badge>}
  </div>
}
