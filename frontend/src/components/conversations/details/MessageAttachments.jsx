'use client'

import { FileText, ImageIcon, Paperclip, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useAttachmentPreview } from '@/hooks/use-attachment-preview'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * Pièces jointes d'un message de conversation.
 * Le fichier n'est jamais servi directement : on demande au backend une URL
 * signée de courte durée au moment du clic.
 */
export function MessageAttachments({ attachments, isUser }) {
    const t = useTranslations('Conversations')
    const { loadingId, preview, openAttachment, closePreview } = useAttachmentPreview()

    if (!attachments?.length) return null

    return (
        <div className="flex flex-wrap gap-1.5 mb-2">
            {attachments.map((attachment) => (
                <button
                    key={attachment.id}
                    type="button"
                    onClick={() => openAttachment(attachment)}
                    disabled={loadingId === attachment.id}
                    title={t('attachmentOpen', { name: attachment.name })}
                    className={`inline-flex max-w-[200px] items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-opacity hover:opacity-80 disabled:opacity-50 ${
                        isUser ? 'border-white/30 bg-white/10' : 'border-gray-200 bg-gray-50'
                    }`}
                >
                    {attachment.category === 'image' && <ImageIcon className="h-8 w-8 text-blue-500" />}
                    {attachment.mimeType === 'application/pdf' && <FileText className="h-8 w-8 text-red-500" />}
                    {loadingId === attachment.id
                        ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                        : <Paperclip className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{attachment.name}</span>
                </button>
            ))}
            <Dialog open={Boolean(preview)} onOpenChange={open => !open && closePreview()}>
                <DialogContent className="max-w-4xl p-4">
                    <DialogHeader><DialogTitle className="pr-8">{preview?.attachment.name}</DialogTitle></DialogHeader>
                    {preview?.attachment.category === 'image'
                        ? <Image unoptimized width={1200} height={900} src={preview.url} alt={preview.attachment.name} className="max-h-[70vh] w-full object-contain" />
                        : <iframe title={preview?.attachment.name} src={preview?.url} className="h-[70vh] w-full rounded border" />}
                </DialogContent>
            </Dialog>
        </div>
    )
}
