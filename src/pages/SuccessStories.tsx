import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Award, Briefcase, GraduationCap, Quote, ChevronRight, Play } from 'lucide-react'
import { useTestimonialsStore } from '../store/testimonialsStore'

const STORY_TYPES = ['All', 'Placement', 'Admission', 'Internship'] as const
const TEST_TYPES = ['All', 'General', 'Placement', 'Admission', 'Internship', 'Counseling'] as const

const TYPE_ICONS = {
  Placement: Briefcase,
  Admission: GraduationCap,
  Internship: Award,
  General: Star,
  Counseling: Star,
}

export default function SuccessStories() {
  const { testimonials, stories } = useTestimonialsStore()
  const [activeTab, setActiveTab] = useState<'stories' | 'testimonials'>('stories')
  const [storyFilter, setStoryFilter] = useState<string>('All')
  const [testFilter, setTestFilter] = useState<string>('All')

  const publishedStories = stories.filter(s => s.status === 'Published')
  const publishedTests = testimonials.filter(t => t.status === 'Published')

  const filteredStories = storyFilter === 'All' ? publishedStories : publishedStories.filter(s => s.type === storyFilter)
  const filteredTests = testFilter === 'All' ? publishedTests : publishedTests.filter(t => t.type === testFilter)

  const stats = [
    { val: (publishedStories.length + publishedTests.length) + '+', label: 'Success Stories' },
    { val: '500+', label: 'Placements' },
    { val: '200+', label: 'IIT/NIT Admits' },
    { val: '₹40 LPA', label: 'Highest Package' },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-brand-dark-bg pt-16">
      {/* Hero — clean */}
      <div className="bg-gray-50 dark:bg-brand-dark-card border-b border-gray-100 dark:border-brand-dark-border py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block px-3 py-1 text-xs font-semibold text-brand-muted dark:text-brand-dark-muted border border-gray-200 dark:border-brand-dark-border rounded-full mb-4 uppercase tracking-widest">
              Success Stories
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-brand-text dark:text-brand-dark-text mb-4 tracking-tight">
              Real Students.<br className="hidden sm:block" /> Real Results.
            </h1>
            <p className="text-brand-muted dark:text-brand-dark-muted max-w-xl mx-auto mb-8">
              Hear from students who transformed their lives with Skill021. From tier-3 colleges to FAANG, from average scores to IIT.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map(s => (
              <div key={s.label} className="bg-white dark:bg-brand-dark-bg rounded-2xl p-4 text-center border border-gray-100 dark:border-brand-dark-border">
                <div className="text-xl font-black text-brand-text dark:text-brand-dark-text">{s.val}</div>
                <div className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('stories')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'stories' ? 'bg-white dark:bg-brand-dark-card text-brand-text dark:text-brand-dark-text shadow-sm' : 'text-brand-muted dark:text-brand-dark-muted'}`}
          >
            Success Stories ({publishedStories.length})
          </button>
          <button
            onClick={() => setActiveTab('testimonials')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'testimonials' ? 'bg-white dark:bg-brand-dark-card text-brand-text dark:text-brand-dark-text shadow-sm' : 'text-brand-muted dark:text-brand-dark-muted'}`}
          >
            Testimonials ({publishedTests.length})
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'stories' ? (
            <motion.div key="stories" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* Story Filters */}
              <div className="flex flex-wrap gap-2 mb-6">
                {STORY_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setStoryFilter(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${storyFilter === t ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-brand-dark-card border border-gray-200 dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted hover:border-gray-400'}`}
                  >
                    {t} {t === 'All' && `(${publishedStories.length})`}
                  </button>
                ))}
              </div>

              {/* Video-first story grid — 3 col desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                {filteredStories.map((story, idx) => {
                  const TypeIcon = TYPE_ICONS[story.type]
                  return (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border overflow-hidden group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
                    >
                      {/* Video thumbnail area */}
                      <div className="relative h-40 bg-gray-900 dark:bg-black flex items-center justify-center">
                        {/* Initials as photo placeholder */}
                        <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-white text-2xl font-black">
                          {story.studentName[0]}
                        </div>
                        {/* Play button overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Play size={18} className="text-gray-900 ml-0.5" />
                          </div>
                        </div>
                        {/* Type badge */}
                        <div className="absolute top-3 left-3">
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/10 text-white">
                            <TypeIcon size={10} /> {story.type}
                          </span>
                        </div>
                        {/* Year */}
                        <div className="absolute top-3 right-3">
                          <span className="text-[10px] text-white/60">{story.year}</span>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="mb-3">
                          <h4 className="font-bold text-brand-text dark:text-brand-dark-text text-sm">{story.studentName}</h4>
                          <p className="text-xs text-brand-muted dark:text-brand-dark-muted">{story.fromCollege}</p>
                          {(story.toCompany || story.toCollege) && (
                            <p className="text-xs font-semibold text-primary-500 flex items-center gap-1 mt-1">
                              <ChevronRight size={11} /> {story.toCompany || story.toCollege}
                            </p>
                          )}
                          {story.package && (
                            <span className="inline-block mt-1 text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-md">
                              {story.package}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-brand-muted dark:text-brand-dark-muted leading-relaxed line-clamp-3 mb-4">
                          "{story.story}"
                        </p>

                        <button className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-brand-dark-border text-sm font-semibold text-brand-text dark:text-brand-dark-text rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <Play size={14} /> Watch Story
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {filteredStories.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-brand-muted dark:text-brand-dark-muted">No stories available for this category.</p>
                </div>
              )}

              {/* Long-form stories below */}
              <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-5">Full Stories</h3>
              <div className="space-y-4">
                {filteredStories.map((story, idx) => {
                  const TypeIcon = TYPE_ICONS[story.type]
                  return (
                    <motion.div
                      key={story.id + '-list'}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-6 hover:shadow-card-hover transition-shadow"
                    >
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Left */}
                        <div className="md:w-44 flex-shrink-0 flex md:flex-col items-center gap-4 md:gap-2 md:text-center">
                          <div className="w-16 h-16 rounded-2xl bg-[#0A0A0A] dark:bg-white flex items-center justify-center text-white dark:text-black text-2xl font-black flex-shrink-0">
                            {story.studentName[0]}
                          </div>
                          <div>
                            <h4 className="font-bold text-brand-text dark:text-brand-dark-text text-sm">{story.studentName}</h4>
                            <p className="text-xs text-brand-muted dark:text-brand-dark-muted">{story.fromCollege}</p>
                            {(story.toCompany || story.toCollege) && (
                              <p className="text-xs font-semibold text-primary-500 flex items-center gap-1 md:justify-center mt-0.5">
                                <ChevronRight size={11} /> {story.toCompany || story.toCollege}
                              </p>
                            )}
                            {story.package && (
                              <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{story.package}</span>
                            )}
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden md:block w-px bg-gray-100 dark:bg-brand-dark-border flex-shrink-0" />

                        {/* Right */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-brand-muted dark:text-brand-dark-muted">
                              <TypeIcon size={11} /> {story.type} Success
                            </span>
                            {story.course && (
                              <span className="text-xs text-brand-muted dark:text-brand-dark-muted bg-gray-100 dark:bg-white/10 px-2.5 py-1 rounded-full">
                                {story.course}
                              </span>
                            )}
                            <span className="ml-auto text-xs text-brand-muted dark:text-brand-dark-muted">{story.year}</span>
                          </div>
                          <div className="relative">
                            <Quote size={20} className="text-gray-200 dark:text-gray-700 absolute -top-1 -left-1" />
                            <p className="text-sm text-brand-muted dark:text-brand-dark-muted leading-relaxed pl-5 italic">{story.story}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div key="testimonials" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* Testimonial Filters */}
              <div className="flex flex-wrap gap-2 mb-6">
                {TEST_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setTestFilter(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${testFilter === t ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-brand-dark-card border border-gray-200 dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted hover:border-gray-400'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTests.map((t, idx) => {
                  const TypeIcon = TYPE_ICONS[t.type] || Star
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.07 }}
                      className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-5 hover:shadow-card-hover transition-shadow"
                    >
                      {/* Stars */}
                      <div className="flex items-center gap-0.5 mb-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} className={`w-4 h-4 ${i < t.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200 dark:text-gray-700 dark:fill-gray-700'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        ))}
                        <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-brand-muted dark:text-brand-dark-muted">
                          {t.type}
                        </span>
                      </div>

                      <div className="relative mb-4">
                        <Quote size={18} className="text-gray-200 dark:text-gray-700 absolute -top-1 -left-0.5" />
                        <p className="text-sm text-brand-muted dark:text-brand-dark-muted leading-relaxed pl-4 italic">{t.content}</p>
                      </div>

                      {t.achievement && (
                        <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/10 rounded-xl px-3 py-2 mb-4">
                          <Award size={14} className="text-primary-500" />
                          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{t.achievement}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0A0A0A] dark:bg-white flex items-center justify-center text-white dark:text-black text-sm font-bold flex-shrink-0">
                          {t.studentName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-brand-text dark:text-brand-dark-text">{t.studentName}</p>
                          <p className="text-xs text-brand-muted dark:text-brand-dark-muted">{t.designation}{t.college ? ` · ${t.college}` : ''}</p>
                        </div>
                        {t.course && (
                          <span className="ml-auto text-[10px] text-primary-500 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full font-medium">{t.course}</span>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
                {filteredTests.length === 0 && (
                  <div className="col-span-3 text-center py-12">
                    <p className="text-brand-muted dark:text-brand-dark-muted">No testimonials for this category.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
