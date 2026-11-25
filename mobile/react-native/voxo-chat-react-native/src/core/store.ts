/**
 * Store observable minimal.
 *
 * En Flutter, `VoxoController` étend `ChangeNotifier` — l'observabilité vient du
 * framework. Ici on ne peut pas s'appuyer sur React sans le faire entrer dans le
 * core, ce que `MOBILE.md` interdit. Ce store fournit donc le strict nécessaire,
 * dans la forme qu'attend `useSyncExternalStore` : `subscribe` + `getSnapshot`.
 *
 * L'instantané est un objet **remplacé** à chaque changement, jamais muté : c'est
 * la comparaison par référence qui déclenche le rendu côté React.
 */
export type VoxoUnsubscribe = () => void

export class VoxoStore<TSnapshot> {
  private snapshot: TSnapshot
  private readonly listeners = new Set<() => void>()
  private disposed = false

  constructor(initial: TSnapshot) {
    this.snapshot = initial
  }

  getSnapshot = (): TSnapshot => this.snapshot

  subscribe = (listener: () => void): VoxoUnsubscribe => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Remplace l'instantané et prévient les abonnés.
   *
   * Une requête lancée avant la mise au rebut peut aboutir après : notifier
   * alors n'aurait aucun sens, et rendrait un composant démonté.
   */
  setSnapshot(next: TSnapshot): void {
    if (this.disposed) return
    this.snapshot = next
    for (const listener of [...this.listeners]) listener()
  }

  /** Applique une transformation sur l'instantané courant. */
  update(mutate: (current: TSnapshot) => TSnapshot): void {
    if (this.disposed) return
    this.setSnapshot(mutate(this.snapshot))
  }

  get isDisposed(): boolean {
    return this.disposed
  }

  dispose(): void {
    this.disposed = true
    this.listeners.clear()
  }
}
