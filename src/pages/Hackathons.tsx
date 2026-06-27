import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Calendar, Users, Globe, MapPin, ChevronRight, Clock, Award, Zap } from 'lucide-react'
import { useEventStore, HackathonCategory } from '../store/eventStore'
import toast from 'react-hot-toast'

const MODE_ICONS = { Online: Globe, Offline: MapPin, Hybrid: Zap }

const STATUS_STYLES = {
  Upcoming: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400',
  Ongoing: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
  Completed: 'text-gray-500 bg-gray-100 dark:bg-white/10',
}

export default function Hackathons() {
  const { hackathons } = useEventStore()
  const [activeMode, setActiveMode] = useState<string>('All')

  const published = hackathons.filter(h => h.publishStatus === 'Published')
  const filtered = published.filter(h => {
    if (activeMode !== 'All' && h.mode !== activeMode) return false
    return true
  })

  const stats = {
    total: published.length,
    upcoming: published.filter(h => h.status === 'Upcoming').length,
    totalPrize: '₹1Cr+',
    participants: published.reduce((a, h) => a + h.registrations, 0),
  }

  return (
    <div className="min-h-screen bg-white dark:bg-brand-dark-bg pt-16">
      {/* Hero — clean */}
      <div className="bg-gray-50 dark:bg-brand-dark-card border-b border-gray-100 dark:border-brand-dark-border py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-brand-muted dark:text-brand-dark-muted border border-gray-200 dark:border-brand-dark-border rounded-full mb-4 uppercase tracking-widest">
              Hackathons & Competitions
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-brand-text dark:text-brand-dark-text mb-4 tracking-tight">
              Build. Innovate. Win.
            </h1>
            <p className="text-brand-muted dark:text-brand-dark-muted max-w-xl mx-auto">
              Compete in hackathons from school to international level. Build real products, win prizes, get recognized.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {[
              { val: stats.total, label: 'Total Events' },
              { val: stats.upcoming, label: 'Upcoming' },
              { val: stats.totalPrize, label: 'Prize Pool' },
              { val: stats.participants.toLocaleString() + '+', label: 'Registered' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-brand-dark-bg rounded-2xl p-4 text-center border border-gray-100 dark:border-brand-dark-border">
                <div className="text-2xl font-black text-brand-text dark:text-brand-dark-text">{s.val}</div>
                <div className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Mode Filter bar */}
      <div className="sticky top-16 z-30 bg-white dark:bg-brand-dark-bg border-b border-gray-100 dark:border-brand-dark-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            {['All', 'Online', 'Offline', 'Hybrid'].map(m => (
              <button
                key={m}
                onClick={() => setActiveMode(m)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeMode === m ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-brand-dark-card border border-gray-200 dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted hover:border-gray-400'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <span className="text-sm text-brand-muted dark:text-brand-dark-muted">{filtered.length} events</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filtered.map((h, idx) => {
                const ModeIcon = MODE_ICONS[h.mode]
                const deadline = new Date(h.registrationDeadline)
                const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000))
                return (
                  <motion.div
                    key={h.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border overflow-hidden group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
                  >
                    {/* Banner — clean dark */}
                    <div className="h-32 bg-gray-900 dark:bg-black relative flex items-center justify-center">
                      <Trophy size={48} className="text-white/10" />
                      <div className="absolute top-3 left-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${STATUS_STYLES[h.status]}`}>{h.status}</span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white/10 text-white">{h.category}</span>
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text mb-1 group-hover:text-primary-500 transition-colors line-clamp-2">
                        {h.name}
                      </h3>
                      <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-4 line-clamp-2">{h.description}</p>

                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-center gap-2 text-xs text-brand-muted dark:text-brand-dark-muted">
                          <Calendar size={11} className="flex-shrink-0" />
                          <span>{h.startDate} – {h.endDate}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-brand-muted dark:text-brand-dark-muted">
                          <ModeIcon size={11} className="flex-shrink-0" />
                          <span>{h.mode} · Team size: {h.maxTeamSize}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-brand-muted dark:text-brand-dark-muted">
                          <Award size={11} className="flex-shrink-0" />
                          <span className="font-semibold text-brand-text dark:text-brand-dark-text">{h.prize}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-brand-muted dark:text-brand-dark-muted">
                          <Users size={11} className="flex-shrink-0" />
                          <span>{h.registrations.toLocaleString()} registered · By {h.organizer}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {h.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-brand-muted dark:text-brand-dark-muted rounded-full">{tag}</span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-brand-dark-border">
                        {h.status === 'Upcoming' && daysLeft > 0 && (
                          <span className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted flex items-center gap-1">
                            <Clock size={11} /> {daysLeft}d left
                          </span>
                        )}
                        <button
                          onClick={() => {
                            if (h.registrationUrl && h.registrationUrl !== '#') window.open(h.registrationUrl, '_blank')
                            else toast.success(`Registered for "${h.name}"!`)
                          }}
                          disabled={h.status === 'Completed'}
                          className={`ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${h.status === 'Completed' ? 'bg-gray-100 dark:bg-white/10 text-gray-400 cursor-not-allowed' : 'bg-[#0A0A0A] dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100'}`}
                        >
                          {h.status === 'Completed' ? 'Ended' : 'Register'} <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20">
            <Trophy size={48} className="mx-auto text-gray-200 dark:text-brand-dark-muted mb-4" />
            <h3 className="text-lg font-semibold text-brand-text dark:text-brand-dark-text">No hackathons found</h3>
            <p className="text-brand-muted text-sm mt-2">Check back soon for upcoming events!</p>
          </div>
        )}
      </div>
    </div>
  )
}
