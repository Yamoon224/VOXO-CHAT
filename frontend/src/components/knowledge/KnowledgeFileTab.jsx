'use client'

import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { FileDropzone } from './FileDropzone'
import { FilePreviewGrid } from './FilePreviewGrid'

export function KnowledgeFileTab({
  formData,
  setFormData,
  handleTagsChange,
  selectedFiles,
  onFilesSelected,
  onRemoveFile,
  onFileError,
  uploading,
  uploadResults
}) {
  const t = useTranslations('Knowledge')
  return (
    <div className="space-y-4">
      <div>
        <Label>{t('fileTabFiles')}</Label>
        <div className="mt-1.5 space-y-3">
          <FileDropzone
            files={selectedFiles}
            onFilesSelected={onFilesSelected}
            onError={onFileError}
            disabled={uploading}
            context="knowledge"
          />
          <FilePreviewGrid
            files={selectedFiles}
            results={uploadResults}
            onRemove={onRemoveFile}
            disabled={uploading}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="file-title">{t('fileTabTitle')}</Label>
        <Input
          id="file-title"
          value={formData.title}
          onChange={event => setFormData(previous => ({ ...previous, title: event.target.value }))}
          placeholder={t('fileTabTitlePlaceholder')}
          disabled={selectedFiles.length > 1}
        />
      </div>
      <div>
        <Label htmlFor="file-tags">{t('fileTabTags')}</Label>
        <Input
          id="file-tags"
          value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
          onChange={event => handleTagsChange(event.target.value)}
          placeholder={t('fileTabTagsPlaceholder')}
        />
      </div>
    </div>
  )
}
