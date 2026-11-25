'use client'

import {
  FileText,
  Upload,
  Globe,
  Brain,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Archive,
  Trash2,
  Tag,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslations } from 'next-intl'
import { knowledgeHelpers } from '@/lib/api-knowledge'
import { useFormatters } from '@/hooks/use-format'

// `canWrite` vient de la permission `knowledge`. Les actions restent affichées
// mais désactivées : le menu garde la même forme d'un membre à l'autre, et
// « Voir » reste toujours accessible.
export function KnowledgeItem({
  item,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  canWrite = true,
}) {
  const t = useTranslations('Knowledge')
  const { dateShort } = useFormatters()
  const getSourceBadge = (sourceType) => {
    const config = {
      manual: { color: 'bg-blue-100 text-blue-800', labelKey: 'filtersSourceManual', icon: FileText },
      upload: { color: 'bg-green-100 text-green-800', labelKey: 'filtersSourceUpload', icon: Upload },
      url: { color: 'bg-purple-100 text-purple-800', labelKey: 'filtersSourceUrl', icon: Globe },
      api: { color: 'bg-orange-100 text-orange-800', labelKey: 'filtersSourceApi', icon: Brain }
    }

    const { color, labelKey, icon: Icon } = config[sourceType] || config.manual
    return (
      <Badge className={color}>
        <Icon className="h-3 w-3 mr-1" />
        {t(labelKey)}
      </Badge>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{item.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              {getSourceBadge(item.sourceType)}
              {!item.isActive && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  <Archive className="h-3 w-3 mr-1" />
                  {t('itemArchived')}
                </Badge>
              )}
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(item)}>
                <Eye className="h-4 w-4 mr-2" />
                {t('itemView')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(item)} disabled={!canWrite}>
                <Edit className="h-4 w-4 mr-2" />
                {t('itemEdit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(item)} disabled={!canWrite}>
                <Copy className="h-4 w-4 mr-2" />
                {t('itemDuplicate')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onArchive(item, item.isActive)}
                disabled={!canWrite}
              >
                <Archive className="h-4 w-4 mr-2" />
                {item.isActive ? t('itemArchive') : t('itemUnarchive')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(item.id)}
                disabled={!canWrite}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('itemDelete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {knowledgeHelpers.truncateText(item.content, 150)}
        </p>

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <Tag className="h-2 w-2 mr-1" />
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{dateShort(item.updatedAt)}</span>
          <div className="flex items-center gap-1">
            {item.hasEmbedding ? (
              <CheckCircle className="h-3 w-3 text-green-600" />
            ) : (
              <AlertCircle className="h-3 w-3 text-orange-500" />
            )}
            <span>{item.hasEmbedding ? t('itemAiReady') : t('itemAiPending')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
