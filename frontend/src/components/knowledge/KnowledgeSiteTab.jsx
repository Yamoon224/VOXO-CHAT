'use client'

import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CrawlProgress } from './CrawlProgress'

/**
 * Onglet « Site entier » du dialogue de création.
 * Extrait de CreateKnowledgeDialog, qui dépassait la limite de 250 lignes.
 */
export function KnowledgeSiteTab({
  formData,
  setFormData,
  handleTagsChange,
  urlInput,
  setUrlInput,
  crawlOptions,
  setCrawlOptions,
  crawlJob
}) {
  const t = useTranslations('Knowledge')
  const setOption = (key) => (event) => setCrawlOptions((prev) => ({
    ...prev,
    [key]: event.target.type === 'checkbox'
      ? event.target.checked
      : event.target.type === 'number'
        ? Number(event.target.value)
        : event.target.value
  }))

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="site-url">{t('siteUrl')}</Label>
        <Input
          id="site-url"
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://exemple.com"
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('siteUrlHint')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="site-max-pages">{t('siteMaxPages')}</Label>
          <Input
            id="site-max-pages"
            type="number"
            min={1}
            max={500}
            value={crawlOptions.maxPages}
            onChange={setOption('maxPages')}
          />
        </div>

        <div>
          <Label htmlFor="site-max-depth">{t('siteMaxDepth')}</Label>
          <Input
            id="site-max-depth"
            type="number"
            min={1}
            max={5}
            value={crawlOptions.maxDepth}
            onChange={setOption('maxDepth')}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="site-subdomains"
          type="checkbox"
          checked={crawlOptions.includeSubdomains}
          onChange={setOption('includeSubdomains')}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="site-subdomains" className="font-normal">
          {t('siteSubdomains')}
        </Label>
      </div>

      <div>
        <Label htmlFor="site-title">{t('siteTitlePrefix')}</Label>
        <Input
          id="site-title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder={t('siteTitlePrefixPlaceholder')}
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('siteTitlePrefixHint')}
        </p>
      </div>

      <div>
        <Label htmlFor="site-tags">{t('siteTags')}</Label>
        <Input
          id="site-tags"
          value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
          onChange={(e) => handleTagsChange(e.target.value)}
          placeholder={t('siteTagsPlaceholder')}
        />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
          {t('siteAdvanced')}
        </summary>
        <div className="mt-3">
          <Label htmlFor="site-sitemap">{t('siteSitemapUrl')}</Label>
          <Input
            id="site-sitemap"
            type="url"
            value={crawlOptions.sitemapUrl}
            onChange={setOption('sitemapUrl')}
            placeholder={t('siteSitemapPlaceholder')}
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('siteSitemapHint')}
          </p>
        </div>
      </details>

      {/* Avancement du crawl en direct */}
      <CrawlProgress job={crawlJob} />
    </div>
  )
}
