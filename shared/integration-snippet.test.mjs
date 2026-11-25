import test from 'node:test'
import assert from 'node:assert/strict'
import { buildIntegrationSnippet, getWidgetBaseUrl } from './integration-snippet.mjs'

test('derives a widget URL from a final api suffix', () => {
  assert.equal(getWidgetBaseUrl('https://api.example.com/api'), 'https://api.example.com')
  assert.equal(getWidgetBaseUrl('https://example.com/prefix/api/'), 'https://example.com/prefix')
})
test('includes the canonical API URL and fallback data attributes', () => {
  const snippet = buildIntegrationSnippet({ apiUrl: 'https://app.voxo.chat/backserv/pre-prod/api/', tenantId: 'tenant' })
  assert.match(snippet, /"apiUrl": "https:\/\/app\.voxo\.chat\/backserv\/pre-prod\/api"/)
  assert.match(snippet, /src="https:\/\/app\.voxo\.chat\/backserv\/pre-prod\/widget\.js"/)
  assert.match(snippet, /data-api-url="https:\/\/app\.voxo\.chat\/backserv\/pre-prod\/api"/)
  assert.match(snippet, /data-tenant-id="tenant"/)
})
test('generates all variants with an explicit API URL', () => {
  for (const variant of ['script', 'html', 'config']) {
    const snippet = buildIntegrationSnippet({ apiUrl: 'https://api.example.com/api', tenantId: 'tenant', variant })
    assert.match(snippet, /"apiUrl": "https:\/\/api\.example\.com\/api"/)
  }
  assert.match(buildIntegrationSnippet({ apiUrl: 'https://api.example.com/api', variant: 'html' }), /ne l'ouvrez pas directement en file:\/\//)
})
test('serializes unsafe customer text safely', () => {
  const snippet = buildIntegrationSnippet({ apiUrl: 'https://api.example.com/api', tenantId: 'tenant"&<>', chatbot: { name: "L'assistant", welcomeMessage: '</script><img>', theme: {} } })
  assert.match(snippet, /L'assistant/)
  assert.match(snippet, /\\u003c\/script>/)
  assert.match(snippet, /data-tenant-id="tenant&quot;&amp;&lt;&gt;"/)
})
test('does not generate a snippet without a valid backend URL', () => {
  assert.equal(buildIntegrationSnippet({ apiUrl: '', tenantId: 'tenant' }), null)
  assert.equal(buildIntegrationSnippet({ apiUrl: 'file:///tmp/api', tenantId: 'tenant' }), null)
})
test('the flutter variant carries the real apiUrl and tenantId, not widget.js', () => {
  const snippet = buildIntegrationSnippet({ apiUrl: 'https://api.example.com/api/', tenantId: 'tenant', variant: 'flutter' })
  assert.match(snippet, /apiUrl: 'https:\/\/api\.example\.com\/api'/)
  assert.match(snippet, /tenantId: 'tenant'/)
  assert.match(snippet, /VoxoController/)
  // Un SDK mobile n'embarque pas le bundle web.
  assert.doesNotMatch(snippet, /widget\.js/)
  assert.doesNotMatch(snippet, /ChatBotConfig/)
})
test('the flutter variant escapes values before embedding them in Dart', () => {
  const snippet = buildIntegrationSnippet({ apiUrl: 'https://api.example.com/api', tenantId: "ten'ant$brace\\x", variant: 'flutter' })
  assert.match(snippet, /tenantId: 'ten\\'ant\\\$brace\\\\x'/)
})
test('a mobile variant still needs a valid backend URL', () => {
  assert.equal(buildIntegrationSnippet({ apiUrl: '', variant: 'flutter' }), null)
})
test('the react-native variant carries the real values and the crypto polyfill', () => {
  const snippet = buildIntegrationSnippet({ apiUrl: 'https://api.example.com/api/', tenantId: 'tenant', variant: 'react-native' })
  assert.match(snippet, /apiUrl=\{'https:\/\/api\.example\.com\/api'\}/)
  assert.match(snippet, /tenantId=\{'tenant'\}/)
  assert.match(snippet, /VoxoProvider/)
  // Sans ce polyfill, le clientMessageId perd sa garantie d'unicite.
  assert.match(snippet, /react-native-get-random-values/)
  assert.doesNotMatch(snippet, /widget\.js/)
})
test('the react-native variant escapes values inside JSX expressions', () => {
  // Un conteneur d'expression plutot qu'un attribut entre guillemets : JSX
  // n'accepte pas l'echappement par backslash dans un attribut.
  const snippet = buildIntegrationSnippet({ apiUrl: 'https://api.example.com/api', tenantId: "ten'ant\\x", variant: 'react-native' })
  assert.match(snippet, /tenantId=\{'ten\\'ant\\\\x'\}/)
})
test('the kotlin variant carries the real apiUrl and tenantId, not widget.js', () => {
  const snippet = buildIntegrationSnippet({ apiUrl: 'https://api.example.com/api/', tenantId: 'tenant', variant: 'kotlin' })
  assert.match(snippet, /apiUrl = "https:\/\/api\.example\.com\/api"/)
  assert.match(snippet, /tenantId = "tenant"/)
  assert.match(snippet, /VoxoChatView/)
  assert.doesNotMatch(snippet, /widget\.js/)
})
test('the kotlin variant escapes quotes, backslashes and string templates', () => {
  const snippet = buildIntegrationSnippet({ apiUrl: 'https://api.example.com/api', tenantId: 'te"n$x\\y', variant: 'kotlin' })
  assert.ok(snippet.includes('tenantId = "te\\"n\\$x\\\\y"'))
})
test('an unknown variant falls back to the script snippet', () => {
  const snippet = buildIntegrationSnippet({ apiUrl: 'https://api.example.com/api', tenantId: 'tenant', variant: 'swift' })
  assert.match(snippet, /widget\.js/)
})
