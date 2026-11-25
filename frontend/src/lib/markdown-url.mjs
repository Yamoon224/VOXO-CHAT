export function safeMarkdownUrl(value) {
  const input = String(value || '').trim()
  if (!input || /[\u0000-\u001f\u007f]/.test(input)) return null
  if (input.startsWith('/') && !input.startsWith('//')) return input
  try {
    const parsed = new URL(input)
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol.toLowerCase()) ? input : null
  } catch {
    return null
  }
}
