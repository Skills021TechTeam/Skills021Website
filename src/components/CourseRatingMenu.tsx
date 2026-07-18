import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MoreVertical, Star, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import StarRating from './StarRating'
import { getRatingSummary, submitRating, RatingSummary } from '../lib/videoEngagementService'

interface CourseRatingMenuProps {
  courseId: string
  userId: string | null
  isEnrolled: boolean
  onRated?: (average: number, count: number) => void
}

export default function CourseRatingMenu({ courseId, userId, isEnrolled, onRated }: CourseRatingMenuProps) {
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState<RatingSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [draftRating, setDraftRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const s = await getRatingSummary(courseId, 'course', userId ?? undefined)
      setSummary(s)
      setDraftRating(s.userRating ?? 0)
      onRated?.(s.average, s.count)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load ratings')
    } finally {
      setLoading(false)
    }
  }

  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) load()
  }

  const handleSubmit = async () => {
    if (!userId) return
    if (draftRating < 1) {
      toast.error('Please select a star rating')
      return
    }
    setSubmitting(true)
    try {
      await submitRating(courseId, userId, 'course', draftRating, feedback)
      toast.success('Thanks for your rating!')
      await load()
      setFeedback('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggleOpen}
        title="Rate & review this course"
        className="w-6 h-6 rounded-md bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors flex-shrink-0"
      >
        <MoreVertical size={13} className="text-brand-muted dark:text-brand-dark-muted" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 bottom-full mb-2 w-56 bg-white dark:bg-brand-dark-card border border-gray-100 dark:border-brand-dark-border rounded-lg shadow-xl p-3 z-30"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted dark:text-brand-dark-muted">Rating & Feedback</span>
              {loading && <Loader2 size={12} className="animate-spin text-brand-muted" />}
            </div>

            {summary && (
              <div className="flex items-center gap-1.5 mb-2.5">
                <Star size={13} className="text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-brand-text dark:text-brand-dark-text">{summary.average || '—'}</span>
                <span className="text-[10px] text-brand-muted dark:text-brand-dark-muted">({summary.count} rating{summary.count !== 1 ? 's' : ''})</span>
              </div>
            )}

            {!userId ? (
              <p className="text-xs text-brand-muted dark:text-brand-dark-muted">Log in to rate this course.</p>
            ) : !isEnrolled ? (
              <p className="text-xs text-brand-muted dark:text-brand-dark-muted">Enroll in this course to leave a rating.</p>
            ) : summary?.userRating ? (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-brand-text dark:text-brand-dark-text">Your rating</p>
                <StarRating value={summary.userRating} size={16} readOnly />
                {summary.userFeedback && (
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted bg-gray-50 dark:bg-white/5 rounded-md p-2">
                    {summary.userFeedback}
                  </p>
                )}
                <p className="text-[10px] text-brand-muted dark:text-brand-dark-muted">Thanks for your feedback!</p>
              </div>
            ) : (
              <div className="space-y-2">
                <StarRating value={draftRating} onChange={setDraftRating} size={16} />
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Optional feedback..."
                  rows={2}
                  className="input text-xs resize-none"
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-1.5 text-[11px] font-semibold bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-60 transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
