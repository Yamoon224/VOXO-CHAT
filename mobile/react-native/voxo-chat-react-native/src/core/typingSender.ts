export const TYPING_MAX_LENGTH = 500
export const TYPING_MIN_INTERVAL_MS = 200

export interface TypingSenderOptions {
  /** Fonction activée par le propriétaire ET prise en charge humaine. */
  isEligible: () => boolean
  /** Renvoie `false` si la trame n'a pas pu partir (socket fermé). */
  send: (text: string) => boolean
  clock?: () => number
  minIntervalMs?: number
}

/**
 * Aperçu de saisie : limite la cadence des trames `typing` (une toutes les
 * 200 ms au plus, le serveur ignore le reste) et garantit que la **dernière**
 * valeur arrive, y compris la chaîne vide qui efface l'aperçu chez le
 * conseiller. N'envoie rien tant que `isEligible` est faux : c'est une donnée
 * personnelle sensible.
 */
export class VoxoTypingSender {
  private lastSentAt = Number.NEGATIVE_INFINITY
  private lastText = ''
  private latest = ''
  private pending: ReturnType<typeof setTimeout> | null = null
  private readonly clock: () => number
  private readonly minIntervalMs: number

  constructor(private readonly options: TypingSenderOptions) {
    this.clock = options.clock ?? (() => Date.now())
    this.minIntervalMs = options.minIntervalMs ?? TYPING_MIN_INTERVAL_MS
  }

  submit(text: string): void {
    this.latest = text.slice(0, TYPING_MAX_LENGTH)
    if (!this.options.isEligible() || this.latest === this.lastText) return
    const wait = this.minIntervalMs - (this.clock() - this.lastSentAt)
    if (wait <= 0) {
      this.flush()
    } else if (this.pending === null) {
      this.pending = setTimeout(() => this.flush(), wait)
    }
  }

  private flush(): void {
    this.pending = null
    if (!this.options.isEligible() || this.latest === this.lastText) return
    // Une trame non envoyée n'est pas comptée comme envoyée : la prochaine
    // modification la rejouera.
    if (this.options.send(this.latest)) {
      this.lastText = this.latest
      this.lastSentAt = this.clock()
    }
  }

  dispose(): void {
    if (this.pending !== null) clearTimeout(this.pending)
    this.pending = null
  }
}
