import { Star } from 'lucide-react'

export function StarRating({ value = 0, max = 5 }) {
    return (
        <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: max }, (_, i) => (
                <Star
                    key={i}
                    className={`h-3 w-3 ${i < value ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                />
            ))}
        </div>
    )
}