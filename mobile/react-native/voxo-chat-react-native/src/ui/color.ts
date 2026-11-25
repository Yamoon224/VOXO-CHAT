/**
 * Lecture des couleurs annoncées par `GET /widget/config`.
 *
 * Le dashboard stocke des chaînes libres : on accepte les formes courantes et on
 * retombe sur la couleur par défaut plutôt que de planter l'écran de chat pour
 * une valeur mal saisie.
 */

interface Rgb {
  r: number
  g: number
  b: number
}

/** Accepte `#rgb`, `#rrggbb`, avec ou sans `#`. */
export function parseColor(value: string | undefined): Rgb | null {
  const input = (value ?? '').trim().replace(/^#/, '')
  const expanded =
    input.length === 3
      ? input
          .split('')
          .map((character) => character + character)
          .join('')
      : input

  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  }
}

export function normalizeColor(value: string | undefined, fallback: string): string {
  const parsed = parseColor(value)
  return parsed === null ? fallback : toHex(parsed)
}

/**
 * Noir ou blanc, selon ce qui reste lisible sur `background`.
 *
 * Seuil de luminance relative de 0,5 : la couleur d'accent est choisie par le
 * client, elle peut être très claire comme très foncée.
 */
export function onColor(background: string): string {
  const parsed = parseColor(background)
  if (parsed === null) return '#ffffff'
  return luminance(parsed) > 0.5 ? '#111827' : '#ffffff'
}

/** Mélange `color` vers `towards` à hauteur de `amount` (0 à 1). */
export function mixColor(color: string, towards: string, amount: number): string {
  const from = parseColor(color)
  const to = parseColor(towards)
  if (from === null || to === null) return color

  const ratio = Math.min(1, Math.max(0, amount))
  return toHex({
    r: Math.round(from.r + (to.r - from.r) * ratio),
    g: Math.round(from.g + (to.g - from.g) * ratio),
    b: Math.round(from.b + (to.b - from.b) * ratio),
  })
}

/** Couleur avec transparence, au format `#rrggbbaa` accepté par React Native. */
export function withAlpha(color: string, alpha: number): string {
  const parsed = parseColor(color)
  if (parsed === null) return color
  const value = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
  return `${toHex(parsed)}${value.toString(16).padStart(2, '0')}`
}

function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

/** Luminance relative, formule WCAG. */
function luminance({ r, g, b }: Rgb): number {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const ratio = channel / 255
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}
