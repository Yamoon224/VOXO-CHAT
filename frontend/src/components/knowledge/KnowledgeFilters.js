'use client'

import { Search, Loader2, Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'

export function KnowledgeFilters({ 
  filters, 
  updateFilters, 
  debouncedSearch, 
  searchLoading,
  onExport 
}) {
  const t = useTranslations('Knowledge')
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col space-y-4">
          {/* Barre de recherche avec indicateur de chargement */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('filtersSearch')}
              value={filters.search}
              onChange={(e) => debouncedSearch(e.target.value)}
              className="pl-10"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
          
          {/* Filtres en ligne - Responsive */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Filtre par type de source */}
            <Select 
              value={filters.sourceType || "all"} 
              onValueChange={(value) => updateFilters({ sourceType: value === "all" ? "" : value })}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder={t('filtersSource')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filtersSourceAll')}</SelectItem>
                <SelectItem value="manual">{t('filtersSourceManual')}</SelectItem>
                <SelectItem value="upload">{t('filtersSourceUpload')}</SelectItem>
                <SelectItem value="url">{t('filtersSourceUrl')}</SelectItem>
                <SelectItem value="api">{t('filtersSourceApi')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtre par statut actif/inactif */}
            <Select 
              value={filters.isActive} 
              onValueChange={(value) => updateFilters({ isActive: value })}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder={t('filtersStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t('filtersStatusActive')}</SelectItem>
                <SelectItem value="false">{t('filtersStatusArchived')}</SelectItem>
                <SelectItem value="all">{t('filtersStatusAll')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtre de tri */}
            <Select 
              value={`${filters.sortBy}-${filters.sortOrder}`} 
              onValueChange={(value) => {
                const [field, order] = value.split('-')
                updateFilters({ sortBy: field, sortOrder: order })
              }}
            >
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder={t('filtersSortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-DESC">{t('filtersSortNewest')}</SelectItem>
                <SelectItem value="createdAt-ASC">{t('filtersSortOldest')}</SelectItem>
                <SelectItem value="updatedAt-DESC">{t('filtersSortUpdated')}</SelectItem>
                <SelectItem value="title-ASC">{t('filtersSortAZ')}</SelectItem>
                <SelectItem value="title-DESC">{t('filtersSortZA')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Bouton d'export */}
            <Button variant="outline" onClick={onExport} className="sm:ml-auto">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t('filtersExport')}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
