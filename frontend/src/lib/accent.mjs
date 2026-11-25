// Keep these contrast vectors aligned with widget/src/color.js.
const normalizeHex = (value, fallback = '#3b82f6') => {
  const input = String(value || '').trim()
  if (!/^#?([\da-f]{3}|[\da-f]{6})$/i.test(input)) return fallback
  const raw = input.replace('#', '').toLowerCase()
  return `#${raw.length === 3 ? raw.split('').map(part => part + part).join('') : raw}`
}

const rgb = value => {
  const hex = normalizeHex(value).slice(1)
  return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16))
}

const mix = (first, second, weight) => {
  const a = rgb(first)
  const b = rgb(second)
  return `#${a.map((channel, index) => Math.round(channel * (1 - weight) + b[index] * weight).toString(16).padStart(2, '0')).join('')}`
}

const luminance = value => rgb(value)
  .map(channel => {
    const part = channel / 255
    return part <= 0.04045 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4
  })
  .reduce((total, part, index) => total + part * [0.2126, 0.7152, 0.0722][index], 0)

const contrast = (first, second) => {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

export function deriveAccent(value) {
  const accent = normalizeHex(value)
  let solid = accent
  for (let amount = 0; amount <= 0.8 && contrast(solid, '#ffffff') < 4.5; amount += 0.03) {
    solid = mix(accent, '#000000', amount)
  }
  const soft = mix(accent, '#ffffff', 0.88)
  let text = solid
  for (let amount = 0; amount <= 0.85 && contrast(text, soft) < 4.5; amount += 0.03) {
    text = mix(solid, '#000000', amount)
  }
  return { accent, solid, soft, text }
}
