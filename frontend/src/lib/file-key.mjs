/** Identifie un fichier sélectionné sans confondre deux fichiers portant le même nom. */
export function fileKey(file) {
  return `${file?.name || ''}:${Number(file?.size || 0)}:${Number(file?.lastModified || 0)}`
}
