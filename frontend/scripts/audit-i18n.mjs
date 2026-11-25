import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const messagesDir = path.join(root, 'src', 'messages')
const fr = JSON.parse(fs.readFileSync(path.join(messagesDir, 'fr.json'), 'utf8'))
const en = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'))

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out)
    else out[full] = child
  }
  return out
}

const frKeys = flatten(fr)
const enKeys = flatten(en)
const missingEn = Object.keys(frKeys).filter(key => !(key in enKeys))
const missingFr = Object.keys(enKeys).filter(key => !(key in frKeys))
const empty = [...Object.entries(frKeys), ...Object.entries(enKeys)]
  .filter(([, value]) => typeof value === 'string' && !value.trim())
  .map(([key]) => key)

console.log(`Catalogues: FR ${Object.keys(frKeys).length} clés, EN ${Object.keys(enKeys).length} clés`)
if (missingEn.length || missingFr.length || empty.length) {
  if (missingEn.length) console.error('Clés absentes en EN:', missingEn.join(', '))
  if (missingFr.length) console.error('Clés absentes en FR:', missingFr.join(', '))
  if (empty.length) console.error('Traductions vides:', [...new Set(empty)].join(', '))
  process.exitCode = 1
}

const sourceRoot = path.join(root, 'src')
const files = []
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(target)
    else if (/\.(js|jsx|mjs)$/.test(entry.name)) files.push(target)
  }
}
walk(sourceRoot)
const unlocalizedLinks = []
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, index) => {
    if (/href\s*=\s*["'`]\/(?:auth|dashboard|admin)/.test(line) || /router\.(?:push|replace)\(\s*["'`]\/(?:auth|dashboard|admin)/.test(line)) {
      unlocalizedLinks.push(`${path.relative(root, file)}:${index + 1}`)
    }
  })
}
if (unlocalizedLinks.length) {
  console.warn(`Liens internes à vérifier (${unlocalizedLinks.length}):`)
  console.warn(unlocalizedLinks.join('\n'))
  if (process.argv.includes('--strict')) process.exitCode = 1
}
