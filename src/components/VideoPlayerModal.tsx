import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Trash2, Loader2, ListVideo, MessageSquare, Star, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { Course } from '../store/contentStore'
import StarRating from './StarRating'
import {
  getTimestamps, getComments, addComment, deleteComment,
  getRatingSummary, submitRating,
  formatSeconds, VideoTimestamp, VideoComment, RatingSummary,
} from '../lib/videoEngagementService'

interface VideoPlayerModalProps {
  course: Course
  userId: string
  userName: string
  isAdmin: boolean
  canWatch: boolean // enrolled OR admin
  onClose: () => void
}

export default function VideoPlayerModal({ course, userId, userName, isAdmin, canWatch, onClose }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [timestamps, setTimestamps] = useState<VideoTimestamp[]>([])
  const [comments, setComments] = useState<VideoComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [instructorRating, setInstructorRating] = useState<RatingSummary | null>(null)
  const [draftInstructorRating, setDraftInstructorRating] = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canWatch) { setLoading(false); return }
    (async () => {
      try {
        const [ts, cm, ir] = await Promise.all([
          getTimestamps(course.id),
          getComments(course.id),
          getRatingSummary(course.id, 'instructor', userId),
        ])
        setTimestamps(ts)
        setComments(cm)
        setInstructorRating(ir)
        setDraftInstructorRating(ir.userRating ?? 0)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load video data')
      } finally {
        setLoading(false)
      }
    })()
  }, [course.id, canWatch, userId])

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds
      videoRef.current.play().catch(() => {})
    }
  }

  const handlePostComment = async () => {
    if (!newComment.trim()) return
    setPosting(true)
    try {
      const c = await addComment(course.id, userId, userName, newComment.trim())
      setComments(prev => [c, ...prev])
      setNewComment('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setPosting(false)
    }
  }

  const handleDeleteComment = async (id: string) => {
    try {
      await deleteComment(id)
      setComments(prev => prev.filter(c => c.id !== id))
      toast.success('Comment deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete comment')
    }
  }

  const handleSubmitInstructorRating = async () => {
    if (draftInstructorRating < 1) {
      toast.error('Please select a star rating')
      return
    }
    setSubmittingRating(true)
    try {
      await submitRating(course.id, userId, 'instructor', draftInstructorRating)
      const ir = await getRatingSummary(course.id, 'instructor', userId)
      setInstructorRating(ir)
      toast.success('Thanks for rating the instructor!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit rating')
    } finally {
      setSubmittingRating(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[85vh] bg-white dark:bg-brand-dark-card rounded-2xl overflow-hidden flex flex-col"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors"
          >
            <X size={20} className="text-white" />
          </button>

          {!canWatch ? (
            <div className="p-12 text-center">
              <Lock size={40} className="mx-auto text-brand-muted dark:text-brand-dark-muted mb-4" />
              <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-2">Enroll to watch this video</h3>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted">Only enrolled students can view course videos.</p>
            </div>
          ) : (
            <div className="overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3">
                {/* Video + Comments + Instructor rating */}
                <div className="lg:col-span-2 flex flex-col">
                  <div className="aspect-video max-h-[42vh] bg-black">
                    {course.videoUrl ? (
                      <video ref={videoRef} src={course.videoUrl} controls className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">
                        No video uploaded for this course yet.
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-1">{course.title}</h3>
                    <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-5">By {course.instructor}</p>

                    {/* Instructor Rating */}
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Star size={16} className="text-amber-400" />
                        <span className="text-sm font-semibold text-brand-text dark:text-brand-dark-text">Rate the Instructor</span>
                        {instructorRating && (
                          <span className="text-xs text-brand-muted dark:text-brand-dark-muted ml-auto">
                            {instructorRating.average || '—'} avg · {instructorRating.count} rating{instructorRating.count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <StarRating
                          value={instructorRating?.userRating ?? draftInstructorRating}
                          onChange={instructorRating?.userRating ? undefined : setDraftInstructorRating}
                          size={22}
                          readOnly={!!instructorRating?.userRating}
                        />
                        {instructorRating?.userRating ? (
                          <span className="text-xs text-brand-muted dark:text-brand-dark-muted">Thanks for your rating!</span>
                        ) : (
                          <button
                            onClick={handleSubmitInstructorRating}
                            disabled={submittingRating}
                            className="px-3 py-1.5 text-xs font-semibold bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-60 transition-colors flex items-center gap-1.5"
                          >
                            {submittingRating ? <Loader2 size={13} className="animate-spin" /> : null}
                            Submit Rating
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Comments */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare size={16} className="text-brand-muted dark:text-brand-dark-muted" />
                        <span className="text-sm font-semibold text-brand-text dark:text-brand-dark-text">Comments ({comments.length})</span>
                      </div>

                      <div className="flex gap-2 mb-4">
                        <input
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                          placeholder="Add a comment..."
                          className="input flex-1 text-sm"
                        />
                        <button
                          onClick={handlePostComment}
                          disabled={posting || !newComment.trim()}
                          className="px-3 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
                        >
                          {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      </div>

                      {loading ? (
                        <div className="text-center py-6"><Loader2 size={20} className="animate-spin mx-auto text-brand-muted" /></div>
                      ) : comments.length === 0 ? (
                        <p className="text-xs text-brand-muted dark:text-brand-dark-muted text-center py-6">No comments yet. Be the first!</p>
                      ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          {comments.map(c => (
                            <div key={c.id} className="flex items-start justify-between gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">{c.userName}</span>
                                  <span className="text-[10px] text-brand-muted dark:text-brand-dark-muted">{new Date(c.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-brand-muted dark:text-brand-dark-muted break-words">{c.comment}</p>
                              </div>
                              {(isAdmin || c.userId === userId) && (
                                <button onClick={() => handleDeleteComment(c.id)} className="p-1 text-red-400 hover:text-red-600 flex-shrink-0">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timestamps sidebar */}
                <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-brand-dark-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ListVideo size={16} className="text-brand-muted dark:text-brand-dark-muted" />
                    <span className="text-sm font-semibold text-brand-text dark:text-brand-dark-text">Chapters</span>
                  </div>
                  {loading ? (
                    <div className="text-center py-6"><Loader2 size={20} className="animate-spin mx-auto text-brand-muted" /></div>
                  ) : timestamps.length === 0 ? (
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted">No chapters added for this video yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {timestamps.map(t => (
                        <button
                          key={t.id}
                          onClick={() => seekTo(t.timeSeconds)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-left transition-colors"
                        >
                          <span className="text-xs font-mono font-semibold text-primary-500 flex-shrink-0">{formatSeconds(t.timeSeconds)}</span>
                          <span className="text-xs text-brand-text dark:text-brand-dark-text truncate">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
