import { motion } from 'framer-motion'
import { ArrowRight, Compass, GraduationCap, Map, Sparkles, Target } from 'lucide-react'
import CareerSearchBar from './CareerSearchBar'

interface PathFinderHeroProps {
  search: string
  onSearchChange: (value: string) => void
  onExploreClick: () => void
}

export default function PathFinderHero({ search, onSearchChange, onExploreClick }: PathFinderHeroProps) {
  return (
    <section className="bg-gray-50 dark:bg-brand-dark-card border-b border-gray-100 dark:border-brand-dark-border pt-28 pb-12 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold text-brand-muted dark:text-brand-dark-muted border border-gray-200 dark:border-brand-dark-border rounded-full mb-5 uppercase tracking-widest">
            <Sparkles size={12} className="text-primary-500" /> Career Discovery
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-brand-text dark:text-brand-dark-text tracking-tight mb-5">
            Skills021 <span className="gradient-text">PathFinder</span>
          </h1>
          <p className="text-brand-muted dark:text-brand-dark-muted text-lg max-w-2xl mb-8 leading-relaxed">
            Discover your dream career, explore the exams you need to qualify, and build your roadmap to success.
          </p>
          <CareerSearchBar value={search} onChange={onSearchChange} />
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={onExploreClick}
              className="btn-primary"
            >
              Explore Careers <ArrowRight size={16} />
            </button>
            <span className="text-sm text-brand-muted dark:text-brand-dark-muted">13 career paths and mock exam roadmaps</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="relative h-[360px] lg:h-[420px]"
        >
          <div className="absolute inset-0 rounded-[2rem] bg-white dark:bg-brand-dark-bg border border-gray-100 dark:border-brand-dark-border shadow-card-hover overflow-hidden">
            <div className="absolute inset-0 dotted-grid opacity-80" />
            <div className="absolute inset-x-6 top-8 h-20 rounded-2xl bg-[#0A0A0A] dark:bg-white shadow-card flex items-center px-5">
              <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center text-white">
                <Compass size={24} />
              </div>
              <div className="ml-4">
                <p className="text-xs font-bold uppercase tracking-widest text-white/60 dark:text-black/50">Path score</p>
                <p className="text-xl font-black text-white dark:text-black">Career Match 92%</p>
              </div>
            </div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              className="absolute left-8 bottom-10 w-44 rounded-2xl bg-white dark:bg-brand-dark-card border border-gray-100 dark:border-brand-dark-border p-4 shadow-card-hover"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 flex items-center justify-center mb-3">
                <Target size={20} />
              </div>
              <p className="text-sm font-bold text-brand-text dark:text-brand-dark-text">Goal</p>
              <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1">Fighter Pilot</p>
            </motion.div>
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              className="absolute right-7 bottom-20 w-48 rounded-2xl bg-white dark:bg-brand-dark-card border border-gray-100 dark:border-brand-dark-border p-4 shadow-card-hover"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 flex items-center justify-center mb-3">
                <GraduationCap size={20} />
              </div>
              <p className="text-sm font-bold text-brand-text dark:text-brand-dark-text">Next step</p>
              <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1">NDA eligibility checklist</p>
            </motion.div>
            <div className="absolute left-1/2 top-[47%] -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/30 rotate-6">
              <Map size={38} />
            </div>
            <div className="absolute left-24 right-24 top-44 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

