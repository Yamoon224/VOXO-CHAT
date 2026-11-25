'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileDropzone } from './FileDropzone'
import { FilePreviewGrid } from './FilePreviewGrid'
import { CatalogProductCard } from './CatalogProductCard'
import { CatalogCollectionActions } from './CatalogCollectionActions'
import { CatalogBulkActions } from './CatalogBulkActions'
import { CatalogSources } from './CatalogSources'
import { CatalogReviewGlobalAction } from './CatalogReviewGlobalAction'
import { useCatalog } from '@/hooks/use-catalog'
import { toggleCatalogProduct } from '@/lib/catalog-selection.mjs'
import { catalogSourceUrl } from '@/lib/catalog-source-url.mjs'
import { productsByReviewStatus, REVIEW_TABS } from '@/lib/catalog-review.mjs'

const STATUS_KEYS = { draft: 'catalogStatusDraft', published: 'catalogStatusPublished', archived: 'catalogStatusArchived' }

export function CatalogDialog({ open, onOpenChange }) {
  const t = useTranslations('Knowledge')
  const catalog = useCatalog(open)
  const [draft, setDraft] = useState({ name: '', category: '' })
  const [selectedProducts, setSelectedProducts] = useState([])
  const [reviewTab, setReviewTab] = useState('new')

  const create = async () => {
    try {
      await catalog.create(draft)
      setDraft({ name: '', category: '' })
    } catch {}
  }
  const toggleProduct = id => setSelectedProducts(previous => toggleCatalogProduct(previous, id))
  const merge = async () => {
    try {
      await catalog.mergeProducts(selectedProducts)
      setSelectedProducts([])
    } catch {}
  }
  const bulkDelete = async data => {
    try {
      await catalog.bulkDeleteProducts(data)
      setSelectedProducts([])
    } catch {}
  }
  const deleteOne = productId => {
    if (window.confirm(t('catalogDeleteProduct'))) {
      catalog.deleteProduct(productId).catch(() => {})
    }
  }
  const products = catalog.active?.products || []
  const groupedProducts = productsByReviewStatus(products)
  const visibleProducts = groupedProducts[reviewTab] || []
  const catalogLocked = catalog.active?.status !== 'draft'
  const openSource = async (assetId, pageNumber) => {
    try {
      const url = await catalog.getAssetUrl(assetId)
      window.open(catalogSourceUrl(url, pageNumber), '_blank', 'noopener,noreferrer')
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('catalogTitle')}</DialogTitle>
          <DialogDescription>{t('catalogDescription')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div><Label>{t('catalogName')}</Label><Input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></div>
          <div><Label>{t('catalogCategory')}</Label><Input value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })} /></div>
          <Button className="self-end" type="button" onClick={create}>{t('catalogCreate')}</Button>
        </div>
        {catalog.collections.length > 0 && (
          <select value={catalog.activeId || ''} onChange={event => {
            catalog.setActiveId(event.target.value)
            setSelectedProducts([])
            setReviewTab('new')
          }} className="w-full rounded-md border p-2">
            {catalog.collections.map(item => (
              <option key={item.id} value={item.id}>{item.name} — {STATUS_KEYS[item.status] ? t(STATUS_KEYS[item.status]) : item.status}</option>
            ))}
          </select>
        )}
        <CatalogCollectionActions key={catalog.activeId} catalog={catalog} />
        {catalog.active?.status === 'draft' && (
          <div className="space-y-3">
            <FileDropzone files={catalog.files} onFilesSelected={catalog.addFiles} onError={catalog.setSelectionError} disabled={catalog.busy} context="knowledge" />
            {catalog.selectionError && <p className="text-sm text-red-600">{catalog.selectionError}</p>}
            <FilePreviewGrid files={catalog.files} results={catalog.results} onRemove={catalog.removeFile} disabled={catalog.busy} />
            <Button type="button" disabled={!catalog.files.length || catalog.busy} onClick={catalog.importFiles}>{t('catalogAnalyzeFiles')}</Button>
          </div>
        )}
        <CatalogSources
          sources={catalog.active?.sources}
          disabled={catalogLocked || catalog.busy}
          onPreview={async id => {
            try {
              const url = await catalog.getAssetUrl(id)
              window.open(url, '_blank', 'noopener,noreferrer')
            } catch {}
          }}
          onReanalyze={id => catalog.reanalyzeSource(id).catch(() => {})}
        />
        {products.length > 0 && (
          <Tabs value={reviewTab} onValueChange={value => {
            setReviewTab(value)
            setSelectedProducts([])
          }}>
            <TabsList className="grid w-full grid-cols-3">
              {REVIEW_TABS.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {t(tab.labelKey)} ({groupedProducts[tab.value].length})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        {!catalogLocked && products.length > 0 && (
          <CatalogReviewGlobalAction
            status={reviewTab} count={visibleProducts.length} disabled={catalog.busy}
            onAction={action => catalog.reviewAllProducts(action).then(() => {
              setSelectedProducts([])
            }).catch(() => {})}
          />
        )}
        {!catalogLocked && reviewTab !== 'validated' && visibleProducts.length > 0 && (
          <CatalogBulkActions
            productIds={visibleProducts.map(product => product.id)}
            selectedIds={selectedProducts}
            onSelectionChange={setSelectedProducts}
            onMerge={merge}
            onDelete={bulkDelete}
          />
        )}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map(product => (
            <CatalogProductCard
              key={product.id} product={product} onSave={catalog.saveProduct}
              onDelete={deleteOne} onMove={catalog.moveProduct} onSplit={catalog.splitProduct}
              getAssetUrl={catalog.getAssetUrl} collections={catalog.collections}
              onOpenSource={openSource}
              onReopen={catalog.reopenProduct}
              reviewStatus={reviewTab} catalogLocked={catalogLocked}
              selected={selectedProducts.includes(product.id)} onSelect={toggleProduct}
            />
          ))}
        </div>
        {catalog.active?.status === 'draft' && products.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('catalogPublishHint', { count: products.length })}</p>
            <Button type="button" disabled={catalog.busy} onClick={() => catalog.publish().catch(() => {})}>{t('catalogPublish')}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
