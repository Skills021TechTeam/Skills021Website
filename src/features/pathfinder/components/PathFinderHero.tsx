import { motion } from 'framer-motion'
import { ArrowRight, BriefcaseBusiness, Compass, FileText, MapPinned, Sparkles } from 'lucide-react'
import CareerSearchBar from './CareerSearchBar'
import PanelSpotlightCard from '../../../components/PanelSpotlightCard'

interface PathFinderHeroProps {
  search: string
  onSearchChange: (value: string) => void
  onExploreClick: () => void
  careerCount?: number
  examCount?: number
}

export default function PathFinderHero({
  search,
  onSearchChange,
  onExploreClick,
  careerCount = 0,
  examCount = 0,
}: PathFinderHeroProps) {
  return (
    <section className="bg-gradient-to-b from-gray-50/80 to-white dark:from-brand-dark-card/50 dark:to-brand-dark-bg border-b border-gray-100 dark:border-brand-dark-border pt-28 pb-14 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col items-center lg:flex-row lg:gap-12">
        <motion.div className="flex-1 w-full" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full mb-5 uppercase tracking-widest">
            <Sparkles size={12} /> Career Discovery & Milestones
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-brand-text dark:text-brand-dark-text tracking-tight mb-5">
            Skills021 <span className="gradient-text">PathFinder</span>
          </h1>
          <p className="text-brand-muted dark:text-brand-dark-muted text-base md:text-lg max-w-2xl mb-8 leading-relaxed">
            Discover your dream career trajectory, explore eligibility exams, compare industry salaries, and build your milestone roadmap.
          </p>
          <CareerSearchBar value={search} onChange={onSearchChange} />
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button onClick={onExploreClick} className="btn-primary">
              Explore Careers <ArrowRight size={16} />
            </button>
            <span className="text-sm text-brand-muted dark:text-brand-dark-muted">
              {careerCount || 15}+ career trajectories and entrance exams
            </span>
          </div>
        </motion.div>

        <aside className="hidden lg:block w-full max-w-md xl:max-w-lg flex-shrink-0 mt-8 lg:mt-0">
          <PanelSpotlightCard
            variant="path"
            stat={{ value: `${careerCount || 15}+`, label: 'Career Paths' }}
            secondaryStat={{ value: `${examCount || 20}+`, label: 'Target Exams' }}
          />
        </aside>
      </div>
    </section>
  )
}
