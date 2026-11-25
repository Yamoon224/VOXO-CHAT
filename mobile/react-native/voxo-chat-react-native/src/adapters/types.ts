/**
 * Capacités natives dont le SDK a besoin, exprimées en interfaces.
 *
 * Le core ne fait **jamais** `import` d'un module natif : il reçoit ces
 * adaptateurs. C'est ce qui permet trois choses à la fois — que les tests
 * tournent sans React Native, qu'une application Expo apporte ses propres
 * modules, et qu'une application qui désactive les pièces jointes n'installe
 * aucun sélecteur de fichiers.
 */

/** Stockage clé/valeur persistant. Contrat d'AsyncStorage. */
export interface VoxoStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

/** Fichier retenu par le sélecteur, avant compression et validation. */
export interface VoxoPickedFile {
  /**
   * URI telle que le sélecteur l'a renvoyée. À transmettre **sans la
   * reconstruire** : `fetch` en React Native attend cette forme exacte dans un
   * `FormData`.
   */
  uri: string
  name: string
  /** Taille en octets. `undefined` si le sélecteur ne la connaît pas. */
  size?: number
  /** Type MIME annoncé. L'extension du nom fait autorité en cas de doute. */
  type?: string
}

export interface VoxoFilePicker {
  /**
   * Ouvre le sélecteur. Renvoie une liste vide si l'utilisateur annule — une
   * annulation n'est pas une erreur.
   *
   * @param limit nombre maximal de fichiers encore acceptés
   */
  pick(limit: number): Promise<VoxoPickedFile[]>
}

export interface VoxoImageCompressor {
  /**
   * Réduit une image avant envoi. Renvoie le fichier d'origine si la
   * compression ne s'applique pas ou ne fait rien gagner : la validation de
   * taille s'applique ensuite au résultat, quel qu'il soit.
   */
  compress(file: VoxoPickedFile): Promise<VoxoPickedFile>
}

export interface VoxoLinking {
  /**
   * Ouvre une URL déjà filtrée par `safeUrl`. Renvoie `false` si le système n'a
   * pas su l'ouvrir — ce n'est pas une condition exceptionnelle.
   */
  openUrl(url: string): Promise<boolean>
}

export interface VoxoAdapters {
  storage: VoxoStorage
  filePicker: VoxoFilePicker
  imageCompressor: VoxoImageCompressor
  linking: VoxoLinking
}

/**
 * Stockage en mémoire : repli quand la persistance est désactivée, et
 * implémentation utilisée par les tests.
 */
export function createMemoryStorage(): VoxoStorage {
  const entries = new Map<string, string>()
  return {
    async getItem(key) {
      return entries.get(key) ?? null
    },
    async setItem(key, value) {
      entries.set(key, value)
    },
    async removeItem(key) {
      entries.delete(key)
    },
  }
}
