'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { formatNumber } from '@/lib/format.mjs'

export function ConversationsPagination({ pagination, setPagination }) {
  const t = useTranslations('Conversations')
  const locale = useLocale()
  const { page, pages, total } = pagination

  if (pages <= 1) return null

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pages) {
      setPagination(prev => ({ ...prev, page: newPage }))
    }
  }

  // Générer les numéros de page à afficher
  const getPageNumbers = () => {
    const pageNumbers = []
    const maxVisiblePages = 5

    if (pages <= maxVisiblePages) {
      for (let i = 1; i <= pages; i++) {
        pageNumbers.push(i)
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i)
        }
        pageNumbers.push('...')
        pageNumbers.push(pages)
      } else if (page >= pages - 2) {
        pageNumbers.push(1)
        pageNumbers.push('...')
        for (let i = pages - 3; i <= pages; i++) {
          pageNumbers.push(i)
        }
      } else {
        pageNumbers.push(1)
        pageNumbers.push('...')
        pageNumbers.push(page - 1)
        pageNumbers.push(page)
        pageNumbers.push(page + 1)
        pageNumbers.push('...')
        pageNumbers.push(pages)
      }
    }
    return pageNumbers
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t gap-4 bg-white">
      <div className="text-sm text-gray-500 order-2 sm:order-1">
        {t('paginationRange', {
          from: formatNumber(Math.min((page - 1) * 20 + 1, total), locale),
          to: formatNumber(Math.min(page * 20, total), locale),
          total: formatNumber(total, locale),
        })}
      </div>
      
      <div className="flex items-center space-x-1 order-1 sm:order-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((num, idx) => (
          num === '...' ? (
            <div key={`ellipsis-${idx}`} className="flex items-center justify-center w-8 h-8">
              <MoreHorizontal className="h-4 w-4 text-gray-400" />
            </div>
          ) : (
            <Button
              key={`page-${num}`}
              variant={page === num ? 'default' : 'outline'}
              size="sm"
              className={`h-8 w-8 p-0 ${page === num ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              onClick={() => handlePageChange(num)}
            >
              {num}
            </Button>
          )
        ))}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handlePageChange(page + 1)}
          disabled={page === pages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
