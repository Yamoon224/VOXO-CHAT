/**
 * Traduit une erreur de pièce jointe en clé du namespace `Files`.
 *
 * Le module ne connaît pas la locale : le composant résout la clé via
 * `useTranslations('Files')`.
 */
export function attachmentErrorKey(error) {
  const code = error?.code
  const status = error?.status

  if (status === 404 || code === 'ATTACHMENT_NOT_FOUND' || code === 'FILE_NOT_FOUND') {
    return 'attachmentNotAvailable'
  }
  if (status === 403) return 'attachmentForbidden'
  if (status === 502 || status === 503 || code === 'STORAGE_ERROR' || code === 'STORAGE_NOT_CONFIGURED') {
    return 'attachmentStorageDown'
  }
  return 'attachmentUnavailable'
}
