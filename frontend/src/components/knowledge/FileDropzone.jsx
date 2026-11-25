'use client'

import { useCallback, useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  MAX_KNOWLEDGE_BATCH_BYTES,
  MAX_KNOWLEDGE_FILES,
  acceptAttribute,
  formatSize,
  prepareFile,
  validateKnowledgeBatch
} from '@/hooks/file-rules.mjs'

export function FileDropzone({ files = [], onFilesSelected, onError, disabled, context = 'knowledge' }) {
  const t = useTranslations('Knowledge')
  const tFiles = useTranslations('Files')
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const selectedBytes = files.reduce((sum, file) => sum + file.size, 0)
  const remainingBytes = Math.max(0, MAX_KNOWLEDGE_BATCH_BYTES - selectedBytes)

  const handleFiles = useCallback(async (fileList) => {
    const candidates = [...(fileList || [])]
    if (!candidates.length) return
    if (files.length + candidates.length > MAX_KNOWLEDGE_FILES) {
      onError?.(t('dropzoneTooMany', { max: MAX_KNOWLEDGE_FILES }))
      return
    }
    const uniqueCandidates = candidates.filter(candidate => !files.some(file => (
      file.name === candidate.name && file.size === candidate.size && file.lastModified === candidate.lastModified
    )))
    if (!uniqueCandidates.length) return onError?.(t('dropzoneDuplicates'))
    setPreparing(true)
    try {
      const prepared = await Promise.all(uniqueCandidates.map(file => prepareFile(file, context)))
      const invalid = prepared.find(result => !result.valid)
      if (invalid) return onError?.(tFiles(invalid.errorKey, invalid.errorValues))
      const additions = prepared.map((result, index) => ({
        file: result.file,
        originalSize: uniqueCandidates[index].size
      }))
      const batch = validateKnowledgeBatch([...files, ...additions.map(item => item.file)])
      if (!batch.valid) return onError?.(tFiles(batch.errorKey, batch.errorValues))
      onFilesSelected(additions)
    } finally {
      setPreparing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [context, files, onError, onFilesSelected, t, tFiles])

  const busy = disabled || preparing
  return (
    <div
      role="button"
      tabIndex={busy ? -1 : 0}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={event => {
        if ((event.key === 'Enter' || event.key === ' ') && !busy) inputRef.current?.click()
      }}
      onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => {
        event.preventDefault()
        setDragging(false)
        if (!busy) handleFiles(event.dataTransfer.files)
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed p-5 text-center',
        busy && 'cursor-not-allowed opacity-60',
        dragging && 'border-primary bg-primary/5'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptAttribute(context)}
        className="hidden"
        disabled={busy}
        onChange={event => handleFiles(event.target.files)}
      />
      {preparing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
      <p className="text-sm font-medium">{t('dropzoneHint')}</p>
      <p className="text-xs text-muted-foreground">{t('dropzoneLimits')}</p>
      <p className="text-xs font-medium">
        {t('dropzoneSelection', { selected: formatSize(selectedBytes), remaining: formatSize(remainingBytes) })}
      </p>
    </div>
  )
}
