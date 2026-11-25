// frontend/src/app/dashboard/knowledge/page.js
'use client'

import { useState } from 'react'
import { Plus, PackagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { useKnowledgeUI } from '@/hooks/use-knowledge-ui'
import { usePermissions } from '@/hooks/use-permissions'
import { ReadOnlyHint } from '@/components/common/ReadOnlyHint'
import { StatsCards } from '@/components/knowledge/StatsCards'
import { KnowledgeFilters } from '@/components/knowledge/KnowledgeFilters'
import { KnowledgeItem } from '@/components/knowledge/KnowledgeItem'
import { CreateKnowledgeDialog } from '@/components/knowledge/CreateKnowledgeDialog'
import { EditKnowledgeDialog } from '@/components/knowledge/EditKnowledgeDialog'
import { ViewKnowledgeDialog } from '@/components/knowledge/ViewKnowledgeDialog'
import { EmptyState } from '@/components/knowledge/EmptyState'
import { DeleteKnowledgeDialog } from '@/components/knowledge/DeleteKnowledgeDialog'
import { CatalogDialog } from '@/components/knowledge/CatalogDialog'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { useTranslations } from 'next-intl'

export default function KnowledgePage() {
  const t = useTranslations('Knowledge')
  const [knowledgeToDelete, setKnowledgeToDelete] = useState(null)
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const { canWrite } = usePermissions()
  const canWriteKnowledge = canWrite('knowledge')
  const {
    knowledge,
    stats,
    currentPage,
    totalPages,
    filters,
    loading,
    searchLoading,
    regenerating,
    isCreateOpen,
    setIsCreateOpen,
    isEditOpen,
    setIsEditOpen,
    isViewOpen,
    setIsViewOpen,
    selectedItem,
    createMethod,
    setCreateMethod,
    formData,
    setFormData,
    urlInput,
    setUrlInput,
    selectedFiles,
    uploading,
    uploadResults,
    crawlOptions,
    setCrawlOptions,
    crawlJob,
    crawlStarting,
    handleCreate,
    handleCreateOpenChange,
    handleUpdate,
    handleView,
    handleEdit,
    handleDelete,
    handleFilesSelected,
    handleRemoveFile,
    handleFileError,
    handleTagsChange,
    handleExport,
    updateFilters,
    debouncedSearch,
    changePage,
    regenerateEmbeddings,
    duplicateKnowledge,
    archiveKnowledge
  } = useKnowledgeUI()

  if (loading) {
    return <PageSkeleton variant="table" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pageTitle')}</h1>
          <p className="text-gray-600">{t('pageDescription')}</p>
        </div>
        
        {/* Gardé ici plutôt que dans CreateKnowledgeDialog, déjà au-delà de la
            limite de 250 lignes. */}
        <div className="flex flex-wrap gap-2">
          <ReadOnlyHint active={!canWriteKnowledge}>
            <Button onClick={() => setIsCreateOpen(true)} disabled={!canWriteKnowledge}>
              <Plus className="h-4 w-4 mr-2" />{t('addKnowledge')}
            </Button>
          </ReadOnlyHint>
          <ReadOnlyHint active={!canWriteKnowledge}>
            <Button variant="outline" onClick={() => setIsCatalogOpen(true)} disabled={!canWriteKnowledge}>
              <PackagePlus className="h-4 w-4 mr-2" />{t('addCatalog')}
            </Button>
          </ReadOnlyHint>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <StatsCards 
        stats={stats} 
        regenerating={regenerating}
        onRegenerateEmbeddings={() => regenerateEmbeddings(false).catch(() => {})}
      />

      {/* Filtres de recherche */}
      <KnowledgeFilters
        filters={filters}
        updateFilters={updateFilters}
        debouncedSearch={debouncedSearch}
        searchLoading={searchLoading}
        onExport={handleExport}
      />

      {/* Grille des connaissances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {knowledge.map((item) => (
          <KnowledgeItem
            key={item.id}
            item={item}
            onView={handleView}
            onEdit={handleEdit}
            onDuplicate={(item) => duplicateKnowledge(item.id)}
            onArchive={(item, archive) => archiveKnowledge(item.id, archive)}
            onDelete={() => setKnowledgeToDelete(item)}
            canWrite={canWriteKnowledge}
          />
        ))}
      </div>

      {/* État vide */}
      {knowledge.length === 0 && !loading && (
        <EmptyState filters={filters} setIsCreateOpen={setIsCreateOpen} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            {t('pageOf', { current: currentPage, total: totalPages })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              {t('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {t('next')}
            </Button>
          </div>
        </div>
      )}

      {/* Modales */}
      <CreateKnowledgeDialog
        isOpen={isCreateOpen}
        onOpenChange={handleCreateOpenChange}
        createMethod={createMethod}
        setCreateMethod={setCreateMethod}
        formData={formData}
        setFormData={setFormData}
        handleTagsChange={handleTagsChange}
        handleFilesSelected={handleFilesSelected}
        handleRemoveFile={handleRemoveFile}
        handleFileError={handleFileError}
        selectedFiles={selectedFiles}
        uploadResults={uploadResults}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        handleCreate={handleCreate}
        uploading={uploading}
        crawlOptions={crawlOptions}
        setCrawlOptions={setCrawlOptions}
        crawlJob={crawlJob}
        crawlStarting={crawlStarting}
      />

      <EditKnowledgeDialog
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        formData={formData}
        setFormData={setFormData}
        handleTagsChange={handleTagsChange}
        handleUpdate={handleUpdate}
      />

      <ViewKnowledgeDialog
        isOpen={isViewOpen}
        onOpenChange={setIsViewOpen}
        selectedItem={selectedItem}
        handleEdit={handleEdit}
      />

      <DeleteKnowledgeDialog
        item={knowledgeToDelete}
        onOpenChange={(open) => {
          if (!open) setKnowledgeToDelete(null)
        }}
        onConfirm={handleDelete}
      />
      <CatalogDialog open={isCatalogOpen} onOpenChange={setIsCatalogOpen} />
    </div>
  )
}
