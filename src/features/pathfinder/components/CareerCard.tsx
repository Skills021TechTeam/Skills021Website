import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { Career } from '../types'

interface CareerCardProps {
  career: Career
  onSelect: (career: Career) => void
}

export default function CareerCard({ career, onSelect }: CareerCardProps) {
  const Icon = career.icon

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(career)}
      className="group text-left bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-5 hover:shadow-card-hover transition-all duration-200 overflow-hidden relative"
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${career.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${career.accent} text-white flex items-center justify-center shadow-md mb-4`}>
        <Icon size={22} />
      </div>
      <h3 className="text-[15px] font-bold text-brand-text dark:text-brand-dark-text group-hover:text-primary-500 transition-colors mb-2">
        {career.title}
      </h3>
      <p className="text-xs text-brand-muted dark:text-brand-dark-muted leading-relaxed line-clamp-2 mb-4">
        {career.shortDescription}
      </p>
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-brand-dark-border">
        <span className="text-[11px] font-semibold text-brand-muted dark:text-brand-dark-muted">{career.averageSalary}</span>
        <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-brand-muted group-hover:bg-[#0A0A0A] group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
          <ArrowRight size={14} />
        </span>
      </div>
    </motion.button>
  )
}
