import { isUuidV4, resetUuidWarningForTests, uuidV4 } from '../src/core/uuid'

/**
 * Regex recopiée depuis `backend/src/validators/widgetMessageValidator.js`.
 * Un `clientMessageId` qui ne la satisfait pas est rejeté en 400 : ce test garde
 * le générateur aligné sur ce que le serveur accepte réellement.
 */
const backendUuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('uuidV4', () => {
  it('produit un UUID accepté par le validateur backend', () => {
    for (let i = 0; i < 500; i += 1) {
      expect(backendUuidV4.test(uuidV4())).toBe(true)
    }
  })

  it('pose bien les bits de version et de variante', () => {
    const uuid = uuidV4()
    expect(uuid[14]).toBe('4')
    expect(['8', '9', 'a', 'b']).toContain(uuid[19])
  })

  it('ne produit pas deux fois le même identifiant', () => {
    const generated = new Set(Array.from({ length: 2000 }, () => uuidV4()))
    expect(generated.size).toBe(2000)
  })
})

describe('repli sans crypto.getRandomValues', () => {
  const realCrypto = globalThis.crypto

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true })
    resetUuidWarningForTests()
    jest.restoreAllMocks()
  })

  it('reste de forme v4 pour que le message parte quand même', () => {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
    jest.spyOn(console, 'warn').mockImplementation(() => {})

    for (let i = 0; i < 200; i += 1) {
      expect(backendUuidV4.test(uuidV4())).toBe(true)
    }
  })

  it('prévient une seule fois, pas à chaque message', () => {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    uuidV4()
    uuidV4()
    uuidV4()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('react-native-get-random-values')
  })
})

describe('isUuidV4', () => {
  it('accepte un UUID v4 valide', () => {
    expect(isUuidV4('9f8b7c6d-1e2f-4a3b-8c9d-0e1f2a3b4c5d')).toBe(true)
  })

  it('refuse un UUID v1 : le backend le rejetterait aussi', () => {
    expect(isUuidV4('9f8b7c6d-1e2f-1a3b-8c9d-0e1f2a3b4c5d')).toBe(false)
  })

  it('refuse une variante hors RFC 4122', () => {
    expect(isUuidV4('9f8b7c6d-1e2f-4a3b-1c9d-0e1f2a3b4c5d')).toBe(false)
  })

  it('refuse null, une chaîne vide et du texte libre', () => {
    expect(isUuidV4(null)).toBe(false)
    expect(isUuidV4('')).toBe(false)
    expect(isUuidV4('widget-session-1')).toBe(false)
  })
})
