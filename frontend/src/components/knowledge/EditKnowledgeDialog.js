'use client'

import { Edit } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { formatNumber } from '@/lib/format.mjs'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function EditKnowledgeDialog({
  isOpen,
  onOpenChange,
  formData,
  setFormData,
  handleTagsChange,
  handleUpdate
}) {
  const t = useTranslations('Knowledge')
  const locale = useLocale()
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editTitle')}</DialogTitle>
          <DialogDescription>
            {t('editDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-title">{t('fieldTitle')}</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t('fieldTitlePlaceholder')}
            />
          </div>
          
          <div>
            <Label htmlFor="edit-content">{t('fieldContent')}</Label>
            <Textarea
              id="edit-content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder={t('fieldContentPlaceholder')}
              rows={10}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('fieldContentCount', { count: formatNumber(formData.content.length, locale) })}
            </p>
          </div>

          <div>
            <Label htmlFor="edit-tags">{t('editTags')}</Label>
            <Input
              id="edit-tags"
              value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder={t('fieldTagsPlaceholder')}
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleUpdate}>
            <Edit className="h-4 w-4 mr-2" />
            {t('update')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
