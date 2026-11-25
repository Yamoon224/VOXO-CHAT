/**
 * Filtrage des URL, portage de `safeUrl` de `widget/src/markdown.js`.
 *
 * Une réponse d'assistant est du texte produit par un modèle : elle peut
 * contenir n'importe quel lien. On n'ouvre que des schémas inoffensifs, ce qui
 * écarte notamment `javascript:` et `data:`.
 */

const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto', 'tel'])

/**
 * Caractères de contrôle : ils servent à masquer un schéma interdit en le
 * coupant en deux, ce qu'une analyse laxiste laisserait passer.
 */
// Les caractères de contrôle sont précisément ce qu'on cherche ici : la règle
// no-control-regex vise les motifs écrits par mégarde, pas un filtre de sécurité.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/

/** Renvoie l'URL si elle est ouvrable, `null` sinon. */
export function safeUrl(value: string | undefined): string | null {
  const input = (value ?? '').trim()
  if (input.length === 0 || CONTROL_CHARACTERS.test(input)) return null

  // Le widget web accepte un chemin absolu, relatif au site qui l'héberge. Une
  // application mobile n'a pas de site de rattachement : rien à ouvrir.
  if (input.startsWith('/')) return null

  const match = /^([a-z][a-z0-9+.-]*):/i.exec(input)
  if (match === null) return null

  return ALLOWED_SCHEMES.has(match[1]!.toLowerCase()) ? input : null
}

/**
 * Sépare la ponctuation finale d'une URL détectée au fil du texte : dans
 * « voir https://voxo.chat. », le point n'appartient pas au lien.
 */
export function splitTrailingPunctuation(value: string): [url: string, trailing: string] {
  const match = /[),.!?;:]+$/.exec(value)
  const trailing = match?.[0] ?? ''
  return trailing.length === 0
    ? [value, '']
    : [value.slice(0, value.length - trailing.length), trailing]
}
