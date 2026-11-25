'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ExternalLink, Plus, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatPercent } from '@/lib/format.mjs'

const MISSING_KEYS = {
  title: 'productMissingTitle', sku: 'productMissingSku', price: 'productMissingPrice',
  currency: 'productMissingCurrency', description: 'productMissingDescription',
  specifications: 'productMissingSpecifications', image: 'productMissingImage',
}

function ExtractionBadge({ metadata = {}, reviewStatus }) {
  const t = useTranslations('Knowledge')
  if (reviewStatus === 'validated') {
    return <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">{t('productBadgeValidated')}</span>
  }
  if (reviewStatus === 'saved') {
    return <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">{t('productBadgeToValidate')}</span>
  }
  if (metadata.manuallyCorrected) {
    return <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">{t('productBadgeCorrected')}</span>
  }
  if (metadata.reviewRequired) {
    return <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">{t('productBadgeToCheck')}</span>
  }
  return <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">{t('productBadgeDetected')}</span>
}

function ConfidenceSummary({ confidence = {} }) {
  const t = useTranslations('Knowledge')
  const locale = useLocale()
  const values = [
    ['productConfidenceName', confidence.title],
    ['productConfidencePrice', confidence.price],
    ['productConfidenceSku', confidence.sku],
  ].filter(([, value]) => Number.isFinite(Number(value)))
  if (!values.length) return null
  return (
    <p className="text-xs text-muted-foreground">
      {values.map(([key, value]) => `${t(key)} ${formatPercent(Number(value) * 100, locale, { maximumFractionDigits: 0 })}`).join(' · ')}
    </p>
  )
}

function SpecificationsEditor({ value, onChange, disabled }) {
  const t = useTranslations('Knowledge')
  const update = (index, field, nextValue) => onChange(value.map((item, itemIndex) => (
    itemIndex === index ? { ...item, [field]: nextValue } : item
  )))
  const remove = index => onChange(value.filter((_, itemIndex) => itemIndex !== index))
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">{t('productSpecifications')}</p>
      {value.map((item, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-1">
          <Input disabled={disabled} value={item.name} placeholder={t('productSpecName')} onChange={event => update(index, 'name', event.target.value)} />
          <Input disabled={disabled} value={item.value} placeholder={t('productSpecValue')} onChange={event => update(index, 'value', event.target.value)} />
          <Button disabled={disabled} type="button" size="icon" variant="ghost" onClick={() => remove(index)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button disabled={disabled} type="button" size="sm" variant="ghost" onClick={() => onChange([...value, { name: '', value: '' }])}>
        <Plus className="mr-1 h-4 w-4" /> {t('productSpecAdd')}
      </Button>
    </div>
  )
}

export function CatalogProductCard({
  product, onSave, onDelete, onMove, onSplit, getAssetUrl,
  collections, selected, onSelect, onOpenSource, onReopen,
  reviewStatus = 'new', catalogLocked = false
}) {
  const t = useTranslations('Knowledge')
  const locked = catalogLocked || reviewStatus === 'validated'
  const [form, setForm] = useState({
    title: product.title || '',
    sku: product.sku || '',
    priceAmount: product.priceAmount || '',
    priceCurrency: product.priceCurrency || 'XOF',
    stockStatus: product.stockStatus || 'unknown',
    description: product.metadata?.description || '',
    specifications: product.metadata?.specifications || [],
  })
  const [previewUrl, setPreviewUrl] = useState(null)
  useEffect(() => {
    const assetId = product.assets?.[0]?.id
    if (assetId) getAssetUrl(assetId).then(setPreviewUrl).catch(() => {})
  }, [getAssetUrl, product.assets])
  const change = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }))

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        {!locked ? (
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={selected} onChange={() => onSelect(product.id)} />
            {t('productSelect')}
          </label>
        ) : <span />}
        <ExtractionBadge metadata={product.metadata} reviewStatus={reviewStatus} />
      </div>
      {previewUrl && <Image src={previewUrl} alt={form.title || t('productAlt')} width={480} height={160} unoptimized className="h-40 w-full rounded object-contain" />}
      <ConfidenceSummary confidence={product.metadata?.fieldConfidence} />
      {product.metadata?.missingFields?.length > 0 && (
        <p className="text-xs text-amber-700">
          {t('productMissingFields', { fields: product.metadata.missingFields
            .map(field => (MISSING_KEYS[field] ? t(MISSING_KEYS[field]) : field)).join(', ') })}
        </p>
      )}
      {product.metadata?.sourceAssetId && (
        <Button type="button" size="sm" variant="ghost" onClick={() => onOpenSource(
          product.metadata.sourceAssetId, product.metadata.sourcePage
        )}>
          <ExternalLink className="mr-1 h-4 w-4" />
          {product.metadata.sourcePage ? t('productViewSourcePage', { page: product.metadata.sourcePage }) : t('productViewSource')}
        </Button>
      )}
      <Input disabled={locked} name="title" value={form.title} onChange={change} placeholder={t('productName')} />
      <div className="grid grid-cols-2 gap-2">
        <Input disabled={locked} name="sku" value={form.sku} onChange={change} placeholder={t('productSku')} />
        <select disabled={locked} name="stockStatus" value={form.stockStatus} onChange={change} className="rounded-md border px-2 text-sm">
          <option value="unknown">{t('productStockUnknown')}</option>
          <option value="in_stock">{t('productStockIn')}</option>
          <option value="out_of_stock">{t('productStockOut')}</option>
        </select>
        <Input disabled={locked} name="priceAmount" type="number" min="0" value={form.priceAmount} onChange={change} placeholder={t('productPrice')} />
        <Input disabled={locked} name="priceCurrency" maxLength={3} value={form.priceCurrency} onChange={change} placeholder="XOF" />
      </div>
      <Textarea disabled={locked} name="description" value={form.description} onChange={change} placeholder={t('productDescription')} rows={3} />
      <SpecificationsEditor disabled={locked} value={form.specifications} onChange={specifications => setForm(previous => ({ ...previous, specifications }))} />
      {!locked && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onSave(product.id, form, 'save').catch(() => {})}>{t('productSave')}</Button>
          <Button type="button" size="sm" onClick={() => onSave(product.id, form, 'validate').catch(() => {})}>{t('productValidate')}</Button>
          {product.assets?.length > 1 && <Button type="button" size="sm" variant="outline" onClick={() => onSplit(product).catch(() => {})}>{t('productSplit')}</Button>}
          <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(product.id)}>{t('productDelete')}</Button>
        </div>
      )}
      {!catalogLocked && reviewStatus === 'validated' && (
        <Button type="button" size="sm" variant="outline"
          onClick={() => onReopen(product.id).catch(() => {})}>
          {t('productReopen')}
        </Button>
      )}
      {!locked && collections.length > 1 && (
        <select value={product.collectionId} onChange={event => onMove(product.id, event.target.value).catch(() => {})} className="w-full rounded-md border p-1 text-xs">
          {collections.filter(collection => collection.status === 'draft').map(collection => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
        </select>
      )}
    </div>
  )
}
