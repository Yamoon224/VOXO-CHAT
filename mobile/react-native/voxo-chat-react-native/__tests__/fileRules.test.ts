import {
  ALLOWED_EXTENSIONS,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_FILE_BYTES,
  categoryOf,
  formatSize,
  validateFile,
} from '../src/fileRules'
import { VoxoLimits } from '../src/core/limits'

/**
 * Ces attentes doivent rester alignées sur `shared/file-rules.mjs` : les
 * messages sont ceux que le widget web affiche déjà.
 */
describe('categoryOf', () => {
  it('classe les images', () => {
    expect(categoryOf('photo.PNG')).toBe('image')
    expect(categoryOf('scan.tiff')).toBe('image')
  })

  it('classe les documents', () => {
    expect(categoryOf('contrat.pdf')).toBe('document')
    expect(categoryOf('notes.md')).toBe('document')
  })

  it('refuse un format non pris en charge', () => {
    expect(categoryOf('archive.zip')).toBeNull()
    expect(categoryOf('sans-extension')).toBeNull()
  })
})

describe('validateFile', () => {
  it('accepte un fichier conforme', () => {
    const result = validateFile('photo.jpg', 500 * 1024)
    expect(result.isValid).toBe(true)
    expect(result.category).toBe('image')
    expect(result.error).toBeUndefined()
  })

  it('refuse un fichier vide', () => {
    expect(validateFile('photo.jpg', 0).error).toBe('Le fichier est vide.')
  })

  it('refuse un format non pris en charge en listant les formats acceptés', () => {
    const result = validateFile('archive.zip', 1024)
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/^Format non pris en charge/)
    expect(result.error).toContain('.pdf')
    expect(result.error).toContain('.png')
  })

  it('refuse un fichier trop lourd avec les deux tailles en français', () => {
    const result = validateFile('gros.pdf', 12 * 1024 * 1024)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('12,0 Mo')
    expect(result.error).toContain('10,0 Mo')
  })

  it('applique la limite annoncée par le serveur plutôt que la locale', () => {
    const result = validateFile('moyen.pdf', 3 * 1024 * 1024, 2 * 1024 * 1024)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('2,0 Mo')
  })
})

describe('formatSize', () => {
  it('formate en Mo avec une virgule décimale', () => {
    expect(formatSize(1536 * 1024)).toBe('1,5 Mo')
  })

  it('formate en Ko en dessous du mégaoctet', () => {
    expect(formatSize(320 * 1024)).toBe('320 Ko')
  })

  it('n’affiche jamais 0 Ko pour un fichier non vide', () => {
    expect(formatSize(12)).toBe('1 Ko')
  })
})

describe('extensions exposées aux sélecteurs', () => {
  it('sont sans point et couvrent images et documents', () => {
    expect(ALLOWED_EXTENSIONS).toContain('pdf')
    expect(ALLOWED_EXTENSIONS).toContain('png')
    expect(ALLOWED_EXTENSIONS.every((extension) => !extension.startsWith('.'))).toBe(true)
  })
})

it('les limites sont bien celles du backend', () => {
  expect(MAX_FILE_BYTES).toBe(10 * 1024 * 1024)
  expect(MAX_ATTACHMENTS_PER_MESSAGE).toBe(3)
  expect(VoxoLimits.maxMessageLength).toBe(2000)
  expect(VoxoLimits.messagesPerMinute).toBe(15)
})
