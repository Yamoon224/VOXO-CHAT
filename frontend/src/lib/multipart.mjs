export function isFormDataBody(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData
}

export function removeJsonContentType(headers = {}) {
  if (typeof headers.setContentType === 'function') {
    headers.setContentType(undefined)
  }
  headers.delete?.('Content-Type')
  delete headers['Content-Type']
  delete headers['content-type']
  return headers
}

export function createFileFormData(file, metadata = {}) {
  if (!(file instanceof Blob)) {
    throw new Error('Le fichier sélectionné est invalide. Sélectionnez-le de nouveau.')
  }

  const fileName = typeof file.name === 'string' && file.name.trim()
    ? file.name
    : 'fichier'
  const formData = new FormData()
  formData.append('file', file, fileName)

  Object.entries(metadata).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    formData.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value))
  })
  return formData
}
