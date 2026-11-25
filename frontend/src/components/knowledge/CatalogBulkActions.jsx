'use client'

import { Merge, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { catalogDeletePayload, toggleAllCatalogProducts } from '@/lib/catalog-selection.mjs'

export function CatalogBulkActions({ productIds, selectedIds, onSelectionChange, onMerge, onDelete }) {
  const t = useTranslations('Knowledge')
  const selectedCount = selectedIds.length
  const allSelected = productIds.length > 0 && selectedCount === productIds.length
  const remove = all => {
    const count = all ? productIds.length : selectedCount
    if (!count || !window.confirm(t('bulkDeleteConfirm', { count }))) return
    onDelete(catalogDeletePayload(selectedIds, all))
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
      <label className="mr-auto flex items-center gap-2 text-sm">
        <input type="checkbox" checked={allSelected} onChange={() => onSelectionChange(toggleAllCatalogProducts(productIds, selectedIds))} />
        {allSelected ? t('bulkDeselectAll') : t('bulkSelectAll')} ({selectedCount}/{productIds.length})
      </label>
      <Button disabled={selectedCount < 2} type="button" size="sm" variant="outline" onClick={onMerge}>
        <Merge className="mr-1 h-4 w-4" />{t('bulkMerge')}
      </Button>
      <Button disabled={!selectedCount} type="button" size="sm" variant="destructive" onClick={() => remove(false)}>
        <Trash2 className="mr-1 h-4 w-4" />{t('bulkDeleteSelection')}
      </Button>
      <Button disabled={!productIds.length} type="button" size="sm" variant="destructive" onClick={() => remove(true)}>
        <Trash2 className="mr-1 h-4 w-4" />{t('bulkDeleteAll')}
      </Button>
    </div>
  )
}
