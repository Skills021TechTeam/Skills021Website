import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, Clock, MapPin, Globe, Zap, ChevronRight, Building2, Users, Calendar, DollarSign, Filter } from 'lucide-react'
import { useTrainingStore, InternshipCategory } from '../store/trainingStore'
import toast from 'react-hot-toast'

const CATEGORIES: InternshipCategory[] = [
  'Summer Internship', 'Winter Internship', 'Virtual Internship',
  'Industrial Training', 'Live Project', 'Placement Training'
]

const CAT_COLORS: Record<InternshipCategory, string> = {
  'Summer Internship': 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
  'Winter Internship': 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  'Virtual Internship': 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
  'Industrial Training': 'text-teal-500 bg-teal-50 dark:bg-teal-900/20',
  'Live Project': 'text-green-500 bg-green-50 dark:bg-green-900/20',
  'Placement Training': 'text-red-500 bg-red-50 dark:bg-red-900/20',
}

export default function Internships() {
  const { internships } = useTrainingStore()
  const [activeCategory, setActiveCategory] = useState<InternshipCategory | null>(null)
  const [activeMode, setActiveMode] = useState<string>('All')
  const [activeDomain, setActiveDomain] = useState<string>('All')

  const published = internships.filter(i => i.status === 'Published')
  const domains = ['All', ...Array.from(new Set(published.map(i => i.domain)))]

  const filtered = published.filter(i => {
    if (activeCategory && i.category !== activeCategory) return false
    if (activeMode !== 'All' && i.mode !== activeMode) return false
    if (activeDomain !== 'All' && i.domain !== activeDomain) return false
    return true
  })

  const handleApply = (internship: typeof internships[0]) => {
    if (internship.applyUrl && internship.applyUrl !== '#') {
      window.open(internship.applyUrl, '_blank')
    } else {
      toast.success(`Applied for "${internship.title}" at ${internship.company}! We'll get back to you shortly.`)
    }
  }

  const stats = [
    { val: published.length + '+', label: 'Opportunities' },
    { val: published.reduce((a, i) => a + i.applications, 0).toLocaleString() + '+', label: 'Applications' },
    { val: published.filter(i => i.stipend !== 'Unpaid').length + '+', label: 'Paid Positions' },
    { val: Array.from(new Set(published.map(i => i.domain))).length + '+', label: 'Domains' },
  ]

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0F0F1A] via-[#0A1A2A] to-[#0F1A0F] py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-teal-400 bg-teal-400/10 border border-teal-400/30 rounded-full mb-4 uppercase tracking-widest">
              <Briefcase size={13} /> Internships & Training
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Launch Your <span className="gradient-text">Career</span>
            </h1>
            <p className="text-slate-400 max-w-xl mx-auto mb-8">
              Real projects, real experience. Find internships and training programs tailored to your skills and goals.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
                <div className="text-xl font-bold text-white">{s.val}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="sticky top-16 z-30 bg-white dark:bg-[#0F0F1A] border-b border-brand-border dark:border-brand-dark-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${!activeCategory ? 'bg-primary-500 text-white' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              All ({published.length})
            </button>
            {CATEGORIES.map(cat => {
              const cnt = published.filter(i => i.category === cat).length
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-primary-500 text-white' : `${CAT_COLORS[cat]} border border-transparent`}`}
                >
                  {cat} ({cnt})
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-brand-muted dark:text-brand-dark-muted font-medium">Mode:</span>
            {['All', 'Online', 'Offline', 'Hybrid'].map(m => (
              <button key={m} onClick={() => setActiveMode(m)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeMode === m ? 'bg-primary-500 text-white' : 'bg-white dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted'}`}>{m}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-brand-muted dark:text-brand-dark-muted font-medium">Domain:</span>
            <select
              value={activeDomain}
              onChange={e => setActiveDomain(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card text-brand-text dark:text-brand-dark-text"
            >
              {domains.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <span className="ml-auto text-sm text-brand-muted dark:text-brand-dark-muted">{filtered.length} opportunities</span>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filtered.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  whileHover={{ y: -4 }}
                  className="card p-5 group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0">
                      <Building2 size={22} className="text-teal-500" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text group-hover:text-primary-500 transition-colors leading-snug">{item.title}</h3>
                      <p className="text-xs text-primary-500 font-semibold">{item.company}</p>
                    </div>
                  </div>

                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-3 line-clamp-2 leading-relaxed">{item.description}</p>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 text-xs text-brand-muted dark:text-brand-dark-muted">
                      <DollarSign size={11} className="text-green-500 flex-shrink-0" />
                      <span className={item.stipend === 'Unpaid' ? 'text-gray-400' : 'font-semibold text-green-600 dark:text-green-400'}>{item.stipend}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-brand-muted dark:text-brand-dark-muted">
                      <Clock size={11} className="flex-shrink-0" /> {item.duration}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-brand-muted dark:text-brand-dark-muted">
                      {item.mode === 'Online' ? <Globe size={11} className="flex-shrink-0 text-primary-500" /> : <MapPin size={11} className="flex-shrink-0 text-primary-500" />}
                      {item.mode}{item.location && ` · ${item.location}`}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-brand-muted dark:text-brand-dark-muted">
                      <Calendar size={11} className="flex-shrink-0 text-red-500" />
                      Apply by {item.applicationDeadline}
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.skills.slice(0, 3).map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full font-medium">{s}</span>
                    ))}
  	          </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${CAT_COLORS[item.category]}`}>{item.category}</span>
                    <button
                      onClick={() => handleApply(item)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-xl text-xs font-semibold hover:bg-primary-600 transition-colors"
                    >
                      Apply Now <ChevronRight size={13} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20">
            <Briefcase size={48} className="mx-auto text-brand-muted opacity-30 mb-4" />
            <h3 className="text-lg font-semibold text-brand-text dark:text-brand-dark-text">No internships found</h3>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-2">Try changing filters or check back soon!</p>
          </div>
        )}
      </div>
    </div>
  )
}
