import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Trash2, Loader2, ListVideo, MessageSquare, Star, Lock, FileText, Download, ExternalLink, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { Course, Resource } from '../store/contentStore'
import StarRating from './StarRating'
import ConfirmDownloadDialog from './ConfirmDownloadDialog'
import { fetchNotesForSubject, triggerResourceDownload, incrementDownloadCount } from '../lib/resourceService'
import { getBackblazeVideoUrl } from '../lib/backblazeService'
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
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [playbackLoading, setPlaybackLoading] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)

  // ── Tab selector ──
  const [sidebarTab, setSidebarTab] = useState<'chapters' | 'courseNotes'>('chapters')

  // ── Course notes (actual PDFs/resources uploaded via the Resources panel) ──
  const [courseNoteResources, setCourseNoteResources] = useState<Resource[]>([])
  const [courseNotesLoading, setCourseNotesLoading] = useState(true)
  const [dialogResource, setDialogResource] = useState<Resource | null>(null)
  const [isDownloadingNote, setIsDownloadingNote] = useState(false)

  // Some browsers/embedded webviews default a freshly-mounted <video> to
  // muted (a leftover autoplay-policy heuristic) even without the `muted`
  // attribute set. Explicitly force it unmuted at full volume so course
  // videos always play with sound, the way a normal YouTube video would.
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.muted = false
    el.defaultMuted = false
    el.volume = 1
  }, [canWatch, course.videoUrl])

  useEffect(() => {
    if (!canWatch || !course.videoUrl) {
      setPlaybackUrl(null)
      setPlaybackLoading(false)
      return
    }
    let active = true
    setPlaybackLoading(true)
    getBackblazeVideoUrl(course.videoUrl)
      .then((url) => { if (active) setPlaybackUrl(url) })
      .catch((err) => {
        if (active) {
          setPlaybackUrl(null)
          toast.error(err instanceof Error ? err.message : 'Failed to authorize video playback')
        }
      })
      .finally(() => { if (active) setPlaybackLoading(false) })
    return () => { active = false }
  }, [canWatch, course.videoUrl])

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

  useEffect(() => {
    if (!canWatch) { setCourseNotesLoading(false); return }
    (async () => {
      try {
        const subjectToMatch = (course.notesSubject && course.notesSubject.trim()) || course.title || ''
        const res = await fetchNotesForSubject(subjectToMatch)
        setCourseNoteResources(res)
      } catch (err) {
        console.error('Failed to load course notes:', err)
      } finally {
        setCourseNotesLoading(false)
      }
    })()
  }, [course.id, course.title, course.notesSubject, canWatch])

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.muted = false
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

  // ── Course notes (Resources panel) download handling ──
  const handleOpenNoteDialog = (resource: Resource) => {
    if (resource.isPremium) {
      toast.error('This is a premium resource. Please purchase it from the Resources page.')
      return
    }
    setDialogResource(resource)
  }

  const handleConfirmNoteDownload = async () => {
    if (!dialogResource || isDownloadingNote) return
    if (!dialogResource.downloadUrl) {
      toast.error('Download file is not available.')
      setDialogResource(null)
      return
    }
    setIsDownloadingNote(true)
    try {
      await triggerResourceDownload(dialogResource.downloadUrl, dialogResource.title)
      const { id, downloads } = dialogResource
      setCourseNoteResources(prev => prev.map(r => (r.id === id ? { ...r, downloads: r.downloads + 1 } : r)))
      toast.success(`Downloading: ${dialogResource.title}`)
      incrementDownloadCount(id, downloads).catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download note')
    } finally {
      setIsDownloadingNote(false)
      setDialogResource(null)
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
                      <video
                        ref={videoRef}
                        src={playbackUrl || undefined}
                        controls
                        muted={false}
                        playsInline
                        preload="metadata"
                        controlsList="nodownload"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">
                        No video uploaded for this course yet.
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-1">{course.title}</h3>
                    <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-4">By {course.instructor}</p>

                    {/* About this course */}
                    {course.description && (
                      <div className="mb-5 pb-5 border-b border-gray-100 dark:border-brand-dark-border">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-2">
                          About this course
                        </h4>
                        <p
                          className={`text-sm text-brand-text/80 dark:text-brand-dark-text/80 leading-relaxed whitespace-pre-line ${
                            descExpanded ? '' : 'line-clamp-3'
                          }`}
                        >
                          {course.description}
                        </p>
                        {course.description.length > 140 && (
                          <button
                            onClick={() => setDescExpanded(v => !v)}
                            className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors"
                          >
                            {descExpanded ? 'Show less' : 'Show more'}
                            <ChevronDown size={13} className={`transition-transform ${descExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Instructor Rating */}
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 mb-6">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-semibold text-brand-text dark:text-brand-dark-text whitespace-nowrap">
                          {instructorRating?.userRating ? 'Your rating' : 'Rate instructor'}
                        </span>
                        <StarRating
                          value={instructorRating?.userRating ?? draftInstructorRating}
                          onChange={instructorRating?.userRating ? undefined : setDraftInstructorRating}
                          size={17}
                          readOnly={!!instructorRating?.userRating}
                        />
                        {!instructorRating?.userRating && (
                          <button
                            onClick={handleSubmitInstructorRating}
                            disabled={submittingRating || draftInstructorRating < 1}
                            aria-label="Submit rating"
                            className="flex-shrink-0 p-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {submittingRating ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 pl-4 border-l border-gray-200 dark:border-white/10 flex-shrink-0">
                        <Star size={14} className="text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-brand-text dark:text-brand-dark-text tabular-nums">
                          {instructorRating?.average || '—'}
                        </span>
                        <span className="text-xs text-brand-muted dark:text-brand-dark-muted">
                          ({instructorRating?.count ?? 0})
                        </span>
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

                {/* Chapters / My Notes sidebar */}
                <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-brand-dark-border p-5">
                  {/* Tab switcher */}
                  <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
                    <button
                      onClick={() => setSidebarTab('chapters')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        sidebarTab === 'chapters'
                          ? 'bg-white dark:bg-brand-dark-card text-brand-text dark:text-brand-dark-text shadow-sm'
                          : 'text-brand-muted dark:text-brand-dark-muted'
                      }`}
                    >
                      <ListVideo size={13} /> Chapters
                    </button>
                    <button
                      onClick={() => setSidebarTab('courseNotes')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        sidebarTab === 'courseNotes'
                          ? 'bg-white dark:bg-brand-dark-card text-brand-text dark:text-brand-dark-text shadow-sm'
                          : 'text-brand-muted dark:text-brand-dark-muted'
                      }`}
                    >
                      <FileText size={13} /> Notes{courseNoteResources.length > 0 ? ` (${courseNoteResources.length})` : ''}
                    </button>
                  </div>

                  {sidebarTab === 'chapters' ? (
                    loading ? (
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
                    )
                  ) : sidebarTab === 'courseNotes' ? (
                    courseNotesLoading ? (
                      <div className="text-center py-6"><Loader2 size={20} className="animate-spin mx-auto text-brand-muted" /></div>
                    ) : courseNoteResources.length === 0 ? (
                      <p className="text-xs text-brand-muted dark:text-brand-dark-muted">No published notes found yet for "{(course.notesSubject && course.notesSubject.trim()) || course.title}" in the Resources panel.</p>
                    ) : (
                      <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
                        {courseNoteResources.map(r => (
                          <div key={r.id} className="p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                                <FileText size={14} className="text-primary-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-brand-text dark:text-brand-dark-text leading-snug line-clamp-2">{r.title}</p>
                                <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted mt-0.5">{r.subject}{r.author ? ` · ${r.author}` : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2.5">
                              {r.isPremium ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">PREMIUM</span>
                              ) : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">FREE</span>}
                              <button
                                onClick={() => handleOpenNoteDialog(r)}
                                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                              >
                                {r.isPremium ? <ExternalLink size={11} /> : <Download size={11} />}
                                {r.isPremium ? 'View' : 'Download'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      <ConfirmDownloadDialog
        isOpen={!!dialogResource}
        resourceTitle={dialogResource?.title ?? ''}
        isLoading={isDownloadingNote}
        onCancel={() => { if (!isDownloadingNote) setDialogResource(null) }}
        onConfirm={handleConfirmNoteDownload}
      />
    </AnimatePresence>
  )
}
