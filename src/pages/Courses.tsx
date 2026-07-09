import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  BookOpen, Clock, Users, Star, Search, Play, X,
  MoreVertical, MessageSquare, ThumbsUp, Send, CreditCard, Lock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useContentStore, CourseGroup, CourseSubcategory, CourseBatch, Course } from '../store/contentStore'
import { useCourseFeedbackStore, CourseFeedbackType } from '../store/courseFeedbackStore'
import { useAuthStore } from '../store/authStore'

// Placeholder payment gateway URL — replace with real Razorpay/Stripe checkout link later
const PAYMENT_GATEWAY_URL = 'https://example-payment-gateway.com/checkout'

function redirectToPayment(formData: {
  courseId: string
  courseTitle: string
  fullName: string
  email: string
  address: string
  batchId: string
  batchName: string
}) {
  const params = new URLSearchParams({
    courseId: formData.courseId,
    course: formData.courseTitle,
    name: formData.fullName,
    email: formData.email,
    address: formData.address,
    batchId: formData.batchId,
    batch: formData.batchName,
  })
  window.location.href = `${PAYMENT_GATEWAY_URL}?${params.toString()}`
}

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

// Map course id to video id — only c1 (DSA) has a video right now
const COURSE_VIDEO_MAP: Record<string, string> = {
  'c1': 'v1',
}

function ComingSoonModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-sm w-full shadow-xl text-center"
      >
        <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Play size={24} className="text-primary-500 ml-1" />
        </div>
        <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-2">
          Video Coming Soon!
        </h3>
        <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-2">
          <span className="font-semibold text-primary-500">{title}</span>
        </p>
        <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-6">
          Admin will upload the video for this course shortly. Stay tuned!
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Got it!
        </button>
      </motion.div>
    </div>
  )
}

// ─── Comment / Recommend Modal ─────────────────────────────────────────────────
function FeedbackModal({
  title,
  type,
  onSubmit,
  onClose,
}: {
  title: string
  type: 'Comment' | 'Recommend'
  onSubmit: (text: string) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')

  const copy: Record<'Comment' | 'Recommend', { heading: string; placeholder: string; icon: JSX.Element }> = {
    Comment: {
      heading: 'Add a Comment',
      placeholder: 'Write your comment about this course...',
      icon: <Send size={20} className="text-primary-500" />,
    },
    Recommend: {
      heading: 'Recommend This Course',
      placeholder: 'Why is this course good for our website? Tell us what you liked...',
      icon: <ThumbsUp size={20} className="text-primary-500" />,
    },
  }

  const handleSubmit = () => {
    if (!text.trim()) {
      toast.error('Please write something before submitting.')
      return
    }
    onSubmit(text.trim())
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-md w-full shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {copy[type].icon}
            <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">
              {copy[type].heading}
            </h3>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text dark:hover:text-brand-dark-text transition-colors">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-2">
          <span className="font-semibold text-primary-500">{title}</span>
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={copy[type].placeholder}
          rows={4}
          className="input w-full resize-none mb-4"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            Submit
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Rating Modal (enrolled students only) ────────────────────────────────────
function RatingModal({
  title,
  onSubmit,
  onClose,
}: {
  title: string
  onSubmit: (stars: number) => void
  onClose: () => void
}) {
  const [stars, setStars] = useState(0)
  const [hovered, setHovered] = useState(0)

  const handleSubmit = () => {
    if (stars < 1) {
      toast.error('Please select a star rating before submitting.')
      return
    }
    onSubmit(stars)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-md w-full shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star size={20} className="text-primary-500" />
            <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">
              Rate This Course
            </h3>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text dark:hover:text-brand-dark-text transition-colors">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-4">
          <span className="font-semibold text-primary-500">{title}</span>
        </p>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110"
              aria-label={`${n} star`}
            >
              <Star
                size={32}
                className={
                  n <= (hovered || stars)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-300 dark:text-brand-dark-border'
                }
              />
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            Submit Rating
          </button>
        </div>
      </motion.div>
    </div>
  )
}


// ─── Three-Dot Options Menu ────────────────────────────────────────────────────
function OptionsMenu({
  isEnrolled,
  onRating,
  onRecommend,
}: {
  isEnrolled: boolean
  onRating: () => void
  onRecommend: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleRating = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    if (!isEnrolled) {
      toast.error('Only enrolled students can rate this course.')
      return
    }
    onRating()
  }

  const handleRecommend = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    if (!isEnrolled) {
      toast.error('Only enrolled students can give feedback on this course.')
      return
    }
    onRecommend()
  }

  return (
    <div className="relative ml-auto" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        className="p-1 rounded-md text-brand-muted dark:text-brand-dark-muted hover:bg-gray-100 dark:hover:bg-white/10 hover:text-brand-text dark:hover:text-brand-dark-text transition-colors"
        aria-label="More options"
      >
        <MoreVertical size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-7 z-20 w-48 bg-white dark:bg-brand-dark-card rounded-xl border border-gray-100 dark:border-brand-dark-border shadow-xl overflow-hidden"
          >
            <button
              onClick={handleRating}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                isEnrolled
                  ? 'text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5'
                  : 'text-brand-muted dark:text-brand-dark-muted opacity-60 cursor-not-allowed'
              }`}
            >
              <Star size={14} className={isEnrolled ? 'text-primary-500' : 'text-brand-muted dark:text-brand-dark-muted'} />
              Rating
              {!isEnrolled && <Lock size={11} className="ml-auto" />}
            </button>
            <button
              onClick={handleRecommend}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                isEnrolled
                  ? 'text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5'
                  : 'text-brand-muted dark:text-brand-dark-muted opacity-60 cursor-not-allowed'
              }`}
            >
              <ThumbsUp size={14} className={isEnrolled ? 'text-primary-500' : 'text-brand-muted dark:text-brand-dark-muted'} />
              Recommend
              {!isEnrolled && <Lock size={11} className="ml-auto" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Enroll Form Modal ──────────────────────────────────────────────────────────
function EnrollModal({
  course,
  onClose,
}: {
  course: Course
  onClose: () => void
}) {
  const { user } = useAuthStore()
  const [fullName, setFullName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [address, setAddress] = useState('')
  const [batchId, setBatchId] = useState('')

  const batches: CourseBatch[] = course.batches || []

  const handleProceed = () => {
    if (!fullName.trim() || !email.trim() || !address.trim() || !batchId) {
      toast.error('Please fill in all fields before proceeding.')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address.')
      return
    }
    const batch = batches.find(b => b.id === batchId)
    if (!batch) {
      toast.error('Please select a valid batch.')
      return
    }
    if (batch.seatsLeft <= 0) {
      toast.error('Selected batch is full. Please choose another batch.')
      return
    }

    toast.success('Redirecting to payment...')
    redirectToPayment({
      courseId: course.id,
      courseTitle: course.title,
      fullName: fullName.trim(),
      email: email.trim(),
      address: address.trim(),
      batchId: batch.id,
      batchName: batch.name,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-md w-full shadow-xl my-8"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">Enroll Now</h3>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text dark:hover:text-brand-dark-text transition-colors">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-4">
          <span className="font-semibold text-primary-500">{course.title}</span>
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-1 block">Full Name</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              className="input w-full"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input w-full"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-1 block">Address</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Your full address"
              rows={2}
              className="input w-full resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-1 block">Batch</label>
            {batches.length === 0 ? (
              <p className="text-xs text-brand-muted dark:text-brand-dark-muted">No batches available for this course yet.</p>
            ) : (
              <select
                value={batchId}
                onChange={e => setBatchId(e.target.value)}
                className="input w-full"
              >
                <option value="">Select a batch</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id} disabled={b.seatsLeft <= 0}>
                    {b.name} Batch — {b.seatsLeft > 0 ? `${b.seatsLeft} seats left` : 'Full'}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <button
          onClick={handleProceed}
          disabled={batches.length === 0}
          className="w-full mt-5 flex items-center justify-center gap-2 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <CreditCard size={16} /> Proceed to Payment
        </button>
      </motion.div>
    </div>
  )
}

function CourseCard({ course }: { course: Course }) {
  const navigate = useNavigate()
  const [showComingSoon, setShowComingSoon] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [showEnroll, setShowEnroll] = useState(false)
  const { addEntry } = useCourseFeedbackStore()
  const { user } = useAuthStore()
  const { updateCourse } = useContentStore()

  const isAdmin = user?.role === 'admin'
  const isEnrolled = isAdmin || (!!user && !!user.enrolledCourses && user.enrolledCourses.includes(course.id))

  const handlePlayClick = () => {
    const videoId = COURSE_VIDEO_MAP[course.id]
    if (!videoId) {
      setShowComingSoon(true)
      return
    }
    if (!isEnrolled) {
      toast.error('Please enroll in this course to watch the videos.', {
        icon: '🔒',
        duration: 3000,
      })
      setShowEnroll(true)
      return
    }
    navigate(`/videos/${videoId}`)
  }

  const handleRecommendSubmit = (text: string) => {
    addEntry({
      courseId: course.id,
      courseTitle: course.title,
      type: 'Recommend',
      text,
      userId: user?.id || null,
      userName: user?.name || 'Anonymous',
    })
    toast.success('Thanks for recommending this course!')
    setShowRecommend(false)
  }

  const handleRatingSubmit = (stars: number) => {
    addEntry({
      courseId: course.id,
      courseTitle: course.title,
      type: 'Rating',
      text: '',
      stars,
      userId: user?.id || null,
      userName: user?.name || 'Anonymous',
    })

    const newReviews = course.reviews + 1
    const newRating = Math.round((((course.rating * course.reviews) + stars) / newReviews) * 10) / 10
    updateCourse(course.id, { rating: newRating, reviews: newReviews })

    toast.success('Thanks for rating this course!')
    setShowRating(false)
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.25 }}
        className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border overflow-hidden group cursor-pointer hover:shadow-card-hover transition-all duration-200"
      >
        {/* Thumbnail */}
        <div className="relative h-44 bg-gray-900 dark:bg-black overflow-hidden flex items-center justify-center">
          <BookOpen size={48} className="text-white/10" />
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
          {/* Video available badge */}
          {COURSE_VIDEO_MAP[course.id] && (
            <div className="absolute top-3 right-3">
              <span className="px-2 py-1 text-[10px] font-bold bg-green-500 text-white rounded-lg">
                ▶ Video Ready
              </span>
            </div>
          )}
          {/* Play button - shows lock if not enrolled */}
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={handlePlayClick}
          >
            <div className={`w-14 h-14 backdrop-blur-sm rounded-full flex items-center justify-center border-2 hover:scale-110 transition-all duration-200 ${
              isEnrolled
                ? 'bg-white/20 border-white/40 hover:bg-white/30'
                : 'bg-black/40 border-white/30 hover:bg-black/50'
            }`}>
              {isEnrolled
                ? <Play size={22} className="text-white ml-1" />
                : <Lock size={20} className="text-white" />
              }
            </div>
            {!isEnrolled && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <span className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  Enroll to Watch
                </span>
              </div>
            )}
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
            <OptionsMenu
              isEnrolled={isEnrolled}
              onRating={() => setShowRating(true)}
              onRecommend={() => setShowRecommend(true)}
            />
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
            <button
              onClick={() => setShowEnroll(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-500 rounded-xl hover:bg-primary-600 transition-colors"
            >
              Enroll Now
            </button>
          </div>
        </div>
      </motion.div>

      {/* Coming Soon Modal */}
      {showComingSoon && (
        <ComingSoonModal
          title={course.title}
          onClose={() => setShowComingSoon(false)}
        />
      )}

      {/* Recommend Modal */}
      <AnimatePresence>
        {showRecommend && (
          <FeedbackModal
            title={course.title}
            type="Recommend"
            onSubmit={handleRecommendSubmit}
            onClose={() => setShowRecommend(false)}
          />
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      <AnimatePresence>
        {showRating && (
          <RatingModal
            title={course.title}
            onSubmit={handleRatingSubmit}
            onClose={() => setShowRating(false)}
          />
        )}
      </AnimatePresence>

      {/* Enroll Modal */}
      <AnimatePresence>
        {showEnroll && (
          <EnrollModal course={course} onClose={() => setShowEnroll(false)} />
        )}
      </AnimatePresence>
    </>
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
      {/* Hero */}
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
