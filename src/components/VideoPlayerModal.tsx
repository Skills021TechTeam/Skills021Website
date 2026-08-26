import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Send, Trash2, Loader2, ListVideo, MessageSquare,
  Star, Lock, FileText, Download, ExternalLink, ChevronDown, Play
} from 'lucide-react'
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

  // ── Tab selector for desktop sidebar & mobile sheet ──
  const [sidebarTab, setSidebarTab] = useState<'chapters' | 'courseNotes'>('courseNotes')
  const [activeMobileTab, setActiveMobileTab] = useState<'notes' | 'chapters' | 'comments' | 'overview'>('notes')

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
        className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[70] flex items-center justify-center p-0 sm:p-4 sm:p-6"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full h-full sm:h-auto sm:max-w-5xl sm:max-h-[90vh] bg-white dark:bg-brand-dark-card rounded-none sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl border-0 sm:border border-gray-100 dark:border-brand-dark-border"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close video player"
            className="absolute top-3 right-3 z-30 p-2 sm:p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all backdrop-blur-md cursor-pointer shadow-lg active:scale-95"
          >
            <X size={18} />
          </button>

          {!canWatch ? (
            <div className="p-8 sm:p-12 text-center my-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-4">
                <Lock size={32} />
              </div>
              <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-2">Enroll to watch this lecture</h3>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted max-w-sm mx-auto">
                Only enrolled students or premium members can stream lecture videos and access companion notes.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Close & Return
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Sticky Top 16:9 Video Player */}
              <div className="w-full bg-black shrink-0 relative aspect-video max-h-[36vh] sm:max-h-[48vh] flex items-center justify-center z-10 shadow-md">
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
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/60 text-sm px-4 text-center">
                    <ListVideo size={36} className="mb-2 text-white/30" />
                    <span>No video file uploaded for this course yet.</span>
                  </div>
                )}
                {playbackLoading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 text-white text-xs font-semibold backdrop-blur-xs">
                    <Loader2 size={20} className="animate-spin text-primary-400" />
                    <span>Buffering lecture stream…</span>
                  </div>
                )}
              </div>

              {/* Mobile Tab Switcher (Visible on < lg screens) */}
              <div className="lg:hidden shrink-0 flex items-center bg-gray-100 dark:bg-white/5 border-b border-gray-200 dark:border-brand-dark-border px-2 py-1.5 overflow-x-auto no-scrollbar gap-1">
                <button
                  onClick={() => setActiveMobileTab('notes')}
                  className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeMobileTab === 'notes'
                      ? 'bg-white dark:bg-brand-dark-card text-primary-600 dark:text-primary-400 shadow-xs'
                      : 'text-brand-muted dark:text-brand-dark-muted'
                  }`}
                >
                  <FileText size={14} /> Notes{courseNoteResources.length > 0 ? ` (${courseNoteResources.length})` : ''}
                </button>
                <button
                  onClick={() => setActiveMobileTab('chapters')}
                  className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeMobileTab === 'chapters'
                      ? 'bg-white dark:bg-brand-dark-card text-primary-600 dark:text-primary-400 shadow-xs'
                      : 'text-brand-muted dark:text-brand-dark-muted'
                  }`}
                >
                  <ListVideo size={14} /> Chapters{timestamps.length > 0 ? ` (${timestamps.length})` : ''}
                </button>
                <button
                  onClick={() => setActiveMobileTab('comments')}
                  className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeMobileTab === 'comments'
                      ? 'bg-white dark:bg-brand-dark-card text-primary-600 dark:text-primary-400 shadow-xs'
                      : 'text-brand-muted dark:text-brand-dark-muted'
                  }`}
                >
                  <MessageSquare size={14} /> Q&A{comments.length > 0 ? ` (${comments.length})` : ''}
                </button>
                <button
                  onClick={() => setActiveMobileTab('overview')}
                  className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeMobileTab === 'overview'
                      ? 'bg-white dark:bg-brand-dark-card text-primary-600 dark:text-primary-400 shadow-xs'
                      : 'text-brand-muted dark:text-brand-dark-muted'
                  }`}
                >
                  <Star size={14} /> Details
                </button>
              </div>

              {/* Scrollable Body Content */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {/* Desktop 2-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
                  {/* Left Column: Video Info & Comments (Desktop) / Active Mobile Tab (Mobile) */}
                  <div className="lg:col-span-2 p-4 sm:p-6 flex flex-col space-y-6">
                    {/* Header: Title, Instructor, Tags */}
                    <div className={`${activeMobileTab !== 'overview' ? 'hidden lg:block' : 'block'}`}>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                          {course.subcategory || 'Online Lecture'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-white/10 text-brand-muted dark:text-brand-dark-muted">
                          {course.level || 'All Levels'}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-brand-text dark:text-brand-dark-text leading-snug">
                        {course.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-brand-muted dark:text-brand-dark-muted mt-1">
                        Instructor: <span className="font-semibold text-brand-text dark:text-brand-dark-text">{course.instructor || 'Skills021 Faculty'}</span>
                      </p>
                    </div>

                    {/* About this course description (Overview Tab on mobile, Always on desktop) */}
                    {course.description && (
                      <div className={`p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 ${activeMobileTab !== 'overview' ? 'hidden lg:block' : 'block'}`}>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-2">
                          Lecture Overview & Syllabus
                        </h4>
                        <p
                          className={`text-xs sm:text-sm text-brand-text/85 dark:text-brand-dark-text/85 leading-relaxed whitespace-pre-line ${
                            descExpanded ? '' : 'line-clamp-3'
                          }`}
                        >
                          {course.description}
                        </p>
                        {course.description.length > 140 && (
                          <button
                            onClick={() => setDescExpanded((v) => !v)}
                            className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            {descExpanded ? 'Show less' : 'Read more'}
                            <ChevronDown size={13} className={`transition-transform ${descExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Instructor Rating & Review */}
                    <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 ${activeMobileTab !== 'overview' ? 'hidden lg:flex' : 'flex'}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-semibold text-brand-text dark:text-brand-dark-text whitespace-nowrap">
                          {instructorRating?.userRating ? 'Your Rating:' : 'Rate Lecture:'}
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
                            className="p-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {submittingRating ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200 dark:border-white/10">
                        <Star size={14} className="text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-brand-text dark:text-brand-dark-text tabular-nums">
                          {instructorRating?.average || '4.9'}
                        </span>
                        <span className="text-xs text-brand-muted dark:text-brand-dark-muted">
                          ({instructorRating?.count ?? 12})
                        </span>
                      </div>
                    </div>

                    {/* Lecture Notes Section on Mobile (Active when Mobile Tab = 'notes') */}
                    <div className={`lg:hidden ${activeMobileTab === 'notes' ? 'block' : 'hidden'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-primary-500" />
                          <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text">
                            Companion Notes & Materials ({courseNoteResources.length})
                          </h3>
                        </div>
                      </div>

                      {courseNotesLoading ? (
                        <div className="text-center py-8">
                          <Loader2 size={24} className="animate-spin mx-auto text-primary-500 mb-2" />
                          <p className="text-xs text-brand-muted">Fetching companion lecture notes…</p>
                        </div>
                      ) : courseNoteResources.length === 0 ? (
                        <div className="p-6 text-center rounded-xl bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10">
                          <FileText size={28} className="mx-auto text-brand-muted mb-2 opacity-50" />
                          <p className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">No uploaded notes yet</p>
                          <p className="text-[11px] text-brand-muted mt-1">
                            Companion PDF notes uploaded for "{(course.notesSubject && course.notesSubject.trim()) || course.title}" will show here.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {courseNoteResources.map((r) => (
                            <div
                              key={r.id}
                              className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex flex-col gap-2.5"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                                  <FileText size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs sm:text-sm font-bold text-brand-text dark:text-brand-dark-text leading-snug line-clamp-2">
                                    {r.title}
                                  </p>
                                  <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted mt-0.5">
                                    {r.subject} {r.author ? `· By ${r.author}` : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    r.isPremium
                                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  }`}
                                >
                                  {r.isPremium ? '⭐ PREMIUM NOTE' : '✅ FREE NOTE'}
                                </span>
                                <button
                                  onClick={() => handleOpenNoteDialog(r)}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-primary-500 text-white rounded-lg hover:bg-primary-600 active:scale-95 transition-all shadow-xs"
                                >
                                  {r.isPremium ? <ExternalLink size={13} /> : <Download size={13} />}
                                  {r.isPremium ? 'View Note' : 'Download PDF'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Chapters Section on Mobile (Active when Mobile Tab = 'chapters') */}
                    <div className={`lg:hidden ${activeMobileTab === 'chapters' ? 'block' : 'hidden'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <ListVideo size={16} className="text-primary-500" />
                        <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text">
                          Lecture Chapters & Timestamps ({timestamps.length})
                        </h3>
                      </div>

                      {loading ? (
                        <div className="text-center py-8">
                          <Loader2 size={24} className="animate-spin mx-auto text-primary-500" />
                        </div>
                      ) : timestamps.length === 0 ? (
                        <div className="p-6 text-center rounded-xl bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10">
                          <p className="text-xs text-brand-muted">No chapter bookmarks created for this lecture yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {timestamps.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => seekTo(t.timeSeconds)}
                              className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-primary-500/10 active:scale-98 text-left transition-all border border-transparent hover:border-primary-500/20"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <Play size={12} className="text-primary-500 shrink-0" />
                                <span className="text-xs font-semibold text-brand-text dark:text-brand-dark-text truncate">
                                  {t.label}
                                </span>
                              </div>
                              <span className="text-xs font-mono font-bold text-primary-600 dark:text-primary-400 shrink-0 bg-primary-50 dark:bg-primary-950/30 px-2 py-0.5 rounded">
                                {formatSeconds(t.timeSeconds)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Q&A / Comments Section (Always visible on desktop; mobile tab = 'comments') */}
                    <div className={`${activeMobileTab !== 'comments' ? 'hidden lg:block' : 'block'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare size={16} className="text-primary-500" />
                        <span className="text-sm font-bold text-brand-text dark:text-brand-dark-text">
                          Student Q&A & Discussion ({comments.length})
                        </span>
                      </div>

                      {/* Comment Input */}
                      <div className="flex gap-2 mb-4">
                        <input
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                          placeholder="Ask a question or share feedback…"
                          className="input flex-1 text-xs sm:text-sm py-2.5"
                        />
                        <button
                          onClick={handlePostComment}
                          disabled={posting || !newComment.trim()}
                          className="px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                        >
                          {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                        </button>
                      </div>

                      {loading ? (
                        <div className="text-center py-6">
                          <Loader2 size={20} className="animate-spin mx-auto text-brand-muted" />
                        </div>
                      ) : comments.length === 0 ? (
                        <p className="text-xs text-brand-muted dark:text-brand-dark-muted text-center py-6 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                          No questions posted yet. Be the first to ask!
                        </p>
                      ) : (
                        <div className="space-y-2.5 max-h-64 sm:max-h-80 overflow-y-auto pr-1">
                          {comments.map((c) => (
                            <div key={c.id} className="flex items-start justify-between gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text">{c.userName}</span>
                                  <span className="text-[10px] text-brand-muted dark:text-brand-dark-muted">{new Date(c.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-brand-muted dark:text-brand-dark-muted break-words leading-relaxed">{c.comment}</p>
                              </div>
                              {(isAdmin || c.userId === userId) && (
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="p-1 text-red-400 hover:text-red-600 transition-colors shrink-0"
                                  title="Delete comment"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Desktop Sidebar for Chapters & Companion Notes */}
                  <div className="hidden lg:flex flex-col border-l border-gray-100 dark:border-brand-dark-border p-5 bg-gray-50/50 dark:bg-brand-dark-bg/30">
                    {/* Desktop Sidebar Tab Switcher */}
                    <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
                      <button
                        onClick={() => setSidebarTab('courseNotes')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          sidebarTab === 'courseNotes'
                            ? 'bg-white dark:bg-brand-dark-card text-brand-text dark:text-brand-dark-text shadow-xs'
                            : 'text-brand-muted dark:text-brand-dark-muted'
                        }`}
                      >
                        <FileText size={13} /> Notes{courseNoteResources.length > 0 ? ` (${courseNoteResources.length})` : ''}
                      </button>
                      <button
                        onClick={() => setSidebarTab('chapters')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          sidebarTab === 'chapters'
                            ? 'bg-white dark:bg-brand-dark-card text-brand-text dark:text-brand-dark-text shadow-xs'
                            : 'text-brand-muted dark:text-brand-dark-muted'
                        }`}
                      >
                        <ListVideo size={13} /> Chapters
                      </button>
                    </div>

                    {/* Desktop Notes List */}
                    {sidebarTab === 'courseNotes' ? (
                      courseNotesLoading ? (
                        <div className="text-center py-8">
                          <Loader2 size={20} className="animate-spin mx-auto text-brand-muted" />
                        </div>
                      ) : courseNoteResources.length === 0 ? (
                        <div className="text-center py-8 px-2 text-xs text-brand-muted">
                          No published notes found for "{(course.notesSubject && course.notesSubject.trim()) || course.title}".
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-1">
                          {courseNoteResources.map((r) => (
                            <div key={r.id} className="p-3 rounded-xl bg-white dark:bg-brand-dark-card border border-gray-100 dark:border-white/10 shadow-xs">
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-500 flex items-center justify-center shrink-0">
                                  <FileText size={15} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-brand-text dark:text-brand-dark-text leading-snug line-clamp-2">{r.title}</p>
                                  <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted mt-0.5">{r.subject}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.isPremium ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-green-100 dark:bg-green-900/30 text-green-600'}`}>
                                  {r.isPremium ? 'PREMIUM' : 'FREE'}
                                </span>
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
                    ) : (
                      /* Desktop Chapters List */
                      loading ? (
                        <div className="text-center py-8">
                          <Loader2 size={20} className="animate-spin mx-auto text-brand-muted" />
                        </div>
                      ) : timestamps.length === 0 ? (
                        <p className="text-xs text-brand-muted text-center py-8">No chapters added for this lecture yet.</p>
                      ) : (
                        <div className="space-y-1 max-h-[30rem] overflow-y-auto pr-1">
                          {timestamps.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => seekTo(t.timeSeconds)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white dark:hover:bg-brand-dark-card text-left transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                            >
                              <span className="text-xs font-mono font-semibold text-primary-500 shrink-0">{formatSeconds(t.timeSeconds)}</span>
                              <span className="text-xs text-brand-text dark:text-brand-dark-text truncate">{t.label}</span>
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>
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
