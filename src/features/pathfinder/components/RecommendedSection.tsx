import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { Career } from '../types'

interface RecommendedSectionProps {
  selectedCareer: Career
  recommendations: Career[]
  onSelect: (career: Career) => void
}

export default function RecommendedSection({ selectedCareer, recommendations, onSelect }: RecommendedSectionProps) {
  if (recommendations.length === 0) return null

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={17} className="text-primary-500" />
        <div>
          <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text">Recommended For You</h2>
          <p className="text-sm text-brand-muted dark:text-brand-dark-muted">
            Because you selected {selectedCareer.title}, you may also be interested in:
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {recommendations.map((career) => {
          const Icon = career.icon
          return (
            <motion.button
              key={career.id}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(career)}
              className="card p-4 text-left group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${career.accent} text-white flex items-center justify-center mb-3`}>
                <Icon size={18} />
              </div>
              <h3 className="font-bold text-sm text-brand-text dark:text-brand-dark-text group-hover:text-primary-500 transition-colors">{career.title}</h3>
              <p className="text-xs text-brand-muted dark:text-brand-dark-muted line-clamp-2 mt-1 mb-3">{career.shortDescription}</p>
              <span className="text-xs font-semibold text-primary-500 flex items-center gap-1">View path <ArrowRight size={12} /></span>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}

