/**
 * Erreur remontée par le SDK.
 *
 * `message` est **toujours** destiné à l'utilisateur final, en français. Quand
 * l'erreur vient du serveur, c'est le champ `error` de l'enveloppe relayé tel
 * quel : le backend le rédige déjà pour l'utilisateur (voir
 * `mobile/CONTRACT.md`). Le SDK ne compose un message que pour ce que le
 * serveur ne peut pas dire — perte de réseau, délai dépassé, validation locale.
 */
import { voxoText, type VoxoLocale } from '../i18n'
export class VoxoError extends Error {
  /**
   * Code métier du backend (`RATE_LIMIT_EXCEEDED`, `QUOTA_EXCEEDED`, …) ou code
   * local du SDK (`NETWORK_UNAVAILABLE`, `TIMEOUT`, `INVALID_CONFIG`).
   */
  readonly code?: string

  /** Statut HTTP quand l'erreur vient d'une réponse. `undefined` sinon. */
  readonly statusCode?: number

  constructor(message: string, options: { code?: string; statusCode?: number } = {}) {
    super(message)
    this.name = 'VoxoError'
    this.code = options.code
    this.statusCode = options.statusCode
    // Nécessaire pour que `instanceof` fonctionne après transpilation vers ES5.
    Object.setPrototypeOf(this, VoxoError.prototype)
  }

  /** Le serveur est injoignable : ni réponse, ni statut. */
  static network(locale: VoxoLocale = 'fr'): VoxoError {
    return new VoxoError(
      voxoText(locale, 'network'),
      { code: 'NETWORK_UNAVAILABLE' },
    )
  }

  /** Le délai d'attente local est dépassé avant toute réponse. */
  static timeout(locale: VoxoLocale = 'fr'): VoxoError {
    return new VoxoError(voxoText(locale, 'timeout'), { code: 'TIMEOUT' })
  }

  /** La réponse n'est pas l'enveloppe attendue (proxy, page d'erreur HTML…). */
  static malformedResponse(locale: VoxoLocale = 'fr'): VoxoError {
    return new VoxoError(voxoText(locale, 'malformed'), { code: 'MALFORMED_RESPONSE' })
  }

  /**
   * Trop de messages envoyés : condition transitoire, jamais un renvoi
   * automatique en boucle (le rate limit serveur est indexé sur l'IP, voir
   * `mobile/CONTRACT.md`).
   */
  get isRateLimited(): boolean {
    return this.code === 'RATE_LIMIT_EXCEEDED' || this.statusCode === 429
  }

  /** Le tenant a épuisé son quota : réessayer n'y changera rien. */
  get isQuotaExceeded(): boolean {
    return this.code === 'QUOTA_EXCEEDED'
  }

  /**
   * Ressource absente. Sur `GET /widget/conversation/:sessionId`, c'est le cas
   * normal d'une session neuve — à traiter comme « pas d'historique ».
   */
  get isNotFound(): boolean {
    return this.statusCode === 404
  }

  /** Le réseau a fait défaut : un retour de connexion peut suffire à réussir. */
  get isTransport(): boolean {
    return this.code === 'NETWORK_UNAVAILABLE' || this.code === 'TIMEOUT'
  }
}

/** Normalise une valeur interceptée en `VoxoError`. */
export function asVoxoError(error: unknown): VoxoError {
  if (error instanceof VoxoError) return error
  return VoxoError.network()
}
