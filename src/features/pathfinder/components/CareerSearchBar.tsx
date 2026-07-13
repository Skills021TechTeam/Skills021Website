import { Search, X } from 'lucide-react'
import { motion } from 'framer-motion'

interface CareerSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export default function CareerSearchBar({ value, onChange }: CareerSearchBarProps) {
  return (
    <motion.div
      whileFocus={{ scale: 1.01 }}
      className="relative max-w-xl"
    >
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search careers... (Fighter Pilot, AI Engineer, ISRO Scientist...)"
        className="input pl-12 pr-12 h-14 shadow-card"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-brand-muted hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
          aria-label="Clear search"
        >
          <X size={15} />
        </button>
      )}
    </motion.div>
  )
}

