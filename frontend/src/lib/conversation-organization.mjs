// Libellés résolus via `useTranslations('Conversations')` côté composants :
// `t(item.labelKey)` pour les priorités, `t(\`labelColor.${name}\`)` pour les
// couleurs d'étiquette.
export const PRIORITIES = {
  normal: { labelKey: 'priorityNormal', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', hex: '#059669' },
  important: { labelKey: 'priorityImportant', className: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500', hex: '#b45309' },
  urgent: { labelKey: 'priorityUrgent', className: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500', hex: '#c2410c' },
  critical: { labelKey: 'priorityCritical', className: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-600', hex: '#b91c1c' },
}

export const LABEL_COLORS = {
  slate: '!border-slate-400 !bg-slate-300 !text-slate-950', blue: '!border-blue-400 !bg-blue-300 !text-blue-950',
  green: '!border-green-400 !bg-green-300 !text-green-950', yellow: '!border-yellow-400 !bg-yellow-300 !text-yellow-950',
  orange: '!border-orange-400 !bg-orange-300 !text-orange-950', red: '!border-red-400 !bg-red-300 !text-red-950',
  purple: '!border-purple-400 !bg-purple-300 !text-purple-950', pink: '!border-pink-400 !bg-pink-300 !text-pink-950',
}

export const LABEL_COLOR_KEYS = {
  slate: 'labelColorSlate', blue: 'labelColorBlue', green: 'labelColorGreen', yellow: 'labelColorYellow',
  orange: 'labelColorOrange', red: 'labelColorRed', purple: 'labelColorPurple', pink: 'labelColorPink',
}

export function priorityConfig(priority) {
  return PRIORITIES[priority?.value || priority || 'normal'] || PRIORITIES.normal
}

export function stableSortMessages(messages = []) {
  return messages.map((message, index) => ({ message, index })).sort((a, b) => {
    const aTime = Date.parse(a.message.timestamp)
    const bTime = Date.parse(b.message.timestamp)
    if (Number.isNaN(aTime) || Number.isNaN(bTime) || aTime === bTime) return a.index - b.index
    return aTime - bTime
  }).map(item => item.message)
}

function dayStart(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Séparateur de jour dans un fil de messages.
 *
 * Renvoie une clé de traduction plutôt qu'un libellé : le module est partagé et
 * ne connaît pas la locale active. Quand la date ne tombe ni aujourd'hui ni
 * hier, `date` porte l'instant à formater côté composant via `Intl`.
 */
export function dayLabel(value, now = new Date()) {
  const day = dayStart(value)
  const today = dayStart(now)
  if (!day || !today) return { key: 'dayUnknown' }
  const diff = Math.round((today - day) / 86400000)
  if (diff === 0) return { key: 'dayToday' }
  if (diff === 1) return { key: 'dayYesterday' }
  return { key: 'dayDate', date: day }
}

export function conversationSection(value, now = new Date()) {
  const day = dayStart(value)
  const today = dayStart(now)
  if (!day || !today) return 'sectionOlder'
  const diff = Math.floor((today - day) / 86400000)
  if (diff <= 0) return 'sectionToday'
  if (diff === 1) return 'sectionYesterday'
  if (diff <= 7) return 'sectionLastSevenDays'
  return 'sectionOlder'
}

export function groupConversations(conversations = [], now = new Date()) {
  const sorted = [...conversations].sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0))
  return sorted.reduce((groups, conversation) => {
    const labelKey = conversationSection(conversation.updatedAt, now)
    const group = groups.find(item => item.labelKey === labelKey)
    if (group) group.items.push(conversation)
    else groups.push({ labelKey, items: [conversation] })
    return groups
  }, [])
}
