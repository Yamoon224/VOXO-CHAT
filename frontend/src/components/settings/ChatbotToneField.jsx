'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

// Les valeurs doivent rester alignées sur TONE_PRESETS
// (backend/src/services/chatPromptBuilder.js), qui fait autorité.
const TONE_OPTIONS = [
  {
    value: 'chaleureux',
    label: 'Chaleureux',
    hint: 'Convivial et accessible. Recommandé pour un premier contact.'
  },
  {
    value: 'professionnel',
    label: 'Professionnel',
    hint: 'Courtois et précis, registre soutenu.'
  },
  {
    value: 'direct',
    label: 'Direct',
    hint: 'Concis et factuel, va droit au but.'
  },
  {
    value: 'enthousiaste',
    label: 'Enthousiaste',
    hint: 'Dynamique et positif, énergie affirmée.'
  }
]

export function ChatbotToneField({ value, onChange }) {
  const selected = TONE_OPTIONS.find((option) => option.value === value) || TONE_OPTIONS[0]

  return (
    <div>
      <Label htmlFor="chatbot-tone">Ton des réponses</Label>
      <Select value={selected.value} onValueChange={onChange}>
        <SelectTrigger id="chatbot-tone">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TONE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500 mt-1">{selected.hint}</p>
      <p className="text-xs text-gray-500 mt-1">
        Le ton n&apos;influence que la formulation : les réponses restent fondées
        uniquement sur votre base de connaissances.
      </p>
    </div>
  )
}
