import { motion } from 'framer-motion'
import { Compass, SearchX } from 'lucide-react'

interface EmptyStateProps {
  message?: string
  onExplore: () => void
}

export default function EmptyState({ message = 'No exams available for this career yet.', onExplore }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 px-6 bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border"
    >
      <div className="relative w-28 h-28 mx-auto mb-5">
        <div className="absolute inset-0 rounded-full bg-primary-50 dark:bg-primary-900/20" />
        <div className="absolute inset-5 rounded-3xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/30 rotate-6">
          <Compass size={34} />
        </div>
        <SearchX size={26} className="absolute -right-1 top-4 text-brand-muted dark:text-brand-dark-muted" />
      </div>
      <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-2">{message}</h3>
      <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-6">Try another career path or clear the current filters.</p>
      <button onClick={onExplore} className="btn-primary">
        Explore Other Careers
      </button>
    </motion.div>
  )
}

