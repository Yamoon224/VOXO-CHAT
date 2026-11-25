'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export function OriginalFilePreview({ preview, error }) {
  const t = useTranslations('Knowledge')
  if (error) return <p className="text-sm text-red-600">{t('previewUnavailable', { error })}</p>
  if (!preview) return null
  if (preview.mimeType?.startsWith('image/')) {
    return <Image src={preview.url} alt={preview.originalName || ''} width={900} height={500} unoptimized className="max-h-80 w-full rounded border object-contain" />
  }
  if (preview.mimeType === 'application/pdf') {
    return <iframe title={preview.originalName} src={preview.url} sandbox="" className="h-80 w-full rounded border" />
  }
  return <Button asChild variant="outline"><a href={preview.url} target="_blank" rel="noopener noreferrer">{t('previewOpenOriginal')}</a></Button>
}
