import { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: number
  readOnly?: boolean
}

export default function StarRating({ value, onChange, size = 18, readOnly = false }: StarRatingProps) {
  const [hover, setHover] = useState(0)
  const display = hover || value

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => !readOnly && setHover(i)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={readOnly ? 'cursor-default' : 'cursor-pointer'}
          aria-label={`${i} star`}
        >
          <Star
            size={size}
            className={i <= display ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}
          />
        </button>
      ))}
    </div>
  )
}
