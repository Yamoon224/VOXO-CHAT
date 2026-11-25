import { createConfig } from '../src/core/config'
import { VoxoError } from '../src/core/errors'

const tenantId = '9f8b7c6d-1e2f-4a3b-8c9d-0e1f2a3b4c5d'

describe('normalisation de apiUrl', () => {
  it('retire la barre oblique finale', () => {
    expect(createConfig({ apiUrl: 'https://api.voxo.chat/api/', tenantId }).apiUrl).toBe(
      'https://api.voxo.chat/api',
    )
  })

  it('retire la query et le fragment collés par l’intégrateur', () => {
    expect(createConfig({ apiUrl: 'https://api.voxo.chat/api?debug=1#x', tenantId }).apiUrl).toBe(
      'https://api.voxo.chat/api',
    )
  })

  it('conserve un préfixe de chemin', () => {
    expect(
      createConfig({ apiUrl: 'https://app.voxo.chat/backserv/pre-prod/api', tenantId }).apiUrl,
    ).toBe('https://app.voxo.chat/backserv/pre-prod/api')
  })

  it('accepte http pour le développement local', () => {
    expect(createConfig({ apiUrl: 'http://10.0.2.2:5000/api', tenantId }).apiUrl).toBe(
      'http://10.0.2.2:5000/api',
    )
  })

  it('refuse une URL sans schéma, vide ou non HTTP', () => {
    for (const apiUrl of ['', 'api.voxo.chat/api', 'ftp://voxo.chat/api', 'file:///tmp/api']) {
      expect(() => createConfig({ apiUrl, tenantId })).toThrow(VoxoError)
    }
  })
})

describe('validation du tenantId', () => {
  it('refuse un tenantId qui n’est pas un UUID v4', () => {
    expect(() => createConfig({ apiUrl: 'https://a.b/api', tenantId: 'mon-tenant' })).toThrow(
      VoxoError,
    )
  })
})

describe('conversationSocketUrl', () => {
  it('bascule https vers wss et conserve le préfixe /api', () => {
    const config = createConfig({ apiUrl: 'https://api.voxo.chat/api', tenantId })
    expect(config.conversationSocketUrl('session-1')).toBe(
      `wss://api.voxo.chat/api/widget/conversation/session-1/socket?tenantId=${tenantId}`,
    )
  })

  it('bascule http vers ws', () => {
    const config = createConfig({ apiUrl: 'http://10.0.2.2:5000/api', tenantId })
    expect(config.conversationSocketUrl('s').startsWith('ws://')).toBe(true)
  })

  it('encode un sessionId contenant des caractères réservés', () => {
    const config = createConfig({ apiUrl: 'https://api.voxo.chat/api', tenantId })
    // Sans encodage, le `/` ouvrirait un segment de chemin et la route ne
    // correspondrait plus côté serveur.
    expect(config.conversationSocketUrl('a/b c')).toContain('a%2Fb%20c')
  })
})

describe('options', () => {
  it('applique les valeurs par défaut', () => {
    const config = createConfig({ apiUrl: 'https://a.b/api', tenantId })
    expect(config.options).toEqual({
      enableTyping: true,
      enableInactivityMonitor: true,
      persistSession: true,
      enableLiveTyping: true,
      debug: false,
      showLanguageSwitcher: true,
    })
  })

  it('laisse surcharger une seule option sans perdre les autres', () => {
    const config = createConfig({
      apiUrl: 'https://a.b/api',
      tenantId,
      options: { enableInactivityMonitor: false },
    })
    expect(config.options.enableInactivityMonitor).toBe(false)
    expect(config.options.persistSession).toBe(true)
  })
})
