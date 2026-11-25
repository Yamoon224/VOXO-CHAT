/**
 * Génération et validation d'UUID v4.
 *
 * Le backend **rejette** tout `clientMessageId` qui n'est pas un UUID v4 strict
 * (`validators/widgetMessageValidator.js`) : les bits de version et de variante
 * doivent être posés. C'est ce champ qui porte l'idempotence côté serveur — deux
 * messages partageant un identifiant sont traités comme un seul.
 *
 * React Native ne fournit pas `crypto.getRandomValues`. L'application hôte doit
 * importer `react-native-get-random-values` en tête de son point d'entrée. Sans
 * lui, on retombe sur `Math.random` : la **forme** reste valide, donc le message
 * part, mais l'unicité n'est plus garantie. On prévient une fois, en
 * développement seulement.
 */

/** Même forme que la regex du backend. */
export const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type CryptoLike = { getRandomValues(array: Uint8Array): Uint8Array }

let warnedAboutFallback = false

function secureCrypto(): CryptoLike | null {
  const candidate = (globalThis as { crypto?: Partial<CryptoLike> }).crypto
  return typeof candidate?.getRandomValues === 'function' ? (candidate as CryptoLike) : null
}

function randomBytes(): Uint8Array {
  const bytes = new Uint8Array(16)
  const source = secureCrypto()
  if (source) return source.getRandomValues(bytes)

  if (!warnedAboutFallback) {
    warnedAboutFallback = true
    console.warn(
      '[VOXO] `crypto.getRandomValues` est indisponible : les identifiants de message ' +
        'sont générés avec Math.random, ce qui affaiblit la protection contre les doublons. ' +
        'Importez `react-native-get-random-values` en tête de votre point d’entrée.',
    )
  }
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256)
  }
  return bytes
}

export function uuidV4(): string {
  const bytes = randomBytes()
  // Non-null assertions : la longueur est fixée à 16 juste au-dessus, mais
  // `noUncheckedIndexedAccess` ne peut pas le déduire.
  bytes[6] = (bytes[6]! & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80 // variante RFC 4122

  let hex = ''
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

export function isUuidV4(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_V4_PATTERN.test(value)
}

/** Réservé aux tests : réarme l'avertissement de repli. */
export function resetUuidWarningForTests(): void {
  warnedAboutFallback = false
}
