import type { ReactNode } from 'react'
import { Fragment } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { useVoxoTheme } from '../ThemeContext'
import type { VoxoBlock } from './blockParser'
import { isListBlock, parseBlocks } from './blockParser'
import type { VoxoInlineNode } from './inlineParser'
import { parseInline } from './inlineParser'

export interface MarkdownBodyProps {
  text: string
  color: string
  /** Suit `options.enableMarkdown` de `GET /widget/config`. */
  markdown: boolean
  onLinkPress?: (url: string) => void
}

/**
 * Affiche le contenu d'un message.
 *
 * En Markdown, seul le sous-ensemble du widget web est reconnu — gras, italique,
 * code, liens, listes, blocs de code. En mode texte, seules les URL sont rendues
 * cliquables, comme `renderPlainText` côté web.
 *
 * Les `<Text>` s'imbriquent nativement : pas de détecteur de geste à libérer, à
 * la différence de la version Flutter.
 */
export function MarkdownBody({ text, color, markdown, onLinkPress }: MarkdownBodyProps): ReactNode {
  const theme = useVoxoTheme()
  const baseStyle = { color, fontSize: 15, lineHeight: 22 }

  const renderNodes = (nodes: VoxoInlineNode[]): ReactNode =>
    nodes.map((node, index) => {
      const key = `${node.kind}-${index}`
      switch (node.kind) {
        case 'text':
          return <Fragment key={key}>{node.text}</Fragment>
        case 'code':
          return (
            <Text key={key} style={[styles.code, { backgroundColor: theme.surfaceMuted, color }]}>
              {node.text}
            </Text>
          )
        case 'link':
          return (
            <Text
              key={key}
              style={[styles.link, { color: theme.scheme === 'dark' ? theme.text : theme.accent }]}
              onPress={onLinkPress === undefined ? undefined : () => onLinkPress(node.url)}
              accessibilityRole="link"
            >
              {node.text}
            </Text>
          )
        case 'strong':
          return (
            <Text key={key} style={styles.strong}>
              {renderNodes(node.children)}
            </Text>
          )
        case 'emphasis':
          return (
            <Text key={key} style={styles.emphasis}>
              {renderNodes(node.children)}
            </Text>
          )
      }
    })

  if (!markdown) {
    return <Text style={baseStyle}>{renderNodes(parseInline(text))}</Text>
  }

  const renderBlock = (block: VoxoBlock, index: number): ReactNode => {
    if (block.kind === 'codeBlock') {
      return (
        <View
          key={index}
          style={[styles.codeBlock, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
        >
          {/* Défilement horizontal plutôt qu'un retour à la ligne, qui casserait
              l'indentation. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={[styles.code, { color }]}>{block.lines.join('\n')}</Text>
          </ScrollView>
        </View>
      )
    }

    if (isListBlock(block)) {
      return (
        <View key={index}>
          {block.lines.map((item, itemIndex) => (
            <View key={itemIndex} style={styles.listRow}>
              <Text style={[baseStyle, styles.bullet]}>
                {block.kind === 'orderedList' ? `${itemIndex + 1}.` : '•'}
              </Text>
              <Text style={[baseStyle, styles.listText]}>{renderNodes(parseInline(item))}</Text>
            </View>
          ))}
        </View>
      )
    }

    return (
      <Text key={index} style={baseStyle}>
        {renderNodes(parseInline(block.lines.join('\n')))}
      </Text>
    )
  }

  const blocks = parseBlocks(text)
  return (
    <View>
      {blocks.map((block, index) => (
        <View key={index} style={index > 0 ? styles.blockSpacing : undefined}>
          {renderBlock(block, index)}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  blockSpacing: { marginTop: 8 },
  bullet: { width: 22 },
  code: { fontFamily: 'monospace', fontSize: 14 },
  codeBlock: { borderRadius: 8, borderWidth: 1, padding: 10 },
  emphasis: { fontStyle: 'italic' },
  link: { textDecorationLine: 'underline' },
  listRow: { flexDirection: 'row', marginBottom: 2 },
  listText: { flex: 1 },
  strong: { fontWeight: '700' },
})
