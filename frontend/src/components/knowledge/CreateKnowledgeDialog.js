'use client'

import { FileText, Upload, Globe, Network, Loader2, Plus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { formatNumber } from '@/lib/format.mjs'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { KnowledgeFileTab } from './KnowledgeFileTab'
import { KnowledgeSiteTab } from './KnowledgeSiteTab'

export function CreateKnowledgeDialog({
  isOpen,
  onOpenChange,
  createMethod,
  setCreateMethod,
  formData,
  setFormData,
  handleTagsChange,
  handleFilesSelected,
  handleRemoveFile,
  handleFileError,
  selectedFiles,
  uploadResults,
  urlInput,
  setUrlInput,
  handleCreate,
  uploading,
  crawlOptions,
  setCrawlOptions,
  crawlJob,
  crawlStarting
}) {
  const t = useTranslations('Knowledge')
  const locale = useLocale()
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
          <DialogDescription>
            {t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={createMethod} onValueChange={setCreateMethod} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="manual">
              <FileText className="h-4 w-4 mr-2" />
              {t('tabManual')}
            </TabsTrigger>
            <TabsTrigger value="file">
              <Upload className="h-4 w-4 mr-2" />
              {t('tabFile')}
            </TabsTrigger>
            <TabsTrigger value="url">
              <Globe className="h-4 w-4 mr-2" />
              {t('tabUrl')}
            </TabsTrigger>
            <TabsTrigger value="site">
              <Network className="h-4 w-4 mr-2" />
              {t('tabSite')}
            </TabsTrigger>
          </TabsList>

          {/* Formulaire de création manuelle */}
          <TabsContent value="manual" className="space-y-4">
            <div>
              <Label htmlFor="title">{t('fieldTitle')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t('fieldTitlePlaceholder')}
              />
            </div>
            
            <div>
              <Label htmlFor="content">{t('fieldContent')}</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder={t('fieldContentPlaceholder')}
                rows={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('fieldContentCount', { count: formatNumber(formData.content.length, locale) })}
              </p>
            </div>

            <div>
              <Label htmlFor="tags">{t('fieldTags')}</Label>
              <Input
                id="tags"
                value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
                onChange={(e) => handleTagsChange(e.target.value)}
                placeholder={t('fieldTagsPlaceholder')}
              />
            </div>
          </TabsContent>

          {/* Formulaire d'upload de fichier */}
          <TabsContent value="file">
            <KnowledgeFileTab
              formData={formData}
              setFormData={setFormData}
              handleTagsChange={handleTagsChange}
              selectedFiles={selectedFiles}
              onFilesSelected={handleFilesSelected}
              onRemoveFile={handleRemoveFile}
              onFileError={handleFileError}
              uploading={uploading}
              uploadResults={uploadResults}
            />
          </TabsContent>

          {/* Formulaire d'import depuis URL */}
          <TabsContent value="url" className="space-y-4">
            <div>
              <Label htmlFor="url">{t('fieldUrl')}</Label>
              <Input
                id="url"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://exemple.com/page"
              />
            </div>
            
            <div>
              <Label htmlFor="url-title">{t('fieldUrlTitle')}</Label>
              <Input
                id="url-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t('fieldUrlTitlePlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="url-tags">{t('fieldUrlTags')}</Label>
              <Input
                id="url-tags"
                value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
                onChange={(e) => handleTagsChange(e.target.value)}
                placeholder={t('fileTabTagsPlaceholder')}
              />
            </div>
          </TabsContent>

          {/* Crawl multi-pages d un domaine */}
          <TabsContent value="site">
            <KnowledgeSiteTab
              formData={formData}
              setFormData={setFormData}
              handleTagsChange={handleTagsChange}
              urlInput={urlInput}
              setUrlInput={setUrlInput}
              crawlOptions={crawlOptions}
              setCrawlOptions={setCrawlOptions}
              crawlJob={crawlJob}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={uploading || crawlStarting || (createMethod === 'file' && selectedFiles.length === 0)}
          >
            {uploading || crawlStarting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {createMethod === 'file' && t('uploading')}
                {createMethod === 'site' && t('starting')}
                {createMethod !== 'file' && createMethod !== 'site' && t('processing')}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {createMethod === 'site' ? t('startCrawl') : t('create')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
