'use client'

import { Search, Tag, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LABEL_COLORS, PRIORITIES } from '@/lib/conversation-organization.mjs'

function FilterSelect({ value, onChange, placeholder, children, className = 'w-40' }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger className={className}><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{children}</SelectContent></Select>
}

function LabelFilter({ labels, value, onChange }) {
  const t = useTranslations('Conversations')
  const selected = labels.filter(label => value.includes(label.id))
  const toggle = id => onChange(value.includes(id) ? value.filter(item => item !== id) : [...value, id])
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="h-10 min-w-44 max-w-72 justify-between gap-2 px-3"><span className="flex min-w-0 items-center gap-1.5"><Tag className="h-4 w-4 shrink-0 text-muted-foreground" />{selected.length ? <span className="flex min-w-0 gap-1 overflow-hidden">{selected.slice(0, 2).map(label => <span key={label.id} className={`max-w-24 truncate rounded-full border px-2 py-0.5 text-xs ${LABEL_COLORS[label.color]}`}>{label.name}</span>)}{selected.length > 2 && <span className="text-xs text-muted-foreground">+{selected.length - 2}</span>}</span> : <span>{t('filterLabels')}</span>}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64"><DropdownMenuLabel className="flex items-center justify-between">{t('filterByLabel')} {value.length > 0 && <button type="button" onClick={() => onChange([])} className="inline-flex items-center gap-1 text-xs font-normal text-blue-600"><X className="h-3 w-3" />{t('filterClear')}</button>}</DropdownMenuLabel><DropdownMenuSeparator />{labels.length === 0 ? <p className="px-2 py-3 text-sm text-muted-foreground">{t('filterNoLabels')}</p> : labels.map(label => <DropdownMenuCheckboxItem key={label.id} checked={value.includes(label.id)} onSelect={event => event.preventDefault()} onCheckedChange={() => toggle(label.id)} className={`my-0.5 ${LABEL_COLORS[label.color]} focus:!brightness-95`}>{label.name}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>
}

export function ConversationsFilters({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter, labelFilter, setLabelFilter, unreadFilter, setUnreadFilter, labels = [], sortBy, sortOrder, setSortBy, setSortOrder }) {
  const t = useTranslations('Conversations')
  return <Card><CardContent className="pt-6"><div className="flex flex-col gap-4 xl:flex-row">
    <div className="min-w-56 flex-1"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input placeholder={t('searchPlaceholder')} value={searchTerm} onChange={event => setSearchTerm(event.target.value)} className="pl-10" /></div></div>
    <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder={t('filterStatus')}><SelectItem value="all">{t('filterStatusAll')}</SelectItem><SelectItem value="active">{t('filterStatusActive')}</SelectItem><SelectItem value="ended">{t('filterStatusEnded')}</SelectItem></FilterSelect>
    <FilterSelect value={priorityFilter} onChange={setPriorityFilter} placeholder={t('filterPriority')}><SelectItem value="all">{t('filterPriorityAll')}</SelectItem>{Object.entries(PRIORITIES).map(([value, item]) => <SelectItem key={value} value={value}><span className="flex items-center gap-2"><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} />{t(item.labelKey)}</span></SelectItem>)}</FilterSelect>
    <LabelFilter labels={labels} value={labelFilter} onChange={setLabelFilter} />
    <button type="button" onClick={() => setUnreadFilter(!unreadFilter)} className={`rounded-md border px-3 text-sm ${unreadFilter ? 'border-blue-600 bg-blue-50 text-blue-700' : 'bg-white'}`}>{t('filterUnread')}</button>
    <FilterSelect value={`${sortBy}-${sortOrder}`} onChange={value => { const index = value.lastIndexOf('-'); setSortBy(value.slice(0, index)); setSortOrder(value.slice(index + 1)) }} placeholder={t('sortBy')} className="w-52"><SelectItem value="updatedAt-desc">{t('sortLatestActivity')}</SelectItem><SelectItem value="updatedAt-asc">{t('sortOldestActivity')}</SelectItem><SelectItem value="priority-desc">{t('sortPriorityDesc')}</SelectItem><SelectItem value="priority-asc">{t('sortPriorityAsc')}</SelectItem></FilterSelect>
  </div></CardContent></Card>
}
