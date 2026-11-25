import { CheckCircle2 } from 'lucide-react'

/** Liste à coche verte (support, prérequis, recommandations validées). */
export function DocChecklist({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
