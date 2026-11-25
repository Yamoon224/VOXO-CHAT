import { safeUrl, splitTrailingPunctuation } from './safeUrl'

/** Fragment enrichi d'un message, prêt à devenir un `<Text>`. */
export type VoxoInlineNode =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; url: string }
  | { kind: 'strong'; children: VoxoInlineNode[] }
  | { kind: 'emphasis'; children: VoxoInlineNode[] }

/**
 * Motif et ordre des alternatives volontairement identiques à
 * `widget/src/markdown.js` : c'est ce qui garantit qu'une même réponse s'affiche
 * pareil sur les deux canaux.
 */
const INLINE_PATTERN = new RegExp(
  [
    '`[^`\\n]+`',
    '\\*\\*[^*\\n]+\\*\\*',
    '__[^_\\n]+__',
    '\\*[^*\\n]+\\*',
    '_[^_\\n]+_',
    '\\[[^\\]\\n]+\\]\\([^\\s)]+\\)',
    'https?://[^\\s<]+',
  ].join('|'),
  'gi',
)

const LINK_PATTERN = /^\[([^\]]+)\]\(([^)]+)\)$/

/**
 * Analyse en ligne, portage de `appendInline`.
 *
 * Un lien dont le schéma est refusé retombe en simple texte : mieux vaut un
 * libellé inerte qu'un lien qui ouvre n'importe quoi.
 */
export function parseInline(value: string): VoxoInlineNode[] {
  const nodes: VoxoInlineNode[] = []
  let cursor = 0

  // `matchAll` remet l'index à zéro à chaque appel : le motif global peut donc
  // être partagé sans état résiduel entre deux analyses.
  for (const match of value.matchAll(INLINE_PATTERN)) {
    const start = match.index
    if (start > cursor) nodes.push({ kind: 'text', text: value.slice(cursor, start) })
    cursor = start + match[0].length
    nodes.push(...parseToken(match[0]))
  }

  if (cursor < value.length) nodes.push({ kind: 'text', text: value.slice(cursor) })
  return nodes
}

function parseToken(token: string): VoxoInlineNode[] {
  if (token.startsWith('`')) {
    return [{ kind: 'code', text: token.slice(1, -1) }]
  }

  if (wrappedBy(token, '**') || wrappedBy(token, '__')) {
    return [{ kind: 'strong', children: parseInline(token.slice(2, -2)) }]
  }

  if (wrappedBy(token, '*') || wrappedBy(token, '_')) {
    return [{ kind: 'emphasis', children: parseInline(token.slice(1, -1)) }]
  }

  if (token.startsWith('[')) {
    const match = LINK_PATTERN.exec(token)
    if (match === null) return [{ kind: 'text', text: token }]
    return [link(match[1]!, match[2]!)]
  }

  // URL nue rencontrée au fil du texte : la ponctuation finale n'en fait pas
  // partie.
  const [url, trailing] = splitTrailingPunctuation(token)
  const nodes: VoxoInlineNode[] = [link(url, url)]
  if (trailing.length > 0) nodes.push({ kind: 'text', text: trailing })
  return nodes
}

function link(text: string, rawUrl: string): VoxoInlineNode {
  const href = safeUrl(rawUrl)
  return href === null ? { kind: 'text', text } : { kind: 'link', text, url: href }
}

function wrappedBy(token: string, marker: string): boolean {
  return (
    token.length > marker.length * 2 && token.startsWith(marker) && token.endsWith(marker)
  )
}

/** Texte brut d'un arbre de fragments — pratique pour les tests et l'accessibilité. */
export function flattenInline(nodes: VoxoInlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.kind === 'strong' || node.kind === 'emphasis') return flattenInline(node.children)
      return node.text
    })
    .join('')
}
