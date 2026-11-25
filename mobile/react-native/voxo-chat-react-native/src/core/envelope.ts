import { VoxoError } from './errors'
import { voxoText, type VoxoLocale } from '../i18n'

/** Objet JSON arbitraire renvoyé par le backend. */
export type JsonObject = Record<string, unknown>

/**
 * Décodage de l'enveloppe uniforme du backend widget.
 *
 * Succès : `{"success": true, "data": {...}, "message": "…"}`
 * Erreur  : `{"success": false, "error": "…", "code": "…"}`
 *
 * C'est le **seul** point de parsing d'enveloppe du SDK : ni l'UI ni le client
 * ne doivent réinterpréter un corps de réponse brut.
 */
export function unwrapEnvelope(statusCode: number, body: string, locale: VoxoLocale = 'fr'): JsonObject {
  const decoded = decode(body)

  if (decoded === null) {
    // Un corps illisible sur une réponse en échec ne masque pas l'échec : on
    // retombe sur un message générique en conservant le statut HTTP.
    if (statusCode >= 400) {
      throw new VoxoError(fallbackMessage(statusCode, locale), {
        code: `HTTP_${statusCode}`,
        statusCode,
      })
    }
    throw VoxoError.malformedResponse(locale)
  }

  if (decoded.success === true) {
    const data = decoded.data
    return isJsonObject(data) ? data : {}
  }

  const error = decoded.error
  throw new VoxoError(
    typeof error === 'string' && error.length > 0 ? error : fallbackMessage(statusCode, locale),
    {
      code: typeof decoded.code === 'string' ? decoded.code : undefined,
      statusCode,
    },
  )
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Sous-objet d'une charge JSON, ou objet vide s'il est absent ou mal typé. */
export function objectAt(source: JsonObject, key: string): JsonObject {
  const value = source[key]
  return isJsonObject(value) ? value : {}
}

export function stringAt(source: JsonObject, key: string): string | undefined {
  const value = source[key]
  return typeof value === 'string' ? value : undefined
}

export function numberAt(source: JsonObject, key: string): number | undefined {
  const value = source[key]
  return typeof value === 'number' ? value : undefined
}

export function booleanAt(source: JsonObject, key: string, fallback: boolean): boolean {
  const value = source[key]
  return typeof value === 'boolean' ? value : fallback
}

export function stringArrayAt(source: JsonObject, key: string): string[] {
  const value = source[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function decode(body: string): JsonObject | null {
  if (body.length === 0) return null
  try {
    const parsed: unknown = JSON.parse(body)
    return isJsonObject(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Filet de sécurité : le backend renvoie normalement toujours un `error` rédigé
 * en français. On n'arrive ici que si un intermédiaire (proxy, passerelle) a
 * répondu à sa place.
 */
function fallbackMessage(statusCode: number, locale: VoxoLocale): string {
  if (statusCode === 429) {
    return voxoText(locale, 'rateLimited')
  }
  if (statusCode === 404) return voxoText(locale, 'notFound')
  if (statusCode >= 500) {
    return voxoText(locale, 'unavailable')
  }
  return voxoText(locale, 'genericError')
}
