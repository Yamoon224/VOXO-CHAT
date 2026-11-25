import test from 'node:test'
import assert from 'node:assert/strict'
import { conversationSection, dayLabel, groupConversations, stableSortMessages, LABEL_COLORS, LABEL_COLOR_KEYS, PRIORITIES, priorityConfig } from './conversation-organization.mjs'

test('trie les messages par date sans déstabiliser les dates absentes ou égales', () => {
  const messages = [
    { id: 'late', timestamp: '2026-08-15T12:00:00Z' },
    { id: 'early', timestamp: '2026-08-15T10:00:00Z' },
    { id: 'unknown' },
    { id: 'equal', timestamp: '2026-08-15T12:00:00Z' },
  ]
  assert.deepEqual(stableSortMessages(messages).map(item => item.id), ['early', 'late', 'unknown', 'equal'])
})

test('produit les clés de séparateur aujourd’hui, hier et date complète', () => {
  const now = new Date(2026, 7, 15, 12)
  assert.deepEqual(dayLabel(new Date(2026, 7, 15, 8), now), { key: 'dayToday' })
  assert.deepEqual(dayLabel(new Date(2026, 7, 14, 8), now), { key: 'dayYesterday' })
  const older = dayLabel(new Date(2026, 7, 10, 8), now)
  assert.equal(older.key, 'dayDate')
  assert.equal(older.date.getTime(), new Date(2026, 7, 10).getTime())
  assert.deepEqual(dayLabel('pas une date', now), { key: 'dayUnknown' })
})

test('regroupe les conversations par activité comme WhatsApp', () => {
  const now = new Date('2026-08-15T12:00:00')
  const grouped = groupConversations([
      { id: 'old', updatedAt: '2026-07-01T00:00:00Z' },
      { id: 'today', updatedAt: '2026-08-15T09:00:00Z' },
      { id: 'week', updatedAt: '2026-08-12T09:00:00Z' },
      { id: 'yesterday', updatedAt: '2026-08-14T09:00:00Z' },
    ], now)
  assert.deepEqual(grouped.map(group => group.labelKey), ['sectionToday', 'sectionYesterday', 'sectionLastSevenDays', 'sectionOlder'])
  assert.equal(conversationSection('2026-08-12T09:00:00Z', now), 'sectionLastSevenDays')
})

test('donne une couleur distincte à chaque priorité', () => {
  const dots = Object.values(PRIORITIES).map(item => item.dot)
  assert.equal(new Set(dots).size, dots.length)
  for (const item of Object.values(PRIORITIES)) {
    assert.match(item.dot, /^bg-[a-z]+-\d{3}$/)
    assert.match(item.hex, /^#[0-9a-f]{6}$/)
  }
})

test('résout la configuration de priorité depuis un objet, une chaîne ou une valeur inconnue', () => {
  assert.equal(priorityConfig({ value: 'urgent' }).labelKey, 'priorityUrgent')
  assert.equal(priorityConfig('critical').labelKey, 'priorityCritical')
  assert.equal(priorityConfig(null).labelKey, 'priorityNormal')
  assert.equal(priorityConfig('inexistante').labelKey, 'priorityNormal')
})

test('associe une clé de traduction à chaque couleur d’étiquette', () => {
  assert.deepEqual(Object.keys(LABEL_COLOR_KEYS), Object.keys(LABEL_COLORS))
  assert.equal(LABEL_COLOR_KEYS.green, 'labelColorGreen')
  assert.equal(LABEL_COLOR_KEYS.slate, 'labelColorSlate')
  for (const key of Object.values(LABEL_COLOR_KEYS)) assert.match(key, /^labelColor[A-Z][a-z]+$/)
})
