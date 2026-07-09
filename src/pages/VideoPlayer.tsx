import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Clock, MessageSquare, Send, Reply, Trash2,
  ChevronDown, ChevronUp, Shield, Lock, AlertTriangle, X, Star
} from 'lucide-react'
import { useVideoStore, VideoTimestamp, VideoComment } from '../store/videoStore'
import { useAuthStore } from '../store/authStore'
import { useContentStore } from '../store/contentStore'
import { useCourseFeedbackStore } from '../store/courseFeedbackStore'
import toast from 'react-hot-toast'

// Map videoId → courseId (keep in sync with Courses.tsx COURSE_VIDEO_MAP)
const VIDEO_TO_COURSE: Record<string, string> = {
  'v1': 'c1',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Anti Screen-Record Hook ──────────────────────────────────────────────────
function useAntiScreenRecord(containerRef: React.RefObject<HTMLDivElement>) {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    // 1. Block DevTools screenshot shortcut keys
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        setBlocked(true)
        setTimeout(() => setBlocked(false), 2000)
        toast.error('Screenshots are not allowed')
      }
      // Ctrl+Shift+S (Snipping Tool shortcut), Win+Shift+S
      if ((e.ctrlKey && e.shiftKey && e.key === 'S') || (e.metaKey && e.shiftKey && e.key === 'S')) {
        e.preventDefault()
        toast.error('Screenshots are not allowed')
      }
    }

    // 2. Detect if page visibility changes (tab hidden = possible capture tool)
    const handleVisibility = () => {
      if (document.hidden) {
        // Blur any embedded iframes
        const iframe = containerRef.current?.querySelector('iframe')
        if (iframe) iframe.blur()
      }
    }

    // 3. Block right-click on video area
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('visibilitychange', handleVisibility)
    containerRef.current?.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('visibilitychange', handleVisibility)
      containerRef.current?.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

  return blocked
}

// ─── Timestamp List ───────────────────────────────────────────────────────────
function TimestampList({
  timestamps,
  onSeek,
}: {
  timestamps: VideoTimestamp[]
  onSeek: (seconds: number) => void
}) {
  if (timestamps.length === 0) return null

  return (
    <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-brand-border dark:border-brand-dark-border overflow-hidden">
      <div className="px-4 py-3 border-b border-brand-border dark:border-brand-dark-border flex items-center gap-2">
        <Clock size={15} className="text-primary-500" />
        <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text">Chapters</h3>
        <span className="text-xs text-brand-muted dark:text-brand-dark-muted">({timestamps.length})</span>
      </div>
      <div className="divide-y divide-brand-border dark:divide-brand-dark-border">
        {timestamps.map((ts) => (
          <button
            key={ts.id}
            onClick={() => onSeek(ts.time)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group"
          >
            <span className="text-xs font-mono font-bold text-primary-500 min-w-[40px]">
              {formatTime(ts.time)}
            </span>
            <span className="text-sm text-brand-text dark:text-brand-dark-text group-hover:text-primary-500 transition-colors">
              {ts.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Single Comment ───────────────────────────────────────────────────────────
function CommentItem({
  comment,
  currentUserId,
  isAdmin,
  onDelete,
  onReply,
  onDeleteReply,
}: {
  comment: VideoComment
  currentUserId: string | null
  isAdmin: boolean
  onDelete: (id: string) => void
  onReply: (commentId: string, text: string) => void
  onDeleteReply: (commentId: string, replyId: string) => void
}) {
  const [showReplies, setShowReplies] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showReplyBox, setShowReplyBox] = useState(false)

  const canDelete = isAdmin || comment.userId === currentUserId

  const submitReply = () => {
    if (!replyText.trim()) return
    onReply(comment.id, replyText.trim())
    setReplyText('')
    setShowReplies(true)
  }

  return (
    <div className="py-4 border-b border-brand-border dark:border-brand-dark-border last:border-0">
      {/* Main comment */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 text-primary-600 dark:text-primary-400 font-bold text-xs">
          {comment.userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-brand-text dark:text-brand-dark-text">{comment.userName}</span>
            <span className="text-xs text-brand-muted dark:text-brand-dark-muted">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-brand-text dark:text-brand-dark-text leading-relaxed">{comment.text}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setShowReplyBox(!showReplyBox)}
              className="flex items-center gap-1 text-xs text-brand-muted dark:text-brand-dark-muted hover:text-primary-500 transition-colors"
            >
              <Reply size={12} /> Reply
            </button>
            {comment.replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
              >
                {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 ml-auto"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReplyBox && (
            <div className="flex gap-2 mt-3">
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitReply()}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={submitReply}
                disabled={!replyText.trim()}
                className="p-2 bg-primary-500 text-white rounded-xl disabled:opacity-40 hover:bg-primary-600 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          )}

          {/* Replies */}
          <AnimatePresence>
            {showReplies && comment.replies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 ml-4 space-y-3 border-l-2 border-gray-100 dark:border-brand-dark-border pl-4"
              >
                {comment.replies.map(reply => {
                  const canDeleteReply = isAdmin || reply.userId === currentUserId
                  return (
                    <div key={reply.id} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0 text-brand-muted text-[10px] font-bold">
                        {reply.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">{reply.userName}</span>
                          <span className="text-[10px] text-brand-muted dark:text-brand-dark-muted">{timeAgo(reply.createdAt)}</span>
                          {canDeleteReply && (
                            <button
                              onClick={() => onDeleteReply(comment.id, reply.id)}
                              className="text-[10px] text-red-400 hover:text-red-500 ml-auto"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-brand-text dark:text-brand-dark-text">{reply.text}</p>
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ─── Comment Section ──────────────────────────────────────────────────────────
function CommentSection({ videoId }: { videoId: string }) {
  const store = useVideoStore()
  const { user, isAuthenticated } = useAuthStore()
  const comments = store.getVideoComments(videoId)
  const [text, setText] = useState('')

  const isAdmin = user?.role === 'admin'

  const submit = () => {
    if (!isAuthenticated || !user) {
      toast.error('Please login to comment')
      return
    }
    if (!text.trim()) return
    store.addComment(videoId, user.id, user.name, text.trim())
    setText('')
    toast.success('Comment added!')
  }

  const handleDelete = (commentId: string) => {
    store.deleteComment(commentId)
    toast.success('Comment deleted')
  }

  const handleReply = (commentId: string, replyText: string) => {
    if (!user) return
    store.addReply(commentId, user.id, user.name, replyText)
    toast.success('Reply added!')
  }

  const handleDeleteReply = (commentId: string, replyId: string) => {
    store.deleteReply(commentId, replyId)
    toast.success('Reply deleted')
  }

  return (
    <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-brand-border dark:border-brand-dark-border p-5">
      <div className="flex items-center gap-2 mb-5">
        <MessageSquare size={16} className="text-primary-500" />
        <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text">
          Comments <span className="text-brand-muted font-normal">({comments.length})</span>
        </h3>
      </div>

      {/* Comment Input */}
      {isAuthenticated ? (
        <div className="flex gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 text-primary-600 font-bold text-xs">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={submit}
              disabled={!text.trim()}
              className="px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-primary-600 transition-colors flex items-center gap-1.5"
            >
              <Send size={14} /> Post
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-5 p-4 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center gap-3">
          <Lock size={16} className="text-brand-muted" />
          <p className="text-sm text-brand-muted dark:text-brand-dark-muted">
            <Link to="/login" className="text-primary-500 font-semibold hover:underline">Login</Link> to comment or reply.
          </p>
        </div>
      )}

      {/* Comments List */}
      {comments.length === 0 ? (
        <p className="text-sm text-center text-brand-muted dark:text-brand-dark-muted py-8">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div>
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id || null}
              isAdmin={isAdmin}
              onDelete={handleDelete}
              onReply={handleReply}
              onDeleteReply={handleDeleteReply}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Screen-Record Warning Overlay ───────────────────────────────────────────
function ScreenRecordWarning({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center rounded-2xl"
    >
      <div className="text-center text-white p-6 max-w-xs">
        <AlertTriangle size={40} className="mx-auto text-yellow-400 mb-3" />
        <h3 className="font-bold text-lg mb-2">Screenshot Blocked</h3>
        <p className="text-sm text-white/70 mb-4">
          Recording or capturing this content is not permitted.
        </p>
        <button
          onClick={onDismiss}
          className="px-5 py-2 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600"
        >
          I Understand
        </button>
      </div>
    </motion.div>
  )
}

// ─── Star Picker ──────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
          aria-label={`${n} star`}
        >
          <Star
            size={26}
            className={n <= (hovered || value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-brand-dark-border'}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Course & Teacher Rating Section ─────────────────────────────────────────
function RatingSection({ courseId, courseTitle, instructor }: { courseId: string; courseTitle: string; instructor: string }) {
  const { user } = useAuthStore()
  const { addEntry, entries } = useCourseFeedbackStore()
  const { updateCourse, courses } = useContentStore()

  const [courseStars, setCourseStars] = useState(0)
  const [teacherStars, setTeacherStars] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  // Check if this user already rated
  const alreadyRated = entries.some(
    e => e.courseId === courseId && e.userId === user?.id && (e.type === 'Rating' || e.type === 'TeacherRating')
  )

  const handleSubmit = () => {
    if (courseStars < 1 || teacherStars < 1) {
      toast.error('Please rate both the course and the teacher.')
      return
    }

    // Save course rating
    addEntry({
      courseId,
      courseTitle,
      type: 'Rating',
      text: '',
      stars: courseStars,
      userId: user?.id || null,
      userName: user?.name || 'Anonymous',
    })

    // Save teacher rating
    addEntry({
      courseId,
      courseTitle,
      type: 'TeacherRating',
      text: '',
      stars: teacherStars,
      userId: user?.id || null,
      userName: user?.name || 'Anonymous',
    })

    // Update course aggregate rating
    const course = courses.find(c => c.id === courseId)
    if (course) {
      const newReviews = course.reviews + 1
      const newRating = Math.round((((course.rating * course.reviews) + courseStars) / newReviews) * 10) / 10
      updateCourse(courseId, { rating: newRating, reviews: newReviews })
    }

    toast.success('Thanks for your ratings!')
    setSubmitted(true)
  }

  if (alreadyRated || submitted) {
    return (
      <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-brand-border dark:border-brand-dark-border p-5">
        <div className="flex items-center gap-2 mb-2">
          <Star size={16} className="text-amber-400 fill-amber-400" />
          <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text">Your Ratings</h3>
        </div>
        <p className="text-sm text-brand-muted dark:text-brand-dark-muted">
          You have already submitted your ratings for this course. Thank you!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-brand-border dark:border-brand-dark-border p-5">
      <div className="flex items-center gap-2 mb-5">
        <Star size={16} className="text-amber-400 fill-amber-400" />
        <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text">Rate this Course</h3>
      </div>

      <div className="space-y-5">
        {/* Course Rating */}
        <div>
          <p className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-2 uppercase tracking-wide">Course</p>
          <StarPicker value={courseStars} onChange={setCourseStars} />
        </div>

        {/* Teacher Rating */}
        <div>
          <p className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-2 uppercase tracking-wide">Teacher — {instructor}</p>
          <StarPicker value={teacherStars} onChange={setTeacherStars} />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Submit Ratings
        </button>
      </div>
    </div>
  )
}

// ─── Video Player Page ────────────────────────────────────────────────────────
export default function VideoPlayer() {
  const { videoId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()
  const store = useVideoStore()
  const { user } = useAuthStore()

  const video = store.videos.find(v => v.id === videoId)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)

  const blocked = useAntiScreenRecord(containerRef)

  // ── CSS-based anti-capture ─────────────────────────────────────────────────
  // Apply CSS that prevents most screen capture tools
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'anti-capture-style'
    style.textContent = `
      .video-protected-area {
        -webkit-user-select: none;
        user-select: none;
        pointer-events: none;
      }
      .video-protected-area iframe {
        pointer-events: all;
      }
      /* Disables GPU compositing layer capture on some browsers */
      .video-protected-area {
        isolation: isolate;
        mix-blend-mode: normal;
      }
      @media print {
        .video-protected-area { display: none !important; }
      }
    `
    document.head.appendChild(style)
    return () => { document.getElementById('anti-capture-style')?.remove() }
  }, [])

  // Seek YouTube video via postMessage
  const seekTo = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds
      videoRef.current.play()
    } else {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
        '*'
      )
    }
  }, [])

  if (!video || video.status === 'Draft' && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text mb-2">Video Not Found</h2>
          <p className="text-brand-muted mb-4">This video doesn't exist or is not available.</p>
          <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
        </div>
      </div>
    )
  }

  const relatedVideos = store.getPublishedVideos()
    .filter(v => v.id !== video.id && v.category === video.category)
    .slice(0, 5)

  const { courses } = useContentStore()
  const courseId = VIDEO_TO_COURSE[video.id] || null
  const linkedCourse = courseId ? courses.find(c => c.id === courseId) : null
  const isAdmin = user?.role === 'admin'
  const isEnrolled = isAdmin || (!!user && !!user.enrolledCourses && !!courseId && user.enrolledCourses.includes(courseId))

  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.videoId}?enablejsapi=1&modestbranding=1&rel=0&origin=${window.location.origin}`

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-brand-muted dark:text-brand-dark-muted hover:text-primary-500 mb-5 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Videos
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Video + Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Video Player — Protected Area */}
            <div
              ref={containerRef}
              className="relative rounded-2xl overflow-hidden bg-black aspect-video video-protected-area select-none"
              style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
            >
              {/* Transparent overlay to block right-click on video */}
              <div
                className="absolute inset-0 z-10"
                onContextMenu={e => e.preventDefault()}
                style={{ pointerEvents: 'none' }}
              />




              {video.videoId === 'local-dsa' ? (
                <video
                  ref={videoRef as any}
                  src={video.youtubeUrl}
                  controls
                  controlsList="nodownload"
                  onContextMenu={e => e.preventDefault()}
                  className="w-full h-full"
                  onTimeUpdate={(e) => setCurrentTime(Math.floor((e.target as HTMLVideoElement).currentTime))}
                />
              ) : (
                <iframe
                  ref={iframeRef}
                  src={embedUrl}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              )}

              {/* Screenshot warning overlay */}
              <AnimatePresence>
                {blocked && <ScreenRecordWarning onDismiss={() => {}} />}
              </AnimatePresence>
            </div>

            {/* Video Info */}
            <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-brand-border dark:border-brand-dark-border p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 mb-2 inline-block">
                    {video.category}
                  </span>
                  <h1 className="text-xl font-bold text-brand-text dark:text-brand-dark-text leading-snug">
                    {video.title}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-brand-muted dark:text-brand-dark-muted mb-4">
                <span className="flex items-center gap-1"><Clock size={12} /> {video.duration}</span>
                <span>•</span>
                <span>{video.uploadDate}</span>
                {video.featured && (
                  <>
                    <span>•</span>
                    <span className="text-amber-500 font-semibold">⭐ Featured</span>
                  </>
                )}
              </div>
              {video.description && (
                <p className="text-sm text-brand-muted dark:text-brand-dark-muted leading-relaxed">
                  {video.description}
                </p>
              )}

              {/* Protected content notice */}
              <div className="mt-4 flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-brand-dark-border">
                <Shield size={14} className="text-primary-500 flex-shrink-0" />
                <p className="text-xs text-brand-muted dark:text-brand-dark-muted">
                  This video is protected. Recording or capturing this content is strictly prohibited.
                </p>
              </div>
            </div>

            {/* Timestamps */}
            {video.timestamps.length > 0 && (
              <TimestampList timestamps={video.timestamps} onSeek={seekTo} />
            )}

            {/* Rate Course & Teacher — enrolled only */}
            {isEnrolled && linkedCourse && (
              <RatingSection
                courseId={linkedCourse.id}
                courseTitle={linkedCourse.title}
                instructor={linkedCourse.instructor}
              />
            )}

            {/* Comments */}
            <CommentSection videoId={video.id} />
          </div>

          {/* Right: Related Videos */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-brand-text dark:text-brand-dark-text">
              More in {video.category}
            </h2>
            {relatedVideos.length === 0 ? (
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted">No related videos.</p>
            ) : (
              relatedVideos.map(v => (
                <Link
                  key={v.id}
                  to={`/videos/${v.id}`}
                  className="flex gap-3 bg-white dark:bg-brand-dark-card rounded-xl border border-brand-border dark:border-brand-dark-border p-3 hover:shadow-md transition-all group"
                >
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-24 h-14 rounded-lg object-cover flex-shrink-0 bg-gray-100"
                    onError={e => { e.currentTarget.src = 'https://via.placeholder.com/96x54?text=Video' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-brand-text dark:text-brand-dark-text line-clamp-2 group-hover:text-primary-500 transition-colors leading-snug">
                      {v.title}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-brand-muted">
                      <Clock size={10} /> {v.duration}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
