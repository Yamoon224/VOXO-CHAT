'use client'

import { Edit, Tag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/use-format'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useKnowledgePreview } from '@/hooks/use-knowledge-preview'
import { OriginalFilePreview } from './OriginalFilePreview'

export function ViewKnowledgeDialog({
  isOpen,
  onOpenChange,
  selectedItem,
  handleEdit
}) {
  const t = useTranslations('Knowledge')
  const { dateTime } = useFormatters()
  const { preview, error } = useKnowledgePreview(selectedItem, isOpen)
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedItem?.title}</DialogTitle>
          <DialogDescription>
            {t('viewDescription')}
          </DialogDescription>
        </DialogHeader>

        {selectedItem && (
          <div className="space-y-4">
            <OriginalFilePreview preview={preview} error={error} />
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {selectedItem.fullContent || selectedItem.content}
              </p>
            </div>

            {selectedItem.sourceUrl && (
              <div>
                <Label>{t('viewSourceUrl')}</Label>
                <p className="text-sm text-blue-600 break-all">
                  <a href={selectedItem.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {selectedItem.sourceUrl}
                  </a>
                </p>
              </div>
            )}

            {selectedItem.tags && selectedItem.tags.length > 0 && (
              <div>
                <Label>{t('viewTags')}</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedItem.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <Label>{t('viewCreatedAt')}</Label>
                <p className="text-gray-600">
                  {dateTime(selectedItem.createdAt)}
                </p>
              </div>
              <div>
                <Label>{t('viewUpdatedAt')}</Label>
                <p className="text-gray-600">
                  {dateTime(selectedItem.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
          {selectedItem && (
            <Button onClick={() => {
              onOpenChange(false)
              handleEdit(selectedItem)
            }}>
              <Edit className="h-4 w-4 mr-2" />
              {t('itemEdit')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
