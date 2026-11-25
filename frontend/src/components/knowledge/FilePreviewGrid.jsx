'use client'

import { useEffect, useMemo } from 'react'
import Image from 'next/image'
import { FileText, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { knowledgeHelpers } from '@/lib/api-knowledge'
import { fileKey } from '@/lib/file-key.mjs'

function FilePreview({ file }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  if (file.type.startsWith('image/')) {
    return <Image src={url} alt="" width={320} height={80} unoptimized className="h-20 w-full rounded object-cover" />
  }
  if (file.type === 'application/pdf') {
    return <iframe title={file.name} src={`${url}#toolbar=0`} sandbox="" className="h-20 w-full rounded" />
  }
  return <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
}

export function FilePreviewGrid({ files, results = {}, onRemove, disabled }) {
  const t = useTranslations('Knowledge')
  if (!files.length) return null
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {files.map(file => {
        const key = fileKey(file)
        const result = results[key]
        return (
          <div key={key} className="rounded-md border p-2">
            <FilePreview file={file} />
            <div className="mt-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{knowledgeHelpers.formatFileSize(file.size)}</p>
                {result?.error && <p className="text-xs text-red-600">{result.error}</p>}
                {result?.success && <p className="text-xs text-green-600">{t('previewImported')}</p>}
                {result?.warning && <p className="text-xs text-amber-600">{result.warning}</p>}
              </div>
              <Button type="button" size="icon" variant="ghost" disabled={disabled} onClick={() => onRemove(file)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {result?.progress != null && !result.success && !result.error && (
              <Progress value={result.progress} className="mt-2 h-1" />
            )}
          </div>
        )
      })}
    </div>
  )
}
