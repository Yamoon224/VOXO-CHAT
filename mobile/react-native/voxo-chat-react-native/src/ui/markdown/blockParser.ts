/** Nature d'un bloc Markdown reconnu. */
export type VoxoBlockKind = 'paragraph' | 'codeBlock' | 'bulletList' | 'orderedList'

/**
 * Bloc de haut niveau d'une réponse.
 *
 * Pour un paragraphe, `lines` porte les lignes du paragraphe (un saut de ligne
 * simple les sépare). Pour une liste, chaque entrée est un élément. Pour un bloc
 * de code, `lines` est le contenu brut, sans analyse en ligne.
 */
export interface VoxoBlock {
  kind: VoxoBlockKind
  lines: string[]
}

/** Au-delà, le texte est rendu tel quel : pas d'analyse coûteuse pour rien. */
export const MAX_MARKDOWN_LENGTH = 8000

const FENCE = /^\s*```/
const LIST_ITEM = /^\s*([-+*]|\d+\.)\s+(.+)$/
const ORDERED = /\d+\./

/**
 * Découpage en blocs, portage de `renderMarkdown` de `widget/src/markdown.js`.
 *
 * Les expressions régulières et l'ordre des tests sont volontairement
 * identiques : c'est ce qui garantit qu'une même réponse s'affiche de la même
 * façon sur le web et sur mobile.
 */
export function parseBlocks(value: string): VoxoBlock[] {
  if (value.length > MAX_MARKDOWN_LENGTH) {
    return [{ kind: 'paragraph', lines: value.split('\n') }]
  }

  const lines = value.replace(/\r\n?/g, '\n').split('\n')
  const blocks: VoxoBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]!
    if (line.trim().length === 0) {
      index += 1
      continue
    }
    if (FENCE.test(line)) {
      index = readCodeBlock(lines, index, blocks)
    } else if (LIST_ITEM.test(line)) {
      index = readList(lines, index, blocks)
    } else {
      index = readParagraph(lines, index, blocks)
    }
  }
  return blocks
}

function readCodeBlock(lines: string[], start: number, blocks: VoxoBlock[]): number {
  let index = start + 1
  const content: string[] = []
  while (index < lines.length && !FENCE.test(lines[index]!)) {
    content.push(lines[index]!)
    index += 1
  }
  // Une clôture manquante en fin de texte n'est pas une erreur : le bloc court
  // simplement jusqu'au bout.
  if (index < lines.length) index += 1

  blocks.push({ kind: 'codeBlock', lines: content })
  return index
}

function readList(lines: string[], start: number, blocks: VoxoBlock[]): number {
  const ordered = ORDERED.test(LIST_ITEM.exec(lines[start]!)![1]!)
  const items: string[] = []
  let index = start

  while (index < lines.length) {
    const match = LIST_ITEM.exec(lines[index]!)
    // Un changement de type ferme la liste : à puces et numérotée ne se
    // mélangent pas dans un même bloc.
    if (match === null || ORDERED.test(match[1]!) !== ordered) break
    items.push(match[2]!)
    index += 1
  }

  blocks.push({ kind: ordered ? 'orderedList' : 'bulletList', lines: items })
  return index
}

function readParagraph(lines: string[], start: number, blocks: VoxoBlock[]): number {
  const paragraph: string[] = []
  let index = start

  while (
    index < lines.length &&
    lines[index]!.trim().length > 0 &&
    !FENCE.test(lines[index]!) &&
    !LIST_ITEM.test(lines[index]!)
  ) {
    paragraph.push(lines[index]!)
    index += 1
  }

  blocks.push({ kind: 'paragraph', lines: paragraph })
  return index
}

export function isListBlock(block: VoxoBlock): boolean {
  return block.kind === 'bulletList' || block.kind === 'orderedList'
}
