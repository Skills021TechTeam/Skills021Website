import { motion } from 'framer-motion'
import { BookOpen, Compass, FileText, GraduationCap, HeartHandshake, Map, Sparkles, Target } from 'lucide-react'

export type DynamicHeroVisualVariant = 'courses' | 'resources' | 'pathfinder' | 'mentorship'

interface DynamicHeroVisualProps {
  variant: DynamicHeroVisualVariant
  className?: string
}

const config = {
  courses: {
    label: 'Learning paths',
    title: 'Build skills that move you forward',
    icon: BookOpen,
    accent: 'bg-violet-500',
    cards: [
      { icon: GraduationCap, label: 'Courses', value: 'Expert curated', side: 'left' },
      { icon: Target, label: 'Progress', value: 'Project based', side: 'right' },
    ],
  },
  resources: {
    label: 'Learning library',
    title: 'Everything you need, in one place',
    icon: FileText,
    accent: 'bg-blue-500',
    cards: [
      { icon: FileText, label: 'Resources', value: 'Notes & PYQs', side: 'left' },
      { icon: Sparkles, label: 'Quality', value: 'Expert verified', side: 'right' },
    ],
  },
  pathfinder: {
    label: 'Career discovery',
    title: 'Turn your goals into a roadmap',
    icon: Compass,
    accent: 'bg-primary-500',
    cards: [
      { icon: Target, label: 'Goal', value: 'Choose a direction', side: 'left' },
      { icon: GraduationCap, label: 'Next step', value: 'Build your roadmap', side: 'right' },
    ],
  },
  mentorship: {
    label: 'Expert guidance',
    title: 'Get guidance for your next step',
    icon: HeartHandshake,
    accent: 'bg-emerald-500',
    cards: [
      { icon: HeartHandshake, label: 'Mentors', value: 'Industry experts', side: 'left' },
      { icon: Sparkles, label: 'Support', value: 'Personalized help', side: 'right' },
    ],
  },
} as const

export default function DynamicHeroVisual({ variant, className = '' }: DynamicHeroVisualProps) {
  const item = config[variant]
  const MainIcon = item.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.6 }}
      className={`relative h-[320px] w-full sm:h-[380px] lg:h-[420px] ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-card-hover dark:border-brand-dark-border dark:bg-brand-dark-bg">
        <div className="absolute inset-0 dotted-grid opacity-70" />

        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}
          className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 dark:border-white/10"
        />

        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
          className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary-500/20"
        />

        <div className="absolute left-1/2 top-1/2 z-10 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-3 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-teal-500 text-white shadow-lg shadow-primary-500/30">
          <MainIcon size={38} />
        </div>

        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
          className="absolute left-5 top-7 z-20 rounded-2xl bg-[#0A0A0A] px-5 py-4 text-white shadow-card sm:left-8 sm:top-8"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">{item.label}</p>
          <p className="mt-1 text-sm font-black sm:text-base">{item.title}</p>
        </motion.div>

        {item.cards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              animate={{ y: index === 0 ? [0, 10, 0] : [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: index === 0 ? 5.5 : 6.2, ease: 'easeInOut' }}
              className={`absolute bottom-7 z-20 w-40 rounded-2xl border border-gray-100 bg-white p-4 shadow-card-hover dark:border-brand-dark-border dark:bg-brand-dark-card sm:bottom-10 sm:w-48 ${
                card.side === 'left' ? 'left-5 sm:left-8' : 'right-5 sm:right-8'
              }`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
                <Icon size={19} />
              </div>
              <p className="text-sm font-bold text-brand-text dark:text-brand-dark-text">{card.label}</p>
              <p className="mt-1 text-xs text-brand-muted dark:text-brand-dark-muted">{card.value}</p>
            </motion.div>
          )
        })}

        <div className="absolute left-16 right-16 top-1/2 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
        <div className="absolute bottom-5 right-5 h-2 w-2 rounded-full bg-primary-500 shadow-[0_0_18px_rgba(139,92,246,0.8)]" />
      </div>
    </motion.div>
  )
}
