import { MAX_MARKDOWN_LENGTH, parseBlocks } from '../src/ui/markdown/blockParser'
import type { VoxoInlineNode } from '../src/ui/markdown/inlineParser'
import { flattenInline, parseInline } from '../src/ui/markdown/inlineParser'
import { safeUrl } from '../src/ui/markdown/safeUrl'

/** Premier fragment du type demandé, à n'importe quelle profondeur. */
function find(nodes: VoxoInlineNode[], kind: VoxoInlineNode['kind']): VoxoInlineNode | undefined {
  for (const node of nodes) {
    if (node.kind === kind) return node
    if (node.kind === 'strong' || node.kind === 'emphasis') {
      const nested = find(node.children, kind)
      if (nested) return nested
    }
  }
  return undefined
}

// Ces cas reprennent `markdownCases` de shared/markdown-corpus.mjs : même
// corpus que le widget web, pour que la même réponse s'affiche pareil.
describe('corpus partagé — fragments en ligne', () => {
  it('**gras**', () => {
    const node = find(parseInline('**gras**'), 'strong')
    expect(node).toBeDefined()
    expect(flattenInline([node!])).toBe('gras')
  })

  it('_italique_', () => {
    const node = find(parseInline('_italique_'), 'emphasis')
    expect(node).toBeDefined()
    expect(flattenInline([node!])).toBe('italique')
  })

  it('`code`', () => {
    const node = find(parseInline('`code`'), 'code')
    expect(node).toEqual({ kind: 'code', text: 'code' })
  })

  it('[VOXO](https://voxo.fr)', () => {
    const node = find(parseInline('[VOXO](https://voxo.fr)'), 'link')
    expect(node).toEqual({ kind: 'link', text: 'VOXO', url: 'https://voxo.fr' })
  })

  it('__gras__ et *italique* sont aussi reconnus', () => {
    expect(find(parseInline('__x__'), 'strong')).toBeDefined()
    expect(find(parseInline('*x*'), 'emphasis')).toBeDefined()
  })
})

describe('corpus partagé — blocs', () => {
  it('```js … ``` produit un bloc de code au contenu brut', () => {
    const blocks = parseBlocks('```js\nconst a = 1 < 2;\n```')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.kind).toBe('codeBlock')
    expect(blocks[0]!.lines.join('\n')).toBe('const a = 1 < 2;')
  })

  it('- un\\n- deux produit une liste à puces', () => {
    const blocks = parseBlocks('- un\n- deux')
    expect(blocks[0]!.kind).toBe('bulletList')
    expect(blocks[0]!.lines).toEqual(['un', 'deux'])
  })

  it('1. un\\n2. deux produit une liste numérotée', () => {
    const blocks = parseBlocks('1. un\n2. deux')
    expect(blocks[0]!.kind).toBe('orderedList')
    expect(blocks[0]!.lines).toEqual(['un', 'deux'])
  })

  it('une liste à puces ne fusionne pas avec une numérotée', () => {
    const blocks = parseBlocks('- un\n1. deux')
    expect(blocks).toHaveLength(2)
    expect(blocks[0]!.kind).toBe('bulletList')
    expect(blocks[1]!.kind).toBe('orderedList')
  })

  it('les lignes d’un paragraphe restent groupées', () => {
    const blocks = parseBlocks('ligne un\nligne deux\n\nautre')
    expect(blocks).toHaveLength(2)
    expect(blocks[0]!.lines).toEqual(['ligne un', 'ligne deux'])
    expect(blocks[1]!.lines).toEqual(['autre'])
  })

  it('un bloc de code non refermé court jusqu’à la fin', () => {
    const blocks = parseBlocks('```\nsans fin')
    expect(blocks[0]!.kind).toBe('codeBlock')
    expect(blocks[0]!.lines).toEqual(['sans fin'])
  })

  it('un texte très long n’est pas analysé', () => {
    const long = 'a'.repeat(MAX_MARKDOWN_LENGTH + 1)
    expect(parseBlocks(`**${long}**`)[0]!.kind).toBe('paragraph')
  })
})

// Reprend `xssCases` de shared/markdown-corpus.mjs.
describe('corpus partagé — injections', () => {
  it('les schémas dangereux sont refusés, quelle que soit la casse', () => {
    for (const url of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,alert(1)',
      'vbscript:alert(1)',
    ]) {
      expect(safeUrl(url)).toBeNull()
    }
  })

  it('une URL protocol-relative est refusée : pas de site de rattachement', () => {
    expect(safeUrl('//evil.example')).toBeNull()
  })

  it('un schéma coupé par un caractère de contrôle est refusé', () => {
    expect(safeUrl('java\nscript:alert(1)')).toBeNull()
    expect(safeUrl('java\tscript:alert(1)')).toBeNull()
  })

  it('un lien à schéma refusé retombe en texte, sans URL', () => {
    const nodes = parseInline('[x](javascript:alert(1))')
    expect(find(nodes, 'link')).toBeUndefined()
    // La parenthèse finale reste en texte : le motif s'arrête à la première
    // `)`, exactement comme le widget web, qui utilise la même expression.
    expect(flattenInline(nodes)).toBe('x)')
  })

  it('les balises HTML restent du texte : rien n’est interprété', () => {
    for (const input of ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>']) {
      expect(flattenInline(parseInline(input))).toBe(input)
    }
  })

  it('**<svg onload=…>** garde la balise en texte à l’intérieur du gras', () => {
    const nodes = parseInline('**<svg onload=alert(1)>**')
    expect(flattenInline(nodes)).toBe('<svg onload=alert(1)>')
    expect(find(nodes, 'strong')).toBeDefined()
  })

  it('http, https, mailto et tel restent autorisés', () => {
    for (const url of [
      'https://voxo.fr',
      'http://voxo.fr',
      'mailto:contact@voxo.fr',
      'tel:+221770000000',
    ]) {
      expect(safeUrl(url)).toBe(url)
    }
  })
})

describe('URL détectées au fil du texte', () => {
  it('la ponctuation finale ne fait pas partie du lien', () => {
    const nodes = parseInline('Voir https://voxo.fr.')
    expect(find(nodes, 'link')).toEqual({
      kind: 'link',
      text: 'https://voxo.fr',
      url: 'https://voxo.fr',
    })
    expect(flattenInline(nodes)).toBe('Voir https://voxo.fr.')
  })

  it('le texte autour du lien est conservé intact', () => {
    expect(flattenInline(parseInline('avant [VOXO](https://voxo.fr) après'))).toBe(
      'avant VOXO après',
    )
  })
})
