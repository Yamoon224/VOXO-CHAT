'use client'

import {
  User,
  MessageSquare,
  Clock,
  Eye,
  Download,
  Star,
  Globe,
  Send
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocale, useTranslations } from 'next-intl'
import { useTimeAgo } from '@/hooks/use-format'
import { formatDuration } from '@/lib/client-metadata.mjs'
import { LabelBadges, PriorityBadge } from './ConversationOrganizationBadges'

export function ConversationsTable({
  filteredConversations,
  handleViewDetails,
  handleExportDetails,
  selectedSessionIds = [],
  onToggleConversation,
  onToggleVisible,
}) {
  const t = useTranslations('Conversations')
  const locale = useLocale()
  const timeAgo = useTimeAgo()
  const allVisibleSelected = filteredConversations.length > 0 && filteredConversations.every(item => selectedSessionIds.includes(item.sessionId))
  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('statusActive')}</Badge>
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

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'telegram':
        return (
          <div className="flex items-center space-x-1 text-[#0088cc]">
            <Send className="h-4 w-4" />
            <span className="text-xs font-medium">Telegram</span>
          </div>
        )
      case 'whatsapp':
        return (
          <div className="flex items-center space-x-1 text-green-600">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-medium">WhatsApp</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center space-x-1 text-gray-500">
            <Globe className="h-4 w-4" />
            <span className="text-xs font-medium">{t('channelWeb')}</span>
          </div>
        )
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"><input type="checkbox" aria-label={t('selectVisible')} checked={allVisibleSelected} onChange={() => onToggleVisible(filteredConversations)} /></TableHead>
          <TableHead>{t('columnUser')}</TableHead>
          <TableHead>{t('columnChannel')}</TableHead>
          <TableHead>{t('columnSubject')}</TableHead>
          <TableHead>{t('columnStatus')}</TableHead>
          <TableHead>{t('columnOrganization')}</TableHead>
          <TableHead>{t('columnMessages')}</TableHead>
          <TableHead>{t('columnSatisfaction')}</TableHead>
          <TableHead>{t('columnDuration')}</TableHead>
          <TableHead>{t('columnCreatedAt')}</TableHead>
          <TableHead>{t('columnActions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredConversations.map((conversation) => (
          <TableRow
            key={conversation.id}
            className={`hover:bg-blue-50/30 cursor-pointer transition-colors group ${conversation.isUnread ? 'bg-blue-50/50' : ''}`}
            onClick={() => handleViewDetails(conversation)}
          >
            <TableCell onClick={event => event.stopPropagation()}><input type="checkbox" aria-label={t('selectOne', { name: conversation.title || conversation.sessionId })} checked={selectedSessionIds.includes(conversation.sessionId)} onChange={() => onToggleConversation(conversation.sessionId)} /></TableCell>
            <TableCell>
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold text-xs">
                    {conversation.userName ?
                      conversation.userName.charAt(0).toUpperCase() :
                      (conversation.userEmail ? conversation.userEmail.charAt(0).toUpperCase() : <User className="h-4 w-4" />)
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className={`text-sm truncate text-gray-900 group-hover:text-blue-600 transition-colors ${conversation.isUnread ? 'font-bold' : 'font-semibold'}`}>
                    {conversation.userName || conversation.userEmail || t('anonymousUser')}
                  </p>
                  {conversation.userName && conversation.userEmail && (
                    <p className="text-[10px] text-gray-500 truncate">
                      {conversation.userEmail}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 truncate font-mono">
                    {conversation.sessionId.substring(0, 8)}...
                  </p>
                </div>
              </div>
            </TableCell>

            <TableCell>
              {getChannelIcon(conversation.channel)}
            </TableCell>

            <TableCell>
              <div className="max-w-[180px] truncate text-xs text-gray-600 italic" title={conversation.summary}>
                "{conversation.title || conversation.summary || t('noSubject')}"
              </div>
            </TableCell>

            <TableCell>
              {getStatusBadge(conversation.status)}
            </TableCell>

            <TableCell><div className="space-y-1"><PriorityBadge priority={conversation.priority} compact /><LabelBadges labels={conversation.labels} limit={2} /></div></TableCell>

            <TableCell>
              <div className="flex items-center space-x-1">
                <Badge variant="outline" className="font-medium bg-gray-50">
                  <MessageSquare className="h-3 w-3 mr-1 text-gray-400" />
                  {conversation.messageCount || 0}
                </Badge>
              </div>
            </TableCell>

            <TableCell>
              {getRatingStars(conversation.satisfactionRating)}
            </TableCell>

            <TableCell>
              {conversation.duration ? (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(conversation.duration, locale)}</span>
                </div>
              ) : (
                <span className="text-gray-400 text-[10px] italic">{t('inProgress')}</span>
              )}
            </TableCell>

            <TableCell>
              <div className="text-[11px] text-gray-500">
                {timeAgo(conversation.createdAt)}
              </div>
            </TableCell>

            <TableCell onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => handleViewDetails(conversation)}
                  title={t('viewDetails')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => handleExportDetails(conversation)}
                  title={t('exportPdf')}
                >
                  <Download className="h-4 w-4" />
                </Button>

                {/* <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewDetails(conversation)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Voir les détails
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Exporter PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu> */}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
