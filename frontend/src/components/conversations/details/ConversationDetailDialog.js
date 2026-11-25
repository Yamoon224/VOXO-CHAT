'use client'

import { Star, Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/hooks/use-format'
import { MessageBubble } from './MessageBubble'
import { CommercialRequestsPanel } from './CommercialRequestsPanel'

export function ConversationDetailDialog({
  isOpen,
  onOpenChange,
  selectedConversation
}) {
  const t = useTranslations('Conversations')
  const { dateTime } = useFormatters()
  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('statusActive')}</Badge>
    }
    if (status === 'escalated') {
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{t('statusEscalated')}</Badge>
    }
    return <Badge variant="secondary">{t('statusEnded')}</Badge>
  }

  const getRatingStars = (rating) => {
    if (!rating) return <span className="text-gray-400 text-sm">{t('notRated')}</span>

    return (
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">{t('ratingOutOf', { rating })}</span>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        {selectedConversation && (
          <div className="space-y-6">
            {/* Conversation Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">{t('columnUser')}</p>
                <p className="text-sm text-gray-900 font-medium">
                  {selectedConversation.userName || t('dialogAnonymous')}
                </p>
                {selectedConversation.userEmail && (
                  <p className="text-xs text-gray-500">{selectedConversation.userEmail}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{t('columnStatus')}</p>
                {getStatusBadge(selectedConversation.status)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{t('columnSatisfaction')}</p>
                {getRatingStars(selectedConversation.satisfactionRating)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{t('columnDuration')}</p>
                <p className="text-sm text-gray-600">
                  {selectedConversation.duration ?
                    `${Math.floor(selectedConversation.duration / 60)}:${(selectedConversation.duration % 60).toString().padStart(2, '0')}` :
                    t('inProgress')
                  }
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">{t('columnChannel')}</p>
                <p className="capitalize text-gray-600">{selectedConversation.channel || 'web'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">{t('dialogCreatedAt')}</p>
                <p className="text-gray-600">{dateTime(selectedConversation.createdAt)}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">{t('dialogLastActivity')}</p>
                <p className="text-gray-600">{dateTime(selectedConversation.updatedAt)}</p>
              </div>
            </div>

            <CommercialRequestsPanel requests={selectedConversation.commercialRequests} />

            {/* Messages */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{t('dialogMessagesCount', { count: selectedConversation.messages?.length || 0 })}</h4>
                {selectedConversation.summary && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {t('dialogSummary', { summary: selectedConversation.summary })}
                  </Badge>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto space-y-4 border rounded-lg p-4 bg-gray-50">
                {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                  selectedConversation.messages.map((message, index) => (
                    <MessageBubble key={message.id || index} message={message} />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 italic">
                    {t('messagesEmpty')}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('dialogClose')}
              </Button>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                {t('dialogExport')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
