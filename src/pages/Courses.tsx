import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, Clock, Users, Star, Search, Play, Filter } from 'lucide-react'
import { useContentStore, CourseGroup, CourseSubcategory } from '../store/contentStore'

const GROUPS: { label: CourseGroup }[] = [
  { label: 'Foundation Programs' },
  { label: 'Competitive Exams' },
  { label: 'College & Tech Courses' },
]

const SUBCATEGORIES: Record<CourseGroup, CourseSubcategory[]> = {
  'Foundation Programs': ['Class 1-5', 'Class 6-8', 'Class 9-10', 'Class 11-12'],
  'Competitive Exams': ['JEE Preparation', 'NEET Preparation', 'CUET Preparation', 'Olympiads', 'NTSE'],
  'College & Tech Courses': [
    'DSA', 'Web Development', 'App Development', 'Flutter Development',
    'AI & Machine Learning', 'Data Science', 'Cyber Security', 'Cloud Computing',
    'Aptitude Preparation', 'Interview Preparation',
  ],
}

const LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced']
const PRICES = ['All', 'Free', 'Paid']

function CourseCard({ course }: { course: ReturnType<typeof useContentStore>['courses'][0] }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border overflow-hidden group cursor-pointer hover:shadow-card-hover transition-all duration-200"
    >
      {/* Thumbnail — clean dark card */}
      <div className="relative h-44 bg-gray-900 dark:bg-black overflow-hidden flex items-center justify-center">
        <BookOpen size={48} className="text-white/10" />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold bg-white/15 backdrop-blur-sm text-white rounded-lg border border-white/20">
            {course.level}
          </span>
          {course.price === 'FREE' && (
            <span className="px-2.5 py-1 text-xs font-semibold bg-primary-500 text-white rounded-lg">FREE</span>
          )}
        </div>
        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40">
            <Play size={18} className="text-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <span className="text-[11px] font-semibold text-brand-muted dark:text-brand-dark-muted bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
          {course.subcategory}
        </span>
        <h3 className="text-[15px] font-bold text-brand-text dark:text-brand-dark-text mt-2 mb-1 leading-snug line-clamp-2 group-hover:text-primary-500 transition-colors">
          {course.title}
        </h3>
        <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-3 line-clamp-2 leading-relaxed">
          {course.description}
        </p>
        <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-3">By {course.instructor}</p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-brand-muted dark:text-brand-dark-muted mb-4">
          <span className="flex items-center gap-1"><Star size={11} className="text-amber-400 fill-amber-400" />{course.rating}</span>
          <span className="flex items-center gap-1"><Clock size={11} />{course.duration}</span>
          <span className="flex items-center gap-1"><Users size={11} />{course.enrolled.toLocaleString()}</span>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-brand-dark-border">
          <div>
            {course.price === 'FREE' ? (
              <span className="text-lg font-bold text-primary-500">FREE</span>
            ) : (
              <span className="text-lg font-bold text-brand-text dark:text-brand-dark-text">₹{course.price}</span>
            )}
          </div>
          <a
            href={course.videoUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0A0A0A] dark:bg-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <Play size={11} /> Enroll Now
          </a>
        </div>
      </div>
    </motion.div>
  )
}

export default function Courses() {
  const { courses } = useContentStore()
  const [searchParams] = useSearchParams()
  const initGroup = (searchParams.get('group') || 'College & Tech Courses') as CourseGroup
  const initSub = searchParams.get('sub') as CourseSubcategory | null

  const [activeGroup, setActiveGroup] = useState<CourseGroup>(initGroup)
  const [activeSub, setActiveSub] = useState<CourseSubcategory | null>(initSub)
  const [activeLevel, setActiveLevel] = useState('All Levels')
  const [activePrice, setActivePrice] = useState('All')
  const [search, setSearch] = useState('')

  const published = courses.filter(c => c.status === 'Published')

  const filtered = useMemo(() => {
    return published.filter(c => {
      if (c.group !== activeGroup) return false
      if (activeSub && c.subcategory !== activeSub) return false
      if (activeLevel !== 'All Levels' && c.level !== activeLevel) return false
      if (activePrice === 'Free' && c.price !== 'FREE') return false
      if (activePrice === 'Paid' && c.price === 'FREE') return false
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [published, activeGroup, activeSub, activeLevel, activePrice, search])

  const groupStats = GROUPS.map(g => ({
    ...g,
    count: published.filter(c => c.group === g.label).length
  }))

  return (
    <div className="min-h-screen bg-white dark:bg-brand-dark-bg pt-16">
      {/* Hero — clean light section */}
      <div className="bg-gray-50 dark:bg-brand-dark-card border-b border-gray-100 dark:border-brand-dark-border py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-brand-muted dark:text-brand-dark-muted border border-gray-200 dark:border-brand-dark-border rounded-full mb-4 tracking-widest uppercase">
              Courses
            </span>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-black text-brand-text dark:text-brand-dark-text mb-4 tracking-tight"
            >
              Learn Without Limits
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-brand-muted dark:text-brand-dark-muted text-lg max-w-2xl mx-auto mb-8"
            >
              From Class 1 to placement — explore {published.length}+ expert-curated courses across all domains.
            </motion.p>
          </div>
          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative max-w-lg mx-auto"
          >
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="input pl-12"
            />
          </motion.div>
        </div>
      </div>

      {/* Group Tabs */}
      <div className="sticky top-16 z-30 bg-white dark:bg-brand-dark-bg border-b border-gray-100 dark:border-brand-dark-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
            {groupStats.map(g => (
              <button
                key={g.label}
                onClick={() => { setActiveGroup(g.label); setActiveSub(null) }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  activeGroup === g.label
                    ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black'
                    : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                {g.label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeGroup === g.label ? 'bg-white/20 dark:bg-black/20' : 'bg-gray-100 dark:bg-white/10'}`}>
                  {g.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
        {/* Sidebar */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <div className="sticky top-32">
            <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-3">Subcategory</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveSub(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!activeSub ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}
                >
                  All ({published.filter(c => c.group === activeGroup).length})
                </button>
                {SUBCATEGORIES[activeGroup].map(sub => {
                  const cnt = published.filter(c => c.group === activeGroup && c.subcategory === sub).length
                  return (
                    <button
                      key={sub}
                      onClick={() => setActiveSub(sub)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${activeSub === sub ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                      <span className="truncate">{sub}</span>
                      {cnt > 0 && <span className={`text-[10px] font-bold ml-1 px-1.5 py-0.5 rounded-full ${activeSub === sub ? 'bg-white/20 dark:bg-black/20' : 'bg-gray-100 dark:bg-white/10'}`}>{cnt}</span>}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-brand-dark-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-3">Level</h3>
                {LEVELS.map(l => (
                  <button key={l} onClick={() => setActiveLevel(l)} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${activeLevel === l ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}>{l}</button>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-brand-dark-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-3">Price</h3>
                {PRICES.map(p => (
                  <button key={p} onClick={() => setActivePrice(p)} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${activePrice === p ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text">{activeSub || activeGroup}</h2>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">{filtered.length} course{filtered.length !== 1 ? 's' : ''} found</p>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen size={48} className="mx-auto text-gray-200 dark:text-brand-dark-muted mb-4" />
              <h3 className="text-lg font-semibold text-brand-text dark:text-brand-dark-text mb-2">No courses found</h3>
              <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map(course => <CourseCard key={course.id} course={course} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
