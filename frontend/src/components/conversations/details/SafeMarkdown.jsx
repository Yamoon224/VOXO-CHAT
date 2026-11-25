import { safeMarkdownUrl } from '@/lib/markdown-url.mjs'

const MAX_MARKDOWN_LENGTH = 8000
const INLINE_PATTERN = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]\([^\s)]+\)|https?:\/\/[^\s<]+)/gi

function linkNode(label, rawUrl, key) {
  const href = safeMarkdownUrl(rawUrl)
  if (!href) return label
  return (
    <a
      key={key}
      href={href}
      target={/^https?:/i.test(href) ? '_blank' : undefined}
      rel="noopener noreferrer nofollow"
      className="underline underline-offset-2"
    >
      {label}
    </a>
  )
}

function splitTrailingPunctuation(value) {
  const trailing = value.match(/[),.!?;:]+$/)?.[0] || ''
  return { url: trailing ? value.slice(0, -trailing.length) : value, trailing }
}

function renderInline(value, keyPrefix) {
  const nodes = []
  let cursor = 0
  let tokenIndex = 0
  String(value).replace(INLINE_PATTERN, (token, _capture, offset) => {
    if (offset > cursor) nodes.push(value.slice(cursor, offset))
    const key = `${keyPrefix}-${tokenIndex++}`
    cursor = offset + token.length

    if (token.startsWith('`')) {
      nodes.push(<code key={key} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[.9em]">{token.slice(1, -1)}</code>)
    } else if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      nodes.push(<strong key={key}>{renderInline(token.slice(2, -2), key)}</strong>)
    } else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      nodes.push(<em key={key}>{renderInline(token.slice(1, -1), key)}</em>)
    } else if (token.startsWith('[')) {
      const match = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      nodes.push(match ? linkNode(match[1], match[2], key) : token)
    } else {
      const { url, trailing } = splitTrailingPunctuation(token)
      nodes.push(linkNode(url, url, key))
      if (trailing) nodes.push(trailing)
    }
    return token
  })
  if (cursor < value.length) nodes.push(value.slice(cursor))
  return nodes
}

function renderPlain(value) {
  return String(value ?? '').split('\n').map((line, index) => (
    <span key={`line-${index}`}>
      {index > 0 && <br />}
      {line.split(/(https?:\/\/[^\s<]+)/gi).map((part, partIndex) => {
        if (!/^https?:\/\//i.test(part)) return part
        const { url, trailing } = splitTrailingPunctuation(part)
        return <span key={`plain-${index}-${partIndex}`}>{linkNode(url, url, `plain-link-${index}-${partIndex}`)}{trailing}</span>
      })}
    </span>
  ))
}

export function SafeMarkdown({ children, enabled = true }) {
  const text = String(children ?? '')
  if (!enabled || text.length > MAX_MARKDOWN_LENGTH) {
    return <span className="whitespace-pre-wrap">{renderPlain(text)}</span>
  }

  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let index = 0
  while (index < lines.length) {
    if (!lines[index].trim()) {
      index++
      continue
    }
    if (/^\s*```/.test(lines[index])) {
      const content = []
      index++
      while (index < lines.length && !/^\s*```/.test(lines[index])) content.push(lines[index++])
      if (index < lines.length) index++
      blocks.push(
        <pre key={`pre-${index}`} className="my-2 max-w-full overflow-x-auto rounded-lg bg-slate-950 p-3 text-slate-100">
          <code className="font-mono text-xs">{content.join('\n')}</code>
        </pre>
      )
      continue
    }
    const listMatch = lines[index].match(/^\s*([-+*]|\d+\.)\s+(.+)$/)
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[1])
      const items = []
      while (index < lines.length) {
        const item = lines[index].match(/^\s*([-+*]|\d+\.)\s+(.+)$/)
        if (!item || /\d+\./.test(item[1]) !== ordered) break
        items.push(<li key={`item-${index}`}>{renderInline(item[2], `item-${index}`)}</li>)
        index++
      }
      const List = ordered ? 'ol' : 'ul'
      blocks.push(<List key={`list-${index}`} className={`my-2 pl-5 ${ordered ? 'list-decimal' : 'list-disc'}`}>{items}</List>)
      continue
    }
    const paragraph = []
    while (index < lines.length && lines[index].trim() && !/^\s*```/.test(lines[index]) && !/^\s*([-+*]|\d+\.)\s+/.test(lines[index])) {
      paragraph.push(lines[index++])
    }
    blocks.push(
      <p key={`paragraph-${index}`} className="mb-2 last:mb-0">
        {paragraph.map((line, lineIndex) => (
          <span key={`paragraph-${index}-${lineIndex}`}>
            {lineIndex > 0 && <br />}
            {renderInline(line, `paragraph-${index}-${lineIndex}`)}
          </span>
        ))}
      </p>
    )
  }
  return blocks
}
