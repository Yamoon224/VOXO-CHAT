import { VoxoLimits } from './limits'

/**
 * Fenêtre glissante côté client, miroir du rate limit serveur.
 *
 * Le but n'est pas de protéger le serveur — il se protège déjà — mais d'éviter
 * un aller-retour perdu d'avance et d'afficher un message utile avant l'envoi.
 *
 * Rappel de `mobile/CONTRACT.md` : le rate limit serveur est indexé sur l'IP.
 * Derrière un NAT opérateur, un `429` peut donc survenir alors même que cette
 * fenêtre locale est loin d'être pleine. C'est une condition **transitoire**,
 * jamais un motif de renvoi automatique en boucle.
 */
export class VoxoRateLimiter {
  private readonly timestamps: number[] = []

  constructor(
    private readonly maxMessages: number = VoxoLimits.messagesPerMinute,
    private readonly windowMs: number = VoxoLimits.rateLimitWindowMs,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * Consomme un jeton. `false` si le quota de la fenêtre est atteint — dans ce
   * cas rien n'est consommé, un nouvel essai plus tard reste possible.
   */
  tryConsume(): boolean {
    this.prune()
    if (this.timestamps.length >= this.maxMessages) return false
    this.timestamps.push(this.now())
    return true
  }

  /**
   * Délai en millisecondes avant qu'un jeton se libère. `0` si un envoi est
   * possible immédiatement.
   */
  get cooldownMs(): number {
    this.prune()
    if (this.timestamps.length < this.maxMessages) return 0
    const elapsed = this.now() - this.timestamps[0]!
    return Math.max(0, this.windowMs - elapsed)
  }

  reset(): void {
    this.timestamps.length = 0
  }

  private prune(): void {
    const threshold = this.now() - this.windowMs
    while (this.timestamps.length > 0 && this.timestamps[0]! <= threshold) {
      this.timestamps.shift()
    }
  }
}
