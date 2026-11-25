import test from 'node:test'
import assert from 'node:assert/strict'
import { safeMarkdownUrl } from './markdown-url.mjs'

test('allows only the Markdown link protocol allowlist', () => {
  for (const value of ['https://voxo.fr', 'http://voxo.fr', 'mailto:test@voxo.fr', 'tel:+33102030405', '/aide']) {
    assert.equal(safeMarkdownUrl(value), value)
  }
  for (const value of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'data:text/html,x', 'vbscript:x', '//evil.example']) {
    assert.equal(safeMarkdownUrl(value), null)
  }
})
