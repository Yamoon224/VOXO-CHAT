'use client'

import { useState } from 'react'
import { Palette, Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LabelBadges, PriorityBadge } from '../ConversationOrganizationBadges'
import { LABEL_COLORS, LABEL_COLOR_KEYS, PRIORITIES, priorityConfig } from '@/lib/conversation-organization.mjs'

const COLORS = Object.keys(LABEL_COLORS)

export function ConversationOrganizationPanel({ conversation, organization }) {
  const t = useTranslations('Conversations')
  const [name, setName] = useState('')
  const [color, setColor] = useState('blue')
  if (!organization) return null
  const selected = new Set((conversation.labels || []).map(label => label.id))
  const toggle = id => organization.assignLabels(conversation.sessionId,
    selected.has(id) ? [...selected].filter(item => item !== id) : [...selected, id])
  const rename = async label => {
    const value = window.prompt(t('organizationRenamePrompt'), label.name)
    if (value?.trim() && await organization.updateLabel(label.id, { name: value.trim() })) {
      await organization.assignLabels(conversation.sessionId, [...selected])
    }
  }
  const nextColor = label => COLORS[(COLORS.indexOf(label.color) + 1) % COLORS.length]
  const recolor = async label => {
    if (await organization.updateLabel(label.id, { color: nextColor(label) })) {
      await organization.assignLabels(conversation.sessionId, [...selected])
    }
  }
  const remove = async label => {
    if (window.confirm(t('organizationDeleteConfirm', { name: label.name })) && await organization.deleteLabel(label.id)) {
      await organization.assignLabels(conversation.sessionId, [...selected].filter(id => id !== label.id))
    }
  }
  const create = async event => {
    event.preventDefault()
    if (!name.trim()) return
    const label = await organization.createLabel({ name: name.trim(), color })
    if (label) { setName(''); await organization.assignLabels(conversation.sessionId, [...selected, label.id]) }
  }
  const priorityValue = conversation.priority?.source === 'manual' ? conversation.priority.value : 'auto'
  return <section className="space-y-4" aria-label={t('organizationLabel')}>
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase text-gray-400">{t('organizationPriority')}</span>
        <PriorityBadge priority={conversation.priority} compact />
      </div>
      <Select value={priorityValue} onValueChange={value => organization.updatePriority(conversation.sessionId, value === 'auto' ? null : value)}>
        <SelectTrigger aria-label={t('organizationPriorityAria')} className={`h-9 text-xs font-medium ${priorityConfig(conversation.priority).className}`}><SelectValue /></SelectTrigger>
        <SelectContent>{<SelectItem value="auto"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-500" />{t('priorityAuto')}</span></SelectItem>}{Object.entries(PRIORITIES).map(([value, item]) => <SelectItem key={value} value={value}><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${item.dot}`} />{t(item.labelKey)}</span></SelectItem>)}</SelectContent>
      </Select>
      {conversation.priority?.reason && <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{conversation.priority.reason}</p>}
    </div>
    <div className="border-t pt-4">
      <span className="text-[10px] font-bold uppercase text-gray-400">{t('organizationLabels')}</span>
      <div className="my-2"><LabelBadges labels={conversation.labels} limit={10} /></div>
      <div className="max-h-36 space-y-1 overflow-y-auto">
        {organization.labels.map(label => <div key={label.id} className="flex items-center gap-1 rounded-md px-1 py-1 hover:bg-white">
          <input type="checkbox" aria-label={t('organizationLabelAria', { name: label.name })} checked={selected.has(label.id)} disabled={!selected.has(label.id) && selected.size >= 10} onChange={() => toggle(label.id)} />
          <button type="button" title={t('organizationRename')} onClick={() => rename(label)} className={`min-w-0 flex-1 truncate rounded-full border px-2 py-0.5 text-left text-[11px] ${LABEL_COLORS[label.color]}`}>{label.name}</button>
          <button type="button" title={t('organizationNextColor', { color: t(LABEL_COLOR_KEYS[nextColor(label)]) })} onClick={() => recolor(label)} className={`flex h-6 w-6 items-center justify-center rounded border ${LABEL_COLORS[label.color]}`}><Palette className="h-3 w-3" /><span className="sr-only">{t('organizationChangeColor')}</span></button>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-600" onClick={() => remove(label)}><Trash2 className="h-3 w-3" /></Button>
        </div>)}
      </div>
      <form onSubmit={create} className="mt-2 flex gap-1">
        <Input maxLength={40} value={name} onChange={event => setName(event.target.value)} placeholder={t('organizationNewLabel')} className="h-8 text-xs" />
        <Select value={color} onValueChange={setColor}><SelectTrigger aria-label={t('organizationColor')} className={`h-8 w-28 rounded-full text-xs ${LABEL_COLORS[color]}`}><SelectValue /></SelectTrigger><SelectContent>{COLORS.map(item => <SelectItem key={item} value={item} className={`-mx-1 my-0 rounded-none ${LABEL_COLORS[item]} focus:!brightness-95 data-[state=checked]:ring-1 data-[state=checked]:ring-current`}>{t(LABEL_COLOR_KEYS[item])}</SelectItem>)}</SelectContent></Select>
        <Button type="submit" size="icon" className="h-8 w-8" disabled={!name.trim() || organization.labels.length >= 50}><Plus className="h-3 w-3" /><span className="sr-only">{t('organizationCreate')}</span></Button>
      </form>
    </div>
  </section>
}
