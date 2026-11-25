import test from 'node:test'
import assert from 'node:assert/strict'
import { describeClient, formatDuration, formatLocation, parseUserAgent } from './client-metadata.mjs'

const CHROME_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

test('identifie navigateur, système et appareil depuis le user agent', () => {
  assert.deepEqual(parseUserAgent(CHROME_WINDOWS), { browser: 'Chrome 126', os: 'Windows 10/11', deviceKey: 'deviceDesktop' })
  assert.deepEqual(parseUserAgent(SAFARI_IPHONE), { browser: 'Safari 17', os: 'iOS', deviceKey: 'deviceMobile' })
  assert.deepEqual(parseUserAgent(''), { browser: null, os: null, deviceKey: null })
})

test('formate la localisation avec repli sur le fuseau horaire', () => {
  assert.equal(formatLocation({ location: { city: 'Abidjan', country: 'Côte d’Ivoire' } }), 'Abidjan, Côte d’Ivoire')
  assert.equal(formatLocation({ location: { country: 'France' } }), 'France')
  assert.equal(formatLocation({ timezone: 'Africa/Abidjan' }), 'Abidjan (approx.)')
  assert.equal(formatLocation({}), null)
})

test('formate les durées en secondes, minutes, heures et jours', () => {
  assert.equal(formatDuration(42), '42 s')
  assert.equal(formatDuration(180), '3 min')
  assert.equal(formatDuration(3900), '1 h 05')
  assert.equal(formatDuration(870731), '10 j 01 h')
  assert.equal(formatDuration(0), null)
  assert.equal(formatDuration(870731, 'en'), '10 d 01 h')
})

test('décrit le client sans conserver les entrées vides', () => {
  const entries = describeClient({
    channel: 'web',
    duration: 240,
    metadata: {
      userAgent: CHROME_WINDOWS, ipAddress: '41.66.10.5', timezone: 'Africa/Abidjan', language: 'fr-FR',
      url: 'https://neoburo.test/contact?utm=ads', location: { city: 'Abidjan', country: 'Côte d’Ivoire' },
    },
  })
  const values = Object.fromEntries(entries.map(entry => [entry.key, entry.value]))
  const valueKeys = Object.fromEntries(entries.map(entry => [entry.key, entry.valueKey]))
  assert.equal(values.location, 'Abidjan, Côte d’Ivoire')
  assert.equal(values.browser, 'Chrome 126')
  assert.equal(valueKeys.channel, 'channelWebsite')
  assert.equal(valueKeys.device, 'deviceDesktop')
  assert.equal(values.url, 'neoburo.test/contact')
  assert.equal(values.duration, '4 min')
  assert.equal(values.referrer, undefined)
  assert.ok(entries.every(entry => entry.labelKey))
  assert.ok(entries.every(entry => entry.value || entry.valueKey))
})

test('ne renvoie aucune entrée quand les métadonnées sont absentes', () => {
  assert.deepEqual(describeClient({}), [])
})
