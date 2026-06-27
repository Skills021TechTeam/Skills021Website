import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Map, ChevronRight, Clock, Eye, CheckCircle, Circle, ArrowRight, Zap } from 'lucide-react'
import { useContentStore } from '../store/contentStore'

const LEVEL_COLORS = {
  Foundation: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  Intermediate: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  Advanced: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
}

export default function Roadmaps() {
  const { roadmaps } = useContentStore()
  const [selected, setSelected] = useState<typeof roadmaps[0] | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Record<string, Set<string>>>({})

  const published = roadmaps.filter(r => r.status === 'Published')

  const toggleStep = (roadmapId: string, stepId: string) => {
    setCompletedSteps(prev => {
      const cur = new Set(prev[roadmapId] || [])
      if (cur.has(stepId)) cur.delete(stepId)
      else cur.add(stepId)
      return { ...prev, [roadmapId]: cur }
    })
  }

  const getProgress = (roadmapId: string, total: number) => {
    const done = (completedSteps[roadmapId] || new Set()).size
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
  }

  if (selected) {
    const prog = getProgress(selected.id, selected.steps.length)
    return (
      <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0F0F1A] to-[#1A1040] py-10 px-4">
          <div className="max-w-3xl mx-auto">
            <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-4">
              ← Back to Roadmaps
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{selected.title}</h1>
            <p className="text-slate-400 mb-4">{selected.description}</p>
            <div className="flex items-center gap-4 text-sm text-slate-400 mb-6">
              <span className="flex items-center gap-1.5"><Clock size={14} />{selected.totalDuration}</span>
              <span className="flex items-center gap-1.5"><Eye size={14} />{selected.views.toLocaleString()} views</span>
            </div>
            {/* Progress */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">Your Progress</span>
                <span className="text-sm font-bold text-teal-400">{prog.done}/{prog.total} steps • {prog.pct}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-teal-500 to-primary-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${prog.pct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500/50 to-transparent" />

            <div className="space-y-6">
              {selected.steps.map((step, idx) => {
                const done = (completedSteps[selected.id] || new Set()).has(step.id)
                const lc = LEVEL_COLORS[step.level]
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative flex gap-4"
                  >
                    {/* Circle */}
                    <div className="relative z-10 flex-shrink-0">
                      <button
                        onClick={() => toggleStep(selected.id, step.id)}
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${done ? 'bg-green-500 border-green-500 shadow-lg shadow-green-500/30' : 'bg-white dark:bg-brand-dark-card border-brand-border dark:border-brand-dark-border hover:border-primary-500'}`}
                      >
                        {done ? <CheckCircle size={22} className="text-white" /> : <span className="text-sm font-bold text-brand-muted dark:text-brand-dark-muted">{idx + 1}</span>}
                      </button>
                    </div>

                    {/* Content */}
                    <div className={`flex-1 card p-5 ${done ? 'opacity-75' : ''}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className={`text-base font-bold ${done ? 'line-through text-brand-muted dark:text-brand-dark-muted' : 'text-brand-text dark:text-brand-dark-text'}`}>
                          {step.title}
                        </h3>
                        <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${lc.bg} ${lc.text} ${lc.border}`}>
                          {step.level}
                        </span>
                      </div>
                      <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-3 leading-relaxed">{step.description}</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-brand-muted dark:text-brand-dark-muted">
                          <Clock size={11} /> Est. {step.estimatedTime}
                        </span>
                        {step.resources.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {step.resources.map((r, i) => (
                              <span key={i} className="text-[11px] px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full font-medium">
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleStep(selected.id, step.id)}
                        className={`mt-4 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${done ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/30'}`}
                      >
                        {done ? <><CheckCircle size={13} /> Completed!</> : <><Circle size={13} /> Mark as Done</>}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {prog.pct === 100 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-500/30 rounded-2xl p-8">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-2">Roadmap Completed!</h3>
              <p className="text-brand-muted dark:text-brand-dark-muted text-sm">You've completed all steps in "{selected.title}". Keep up the great work!</p>
            </motion.div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0F0F1A] via-[#1A1040] to-[#0F1A0F] py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-green-400 bg-green-400/10 border border-green-400/30 rounded-full mb-4 uppercase tracking-widest">
              <Map size={13} /> Career Roadmaps
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Your Path to <span className="gradient-text">Success</span>
            </h1>
            <p className="text-slate-400 max-w-xl mx-auto">
              Visual, step-by-step roadmaps for every career goal. Track your progress and stay on course.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Roadmap Grid */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {published.map((rm, idx) => {
            const prog = getProgress(rm.id, rm.steps.length)
            return (
              <motion.div
                key={rm.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelected(rm)}
                className="card p-5 cursor-pointer group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-teal-500 rounded-2xl flex items-center justify-center mb-4">
                  <Map size={22} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text mb-1 group-hover:text-primary-500 transition-colors">
                  {rm.title}
                </h3>
                <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-4 line-clamp-2">{rm.description}</p>

                <div className="flex items-center gap-3 text-xs text-brand-muted dark:text-brand-dark-muted mb-4">
                  <span className="flex items-center gap-1"><Zap size={11} />{rm.steps.length} Steps</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{rm.totalDuration}</span>
                  <span className="flex items-center gap-1"><Eye size={11} />{(rm.views / 1000).toFixed(0)}K</span>
                </div>

                {/* Progress */}
                {prog.done > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-brand-muted dark:text-brand-dark-muted">Progress</span>
                      <span className="font-bold text-primary-500">{prog.pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${prog.pct}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full font-medium">{rm.category}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-primary-500 group-hover:gap-2 transition-all">
                    Explore <ArrowRight size={13} />
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {published.length === 0 && (
          <div className="text-center py-20">
            <Map size={48} className="mx-auto text-brand-muted opacity-30 mb-4" />
            <h3 className="text-lg font-semibold text-brand-text dark:text-brand-dark-text">No roadmaps available yet</h3>
          </div>
        )}
      </div>
    </div>
  )
}
