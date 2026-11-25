import { unwrapEnvelope } from '../src/core/envelope'
import { VoxoError } from '../src/core/errors'

describe('unwrapEnvelope', () => {
  it('renvoie data sur une enveloppe de succès', () => {
    const data = unwrapEnvelope(
      200,
      '{"success":true,"data":{"sessionId":"abc"},"message":"ok"}',
    )
    expect(data.sessionId).toBe('abc')
  })

  it('renvoie un objet vide quand data est absent', () => {
    expect(unwrapEnvelope(200, '{"success":true}')).toEqual({})
  })

  it('relaie le message français du serveur sans le réécrire', () => {
    expect.assertions(3)
    try {
      unwrapEnvelope(
        400,
        '{"success":false,"error":"Message trop long (max 2000 caractères)","code":"MESSAGE_TOO_LONG"}',
      )
    } catch (error) {
      const voxo = error as VoxoError
      expect(voxo.message).toBe('Message trop long (max 2000 caractères)')
      expect(voxo.code).toBe('MESSAGE_TOO_LONG')
      expect(voxo.statusCode).toBe(400)
    }
  })

  it('expose isNotFound sur un 404, cas normal d’une session neuve', () => {
    expect.assertions(1)
    try {
      unwrapEnvelope(404, '{"success":false,"error":"Conversation not found"}')
    } catch (error) {
      expect((error as VoxoError).isNotFound).toBe(true)
    }
  })

  it('expose isRateLimited sur un 429', () => {
    expect.assertions(1)
    try {
      unwrapEnvelope(
        429,
        '{"success":false,"error":"Trop de messages.","code":"RATE_LIMIT_EXCEEDED"}',
      )
    } catch (error) {
      expect((error as VoxoError).isRateLimited).toBe(true)
    }
  })

  it('un corps illisible sur un échec ne masque pas l’échec', () => {
    expect.assertions(2)
    try {
      unwrapEnvelope(502, '<html>Bad Gateway</html>')
    } catch (error) {
      const voxo = error as VoxoError
      expect(voxo.statusCode).toBe(502)
      expect(voxo.message).toContain('indisponible')
    }
  })

  it('un corps illisible sur un succès est une réponse malformée', () => {
    expect.assertions(1)
    try {
      unwrapEnvelope(200, 'pas du json')
    } catch (error) {
      expect((error as VoxoError).code).toBe('MALFORMED_RESPONSE')
    }
  })

  it('survit à un JSON valide qui n’est pas un objet', () => {
    expect(() => unwrapEnvelope(200, '[1,2,3]')).toThrow(VoxoError)
  })
})
