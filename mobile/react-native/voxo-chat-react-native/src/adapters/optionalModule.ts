import { VoxoError } from '../core/errors'

/**
 * Chargement paresseux d'une dépendance native optionnelle.
 *
 * Les modules natifs sont des `peerDependencies` optionnelles : une application
 * qui désactive les pièces jointes n'a pas à installer de sélecteur de fichiers.
 * On ne les charge donc qu'au moment où on s'en sert, et l'absence produit un
 * message **en français** qui dit quoi installer, plutôt qu'un
 * « Cannot find module » incompréhensible pour l'utilisateur final.
 *
 * `require` plutôt qu'`import()` : c'est ce que comprend le bundler Metro, et
 * cela reste synchrone, donc utilisable dans un constructeur.
 */
export function loadOptionalModule<T>(name: string, purpose: string): T {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(name) as T
  } catch {
    throw new VoxoError(
      `${purpose} nécessite le module « ${name} », qui n’est pas installé. ` +
        `Ajoutez-le à votre application, ou fournissez votre propre adaptateur ` +
        `via l’option « adapters » de VoxoConfig.`,
      { code: 'MISSING_NATIVE_MODULE' },
    )
  }
}

/** Renvoie `null` au lieu de lever : pour les capacités simplement absentes. */
export function tryLoadOptionalModule<T>(name: string): T | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(name) as T
  } catch {
    return null
  }
}
