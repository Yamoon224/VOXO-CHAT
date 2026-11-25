'use client'

import { useState } from 'react'
import { Archive, RefreshCw, Save, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CatalogCollectionActions({ catalog }) {
  const t = useTranslations('Knowledge')
  const [form, setForm] = useState({
    name: catalog.active?.name || '', category: catalog.active?.category || '',
  })
  if (!catalog.active) return null
  const save = () => catalog.updateCollection(form).catch(() => {})
  const archive = () => {
    const count = catalog.active.products?.length || 0
    if (window.confirm(t('collectionArchiveConfirm', { name: catalog.active.name, count }))) {
      catalog.archive().catch(() => {})
    }
  }
  const purge = () => {
    const name = window.prompt(t('collectionPurgeConfirm', { name: catalog.active.name }))
    if (name != null) catalog.purge(name).catch(() => {})
  }
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div><Label>{t('collectionName')}</Label><Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></div>
        <div><Label>{t('catalogCategory')}</Label><Input disabled={catalog.active.status !== 'draft'} value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} /></div>
        <Button className="self-end" type="button" variant="outline" onClick={save}><Save className="mr-1 h-4 w-4" />{t('collectionSave')}</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {catalog.active.status !== 'archived' && (
          <Button type="button" variant="outline" onClick={archive}><Archive className="mr-1 h-4 w-4" />{t('collectionArchive')}</Button>
        )}
        {catalog.active.status === 'archived' && (
          <>
            <Button type="button" variant="outline" onClick={() => catalog.restore().catch(() => {})}><RefreshCw className="mr-1 h-4 w-4" />{t('collectionRestore')}</Button>
            <Button type="button" variant="destructive" onClick={purge}><Trash2 className="mr-1 h-4 w-4" />{t('collectionPurge')}</Button>
          </>
        )}
      </div>
    </div>
  )
}
