import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { BookOpen, Clock, Users, Star, Search, Play, SlidersHorizontal, ChevronDown, X, Loader2, Lock, CheckCircle2, Sparkles, GraduationCap, Radio, Video, ExternalLink, CalendarDays, MonitorPlay, Trophy, TrendingUp, Zap, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Course, CourseGroup, CourseSubcategory } from '../store/contentStore'
import { fetchPublishedSiteCourses } from '../lib/courseService'
import {
  fetchColleges,
  fetchCourses,
  fetchBranches,
  fetchSemesters,
  fetchSubjects,
  type College,
  type Course as AcademicCourse,
  type Branch,
  type Semester,
  type Subject
} from '../lib/resourceService'
import { useAuthStore } from '../store/authStore'
import { getEnrollmentsForUser, getPaymentSettings } from '../lib/videoEngagementService'
import EnrollModal from '../components/EnrollModal'
import VideoPlayerModal from '../components/VideoPlayerModal'
import CourseRatingMenu from '../components/CourseRatingMenu'
import { getLiveWebinars, getWebinarRecordings, resolveWebinarRecordingVideo, type LiveWebinar, type WebinarRecording } from '../lib/webinarService'
import PanelSpotlightCard from '../components/PanelSpotlightCard'
import { showAuthRequiredToast } from '../components/AuthRequiredToast'
import drAjayPhoto from '../dr-ajay-kumar.jpeg'

const GROUPS: { label: CourseGroup }[] = [
  { label: 'Competitive Exams' },
  { label: 'College & Tech Courses' },
]

const SUBCATEGORIES: Record<CourseGroup, CourseSubcategory[]> = {
  'Foundation Programs': ['Class 1-5', 'Class 6-8', 'Class 9-10', 'Class 11-12'],
  'Competitive Exams': ['JEE Preparation', 'NEET Preparation', 'CUET Preparation', 'Olympiads', 'NTSE'],
  'College & Tech Courses': [
    'DSA', 'IPU Courses', 'AKTU Courses', 'Web Development', 'App Development', 'Flutter Development',
    'AI & Machine Learning', 'Data Science', 'Cyber Security', 'Cloud Computing',
    'Aptitude Preparation', 'Interview Preparation',
  ],
}

// Flat list of every category across every visible Group tab, each tagged
// with which group it belongs to — used to render one combined category
// list in the sidebar instead of switching per active Group tab.
const ALL_SUBCATEGORIES: { label: CourseSubcategory; group: CourseGroup }[] =
  GROUPS.flatMap(g => SUBCATEGORIES[g.label].map(label => ({ label, group: g.label })))

const LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced']
const PRICES = ['All', 'Free', 'Paid']

interface CourseCardProps {
  course: Course
  userId: string | null
  isAdmin: boolean
  isPremium: boolean
  isEnrolled: boolean
  isPending: boolean
  onPlay: (course: Course) => void
  onEnroll: (course: Course) => void
  onRated: (courseId: string, average: number, count: number) => void
}

function CourseCard({ course, userId, isAdmin, isPremium, isEnrolled, isPending, onPlay, onEnroll, onRated }: CourseCardProps) {
  const isFreeCourse = course.price === 'FREE' || course.price === 0
  const canWatch = isAdmin || isPremium || isEnrolled || isFreeCourse

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border group hover:shadow-card-hover transition-all duration-200"
    >
      {/* Thumbnail — clean dark card */}
      <div
        onClick={() => onPlay(course)}
        className="fx-course-thumb relative h-44 bg-gray-900 dark:bg-black overflow-hidden rounded-t-2xl flex items-center justify-center cursor-pointer"
      >
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <BookOpen size={48} className="text-white/10" />
        )}
        {/* Overlay on hover */}
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
        {canWatch ? (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-green-500 text-white rounded-lg">
            <CheckCircle2 size={11} /> {isAdmin ? 'ADMIN' : isPremium ? 'PREMIUM ALL-ACCESS' : 'ENROLLED'}
          </div>
        ) : isPending ? (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-amber-500 text-white rounded-lg animate-pulse">
            <Clock size={11} /> PENDING APPROVAL
          </div>
        ) : null}
        {/* Play / Lock button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40">
            {canWatch ? <Play size={18} className="text-white ml-0.5" /> : <Lock size={16} className="text-white" />}
          </div>
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
          <div className="flex items-center gap-2">
            <CourseRatingMenu
              courseId={course.id}
              userId={userId}
              isEnrolled={canWatch}
              onRated={(average, count) => onRated(course.id, average, count)}
            />

            {canWatch ? (
              <button
                onClick={() => onPlay(course)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-500 rounded-xl hover:bg-primary-600 transition-colors"
              >
                <Play size={11} /> Watch Video
              </button>
            ) : isPending ? (
              <button
                onClick={() => toast('Your payment proof with UPI UTR is currently being verified by the Admin. Access will unlock once approved.', { icon: '⏳' })}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 rounded-xl hover:bg-amber-200 transition-colors"
              >
                <Clock size={11} /> Pending Review
              </button>
            ) : (
              <button
                onClick={() => onEnroll(course)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0A0A0A] dark:bg-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                <Play size={11} /> Enroll Now
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

interface AccordionSectionProps {
  title: string
  defaultOpen?: boolean
  badge?: number
  children: React.ReactNode
}

function AccordionSection({ title, defaultOpen = false, badge, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="py-4 first:pt-0 last:pb-0 border-b border-gray-100 dark:border-brand-dark-border last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text dark:text-brand-dark-text">
          {title}
          {typeof badge === 'number' && badge > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              {badge}
            </span>
          )}
        </span>
        <ChevronDown
          size={15}
          className={`text-brand-muted dark:text-brand-dark-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Courses() {
  const [courseSection, setCourseSection] = useState<'courses' | 'webinars'>('courses')
  const [liveWebinars, setLiveWebinars] = useState<LiveWebinar[]>([])
  const [webinarRecordings, setWebinarRecordings] = useState<WebinarRecording[]>([])
  const [webinarsLoading, setWebinarsLoading] = useState(false)
  const [openingReplayId, setOpeningReplayId] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const userId = user?.id ?? null

  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [enrollCourse, setEnrollCourse] = useState<Course | null>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [playCourse, setPlayCourse] = useState<Course | null>(null)
  const [allAccessPrice, setAllAccessPrice] = useState(999)

  const requireLogin = () => {
    showAuthRequiredToast({
      title: 'Sign In Required',
      message: 'Please sign in with your Skills021 account to enroll and access course content.',
    })
    navigate('/login', { state: { from: { pathname: '/courses' } } })
  }

  useEffect(() => {
    getPaymentSettings().then((s) => {
      if (s?.allAccessPrice) setAllAccessPrice(s.allAccessPrice)
    })
    ;(async () => {
      try {
        const data = await fetchPublishedSiteCourses()
        setCourses(data)
      } catch (err) {
        console.error('Failed to load courses:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const loadUserEnrollments = useCallback(async () => {
    if (!userId) {
      setEnrolledIds(new Set())
      setPendingIds(new Set())
      return
    }
    try {
      const enrollments = await getEnrollmentsForUser(userId)
      const approved = enrollments.filter(e => e.status === 'paid' || e.status === 'free').map(e => e.courseId)
      const pending = enrollments.filter(e => e.status === 'pending').map(e => e.courseId)
      setEnrolledIds(new Set(approved))
      setPendingIds(new Set(pending))
    } catch (err) {
      console.error('Failed to load enrollments:', err)
    }
  }, [userId])

  useEffect(() => {
    loadUserEnrollments()
  }, [loadUserEnrollments])

  const handlePlay = (course: Course) => {
    if (!isAuthenticated) return requireLogin()
    if (isAdmin || enrolledIds.has(course.id)) {
      setPlayCourse(course)
    } else {
      setEnrollCourse(course)
    }
  }

  // Keep the visible rating/review count on each course card in sync the
  // moment someone rates the course, without needing a full page refetch.
  const handleCourseRated = (courseId: string, average: number, count: number) => {
    setCourses(prev => prev.map(c => (c.id === courseId ? { ...c, rating: average || c.rating, reviews: count } : c)))
  }

  const handleEnroll = (course: Course) => {
    if (!isAuthenticated) return requireLogin()
    setEnrollCourse(course)
  }

  const handleEnrolled = (courseId: string) => {
    setEnrolledIds(prev => new Set(prev).add(courseId))
  }

  const [searchParams] = useSearchParams()
  useEffect(() => { if (searchParams.get('tab') === 'webinars') setCourseSection('webinars') }, [searchParams])
  const initGroup = (searchParams.get('group') || 'College & Tech Courses') as CourseGroup
  const initSub = searchParams.get('sub') as CourseSubcategory | null

  const [activeGroup, setActiveGroup] = useState<CourseGroup>(initGroup)
  const [activeSub, setActiveSub] = useState<CourseSubcategory | null>(initSub)
  const [activeLevel, setActiveLevel] = useState('All Levels')
  const [activePrice, setActivePrice] = useState('All')
  const [search, setSearch] = useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // ─── Academic Hierarchy filter — same College → Course → Branch →
  // Semester → Subject cascade used on the Resources panel ────────────────
  const [hColleges, setHColleges] = useState<College[]>([])
  const [hCourses, setHCourses] = useState<AcademicCourse[]>([])
  const [hBranches, setHBranches] = useState<Branch[]>([])
  const [hSemesters, setHSemesters] = useState<Semester[]>([])
  const [hSubjects, setHSubjects] = useState<Subject[]>([])

  const [hSelectedCollegeId, setHSelectedCollegeId] = useState<number | null>(null)
  const [hSelectedCourseId, setHSelectedCourseId] = useState<number | null>(null)
  const [hSelectedBranchId, setHSelectedBranchId] = useState<number | null>(null)
  const [hSelectedSemesterId, setHSelectedSemesterId] = useState<number | null>(null)
  const [hSelectedSubjectId, setHSelectedSubjectId] = useState<number | null>(null)

  // Applied hierarchy filter — what's actually used to filter the course
  // grid. Kept separate from the dropdown selections above (the "draft")
  // so picking College → ... → Subject doesn't filter the grid until the
  // person clicks the Search button.
  const [appliedCollegeId, setAppliedCollegeId] = useState<number | null>(null)
  const [appliedCourseId, setAppliedCourseId] = useState<number | null>(null)
  const [appliedBranchId, setAppliedBranchId] = useState<number | null>(null)
  const [appliedSemesterId, setAppliedSemesterId] = useState<number | null>(null)
  const [appliedSubjectId, setAppliedSubjectId] = useState<number | null>(null)

  const handleHApplyFilter = () => {
    setAppliedCollegeId(hSelectedCollegeId)
    setAppliedCourseId(hSelectedCourseId)
    setAppliedBranchId(hSelectedBranchId)
    setAppliedSemesterId(hSelectedSemesterId)
    setAppliedSubjectId(hSelectedSubjectId)
    setActiveSub(null)
    // Close the mobile drawer so the (now-filtered) grid is actually visible —
    // without this the state updates correctly but the person can't see it
    // happen behind the open drawer and it looks like the button did nothing.
    setMobileFiltersOpen(false)
  }

  const [hActiveDropdown, setHActiveDropdown] = useState<'college' | 'course' | 'branch' | 'semester' | 'subject' | null>(null)
  const [hLoadingLevels, setHLoadingLevels] = useState<Record<string, boolean>>({})

  useEffect(() => {
    (async () => {
      try {
        setHLoadingLevels(prev => ({ ...prev, college: true }))
        const data = await fetchColleges()
        setHColleges(data)
      } catch (err) {
        console.error('Failed to load colleges:', err)
      } finally {
        setHLoadingLevels(prev => ({ ...prev, college: false }))
      }
    })()
  }, [])

  const handleHCollegeSelect = async (collegeId: number) => {
    setActiveSub(null)
    setHSelectedCollegeId(collegeId)
    setHSelectedCourseId(null); setHSelectedBranchId(null); setHSelectedSemesterId(null); setHSelectedSubjectId(null)
    setHCourses([]); setHBranches([]); setHSemesters([]); setHSubjects([])
    try {
      setHLoadingLevels(prev => ({ ...prev, course: true }))
      const data = await fetchCourses(collegeId)
      setHCourses(data)
      setHActiveDropdown('course')
    } catch (err) {
      console.error('Failed to load courses:', err)
    } finally {
      setHLoadingLevels(prev => ({ ...prev, course: false }))
    }
  }

  const handleHCourseSelect = async (courseId: number) => {
    setHSelectedCourseId(courseId)
    setHSelectedBranchId(null); setHSelectedSemesterId(null); setHSelectedSubjectId(null)
    setHBranches([]); setHSemesters([]); setHSubjects([])
    try {
      setHLoadingLevels(prev => ({ ...prev, branch: true }))
      const data = await fetchBranches(courseId)
      setHBranches(data)
      setHActiveDropdown('branch')
    } catch (err) {
      console.error('Failed to load branches:', err)
    } finally {
      setHLoadingLevels(prev => ({ ...prev, branch: false }))
    }
  }

  const handleHBranchSelect = async (branchId: number) => {
    setHSelectedBranchId(branchId)
    setHSelectedSemesterId(null); setHSelectedSubjectId(null)
    setHSemesters([]); setHSubjects([])
    try {
      setHLoadingLevels(prev => ({ ...prev, semester: true }))
      const data = await fetchSemesters(branchId)
      setHSemesters(data)
      setHActiveDropdown('semester')
    } catch (err) {
      console.error('Failed to load semesters:', err)
    } finally {
      setHLoadingLevels(prev => ({ ...prev, semester: false }))
    }
  }

  const handleHSemesterSelect = async (semesterId: number) => {
    setHSelectedSemesterId(semesterId)
    setHSelectedSubjectId(null)
    setHSubjects([])
    try {
      setHLoadingLevels(prev => ({ ...prev, subject: true }))
      const data = await fetchSubjects(semesterId)
      setHSubjects(data)
      setHActiveDropdown('subject')
    } catch (err) {
      console.error('Failed to load subjects:', err)
    } finally {
      setHLoadingLevels(prev => ({ ...prev, subject: false }))
    }
  }

  const handleHSubjectSelect = (subjectId: number) => {
    setHSelectedSubjectId(subjectId)
    setHActiveDropdown(null)
  }

  const handleHResetHierarchy = () => {
    setHSelectedCollegeId(null); setHSelectedCourseId(null); setHSelectedBranchId(null)
    setHSelectedSemesterId(null); setHSelectedSubjectId(null)
    setHCourses([]); setHBranches([]); setHSemesters([]); setHSubjects([])
    setHActiveDropdown(null)
    setAppliedCollegeId(null); setAppliedCourseId(null); setAppliedBranchId(null)
    setAppliedSemesterId(null); setAppliedSubjectId(null)
  }

  const renderHHierarchyDropdown = (
    label: string,
    placeholder: string,
    options: { id: number; name: string }[],
    selectedValue: number | null,
    onSelect: (id: number) => void,
    levelName: 'college' | 'course' | 'branch' | 'semester' | 'subject',
    disabled: boolean
  ) => {
    const isOpen = hActiveDropdown === levelName
    const isLoading = hLoadingLevels[levelName]
    const selectedObj = options.find(o => o.id === selectedValue)
    const displayName = selectedObj ? selectedObj.name : placeholder

    return (
      <div className="mb-3">
        <label className="block text-[10px] font-bold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider mb-1 px-1">
          {label}
        </label>
        <button
          disabled={disabled}
          onClick={() => setHActiveDropdown(isOpen ? null : levelName)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all text-left ${
            disabled
              ? 'opacity-40 bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-brand-dark-border cursor-not-allowed text-brand-muted dark:text-brand-dark-muted'
              : isOpen
              ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] dark:bg-white dark:text-black dark:border-white font-semibold shadow-sm'
              : 'bg-white dark:bg-brand-dark-card border-gray-100 dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text hover:border-gray-300 dark:hover:border-white/20'
          }`}
        >
          <span className="truncate pr-2 font-medium">{displayName}</span>
          {isLoading ? (
            <Loader2 size={13} className="animate-spin text-brand-muted" />
          ) : (
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 flex-shrink-0 ${
                isOpen ? 'rotate-180' : ''
              } ${disabled ? 'text-brand-muted' : ''}`}
            />
          )}
        </button>

        <AnimatePresence>
          {isOpen && !disabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden bg-gray-50 dark:bg-brand-dark-bg border border-gray-100 dark:border-brand-dark-border rounded-xl mt-1 max-h-48 overflow-y-auto"
            >
              {options.length === 0 ? (
                <div className="px-3 py-3 text-xs text-brand-muted dark:text-brand-dark-muted text-center">
                  No options available
                </div>
              ) : (
                <div className="py-1">
                  {options.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => onSelect(opt.id)}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-white/10 ${
                        selectedValue === opt.id
                          ? 'font-bold text-primary-500 bg-primary-50 dark:bg-primary-950/20'
                          : 'text-brand-text dark:text-brand-dark-text'
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const activeFilterCount = [
    activeSub ? 1 : 0,
    activeLevel !== 'All Levels' ? 1 : 0,
    activePrice !== 'All' ? 1 : 0,
    (appliedCollegeId || appliedCourseId || appliedBranchId || appliedSemesterId || appliedSubjectId) ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  useEffect(() => {
    if (courseSection !== 'webinars') return
    let active = true
    setWebinarsLoading(true)
    Promise.all([getLiveWebinars(), getWebinarRecordings(false)])
      .then(([live, recordings]) => { if (active) { setLiveWebinars(live); setWebinarRecordings(recordings) } })
      .catch(() => { if (active) toast.error('Could not load webinars right now') })
      .finally(() => { if (active) setWebinarsLoading(false) })
    return () => { active = false }
  }, [courseSection])

  const now = Date.now()
  const activeWebinar = liveWebinars.find(w => new Date(w.startsAt).getTime() <= now && (!w.endsAt || new Date(w.endsAt).getTime() > now))
  const upcomingWebinar = liveWebinars.find(w => new Date(w.startsAt).getTime() > now)

  const canAccessWebinar = (webinar: LiveWebinar | WebinarRecording) => {
    if (isAdmin) return true
    if (webinar.access === 'free') return true
    if (webinar.access === 'enrolled_free') return enrolledIds.size > 0
    return false
  }

  const webinarAccessLabel = (webinar: LiveWebinar | WebinarRecording) => {
    if (webinar.access === 'free') return 'Free'
    if (webinar.access === 'enrolled_free') return enrolledIds.size > 0 ? 'Free for you' : `₹${webinar.price} · Enrolled students free`
    return `Paid · ₹${webinar.price}`
  }

  const handleOpenReplay = async (webinar: WebinarRecording) => {
    if (!isAuthenticated && webinar.access !== 'free') return requireLogin()
    if (!canAccessWebinar(webinar)) {
      toast.error(webinar.access === 'enrolled_free' ? 'Enroll in any course to watch this webinar for free.' : `This webinar is paid (₹${webinar.price}). Payment checkout is not connected yet.`)
      return
    }
    try {
      setOpeningReplayId(webinar.id)
      const url = await resolveWebinarRecordingVideo(webinar)
      if (!url) { toast.error('Replay video is not available yet.'); return }
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open webinar replay')
    } finally {
      setOpeningReplayId(null)
    }
  }

  const published = courses.filter(c => c.status === 'Published')

  // Academic Filter (College → Course → Branch → Semester → Subject) and
  // the Category list are kept separate, not combined: if an academic
  // hierarchy level has been applied (via the Search button), filtering
  // runs on that alone (plus Level/Price/Search) and ignores the Group
  // tab + Category selection entirely, since a course's hierarchy
  // assignment is independent of which Group/Category it was tagged
  // under. Picking dropdowns alone does NOT filter yet — only clicking
  // Search (handleHApplyFilter) copies the draft picks into the applied
  // ones used here.
  const hierarchyActive = !!(appliedCollegeId || appliedCourseId || appliedBranchId || appliedSemesterId || appliedSubjectId)

  // Human-readable label for whichever hierarchy levels are applied, so the
  // results header actually reflects the Search that was run instead of
  // silently continuing to show the old Group/Category name — that mismatch
  // is what made the Search button look like it wasn't doing anything.
  const appliedHierarchyLabel = useMemo(() => {
    if (!hierarchyActive) return null
    const parts = [
      appliedCollegeId ? hColleges.find(c => c.id === appliedCollegeId)?.name : null,
      appliedCourseId ? hCourses.find(c => c.id === appliedCourseId)?.name : null,
      appliedBranchId ? hBranches.find(b => b.id === appliedBranchId)?.name : null,
      appliedSemesterId ? (() => { const s = hSemesters.find(s => s.id === appliedSemesterId); return s ? `Semester ${s.semester_number}` : null })() : null,
      appliedSubjectId ? hSubjects.find(s => s.id === appliedSubjectId)?.name : null,
    ].filter(Boolean)
    return parts.length ? parts.join(' › ') : 'Academic Filter results'
  }, [hierarchyActive, appliedCollegeId, appliedCourseId, appliedBranchId, appliedSemesterId, appliedSubjectId, hColleges, hCourses, hBranches, hSemesters, hSubjects])

  const filtered = useMemo(() => {
    return published.filter(c => {
      if (!hierarchyActive) {
        if (activeSub) {
          if (c.subcategory?.trim().toLowerCase() !== activeSub.trim().toLowerCase()) return false
        } else {
          if (c.group?.trim().toLowerCase() !== activeGroup.trim().toLowerCase()) return false
        }
      }
      if (activeLevel !== 'All Levels' && c.level?.trim().toLowerCase() !== activeLevel.trim().toLowerCase()) return false
      if (activePrice === 'Free' && c.price !== 'FREE' && c.price !== 0) return false
      if (activePrice === 'Paid' && (c.price === 'FREE' || c.price === 0)) return false
      if (appliedSubjectId && c.subjectId !== appliedSubjectId) return false
      if (appliedSemesterId && c.semesterId !== appliedSemesterId) return false
      if (appliedBranchId && c.branchId !== appliedBranchId) return false
      if (appliedCourseId && c.academicCourseId !== appliedCourseId) return false
      if (appliedCollegeId && c.collegeId !== appliedCollegeId) return false
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [published, activeGroup, activeSub, activeLevel, activePrice, search, appliedCollegeId, appliedCourseId, appliedBranchId, appliedSemesterId, appliedSubjectId])

  // Scroll the (now-updated) results into view and confirm the count whenever
  // an Academic Filter search is actually run — otherwise, on desktop the
  // grid updates quietly inside the same viewport and easily goes unnoticed,
  // and on first page load there's nothing to announce yet.
  const isFirstHierarchyApply = useRef(true)
  useEffect(() => {
    if (isFirstHierarchyApply.current) { isFirstHierarchyApply.current = false; return }
    if (!hierarchyActive) return
    document.getElementById('courses-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast.success(`${filtered.length} course${filtered.length !== 1 ? 's' : ''} found`)
  }, [appliedCollegeId, appliedCourseId, appliedBranchId, appliedSemesterId, appliedSubjectId])

  const groupStats = GROUPS.map(g => ({
    ...g,
    count: published.filter(c => c.group === g.label).length
  }))

  return (
    <div className="min-h-screen bg-white dark:bg-brand-dark-bg pt-16">
      {/* Hero — shared split layout */}
      <div className="bg-gradient-to-b from-gray-50/80 to-white dark:from-brand-dark-card/50 dark:to-brand-dark-bg border-b border-gray-100 dark:border-brand-dark-border py-10 px-4 sm:py-14">
        <div className="max-w-7xl mx-auto flex flex-col items-center lg:flex-row lg:gap-12">
          <motion.div className="flex-1 w-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full mb-4 tracking-widest uppercase">
              <Sparkles size={12} /> Tech & College Courses
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-brand-text dark:text-brand-dark-text mb-5 tracking-tight">
              Learn Without <span className="gradient-text">Limits</span>
            </h1>
            <p className="text-brand-muted dark:text-brand-dark-muted text-base md:text-lg max-w-xl leading-relaxed mb-7">
              From foundational engineering to high-package tech placements — explore {published.length}+ expert-curated courses across DSA, Web, Mobile, AI & university syllabi.
            </p>
            <div className="relative max-w-lg">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by topic, language, semester or college..."
                className="input pl-12"
              />
            </div>
          </motion.div>
          <aside className="hidden lg:block w-full max-w-md xl:max-w-lg flex-shrink-0 mt-8 lg:mt-0">
            <PanelSpotlightCard
              variant="course"
              stat={{ value: `${published.length}+`, label: 'Active Courses' }}
              secondaryStat={{ value: '4.9 ★', label: 'Student Rating' }}
            />
          </aside>
        </div>
      </div>

      {/* Course / Webinar switcher */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="inline-flex rounded-2xl border border-gray-100 dark:border-brand-dark-border bg-white dark:bg-brand-dark-card p-1 shadow-sm">
          <button onClick={() => setCourseSection('courses')} className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${courseSection === 'courses' ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black' : 'text-brand-muted dark:text-brand-dark-muted'}`}><BookOpen size={15}/> Courses</button>
          <button onClick={() => setCourseSection('webinars')} className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${courseSection === 'webinars' ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-md' : 'text-brand-muted dark:text-brand-dark-muted'}`}><Radio size={15}/> Webinars</button>
        </div>
      </div>

      {courseSection === 'webinars' ? (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="rounded-[28px] overflow-hidden border border-violet-100 dark:border-white/10 bg-gradient-to-br from-violet-50 via-white to-cyan-50 dark:from-violet-950/20 dark:via-brand-dark-card dark:to-cyan-950/20 p-6 sm:p-8 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-300 mb-3"><Radio size={12}/> Live & Replay Hub</div>
                <h2 className="text-3xl sm:text-4xl font-black text-brand-text dark:text-white">Webinars that keep you ahead.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-muted dark:text-brand-dark-muted">Join live sessions on Google Meet or Zoom. When a session ends, its recording can be saved here for you to watch later.</p>
              </div>
              <div className="rounded-2xl bg-white/80 dark:bg-black/20 border border-white/70 dark:border-white/10 px-5 py-4 min-w-[210px]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Sessions</p>
                <p className="text-3xl font-black text-brand-text dark:text-white">{webinarRecordings.length}</p>
                <p className="text-xs text-brand-muted">saved replays</p>
              </div>
            </div>
          </div>

          {webinarsLoading ? <div className="py-16 text-center text-sm text-brand-muted"><Loader2 className="animate-spin mx-auto mb-3"/>Loading webinars...</div> : (
            <>
              {/* Featured Speaker & Registration */}
              <div className="rounded-[28px] border border-violet-100 dark:border-white/10 bg-white dark:bg-brand-dark-card overflow-hidden shadow-sm mb-10">
                <div className="flex flex-col md:flex-row">
                  <div className="relative min-h-72 md:min-h-0 md:w-72 lg:w-80 shrink-0 overflow-hidden bg-gray-100 dark:bg-black/20">
                    <img
                      src={drAjayPhoto}
                      alt="Dr. Ajay Kumar"
                      className="absolute inset-0 h-full w-full object-cover object-top"
                      onError={(event) => { event.currentTarget.style.display = 'none' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-center text-xs font-bold uppercase tracking-widest text-brand-muted dark:text-brand-dark-muted" aria-hidden="true">
                      .
                    </div>
                  </div>
                  <div className="p-6 sm:p-8 flex-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 dark:bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-300 mb-4">
                      <Sparkles size={12} /> Featured Speaker
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-brand-text dark:text-white mb-2">
                      Dr. Ajay Kumar
                    </h3>
                    <div className="text-sm leading-relaxed text-brand-muted dark:text-brand-dark-muted mb-6 space-y-3">
                      <p>
                        Dr. Ajay Kumar is an experienced Computer Science & Engineering academic, researcher, and technology professional with <strong>17+ years of experience</strong> in teaching, research, and industry. He holds <strong>B.E., M.E., and Ph.D. qualifications</strong>, along with <strong>Post-Doctorate experience</strong>, and has contributed to <strong>32+ research papers</strong>.
                      </p>
                      <p>
                        His areas of expertise include Artificial Intelligence, Machine Learning, Data Science, Generative AI, Software Development, and emerging technologies. Through his academic and professional experience, Dr. Ajay Kumar focuses on connecting theoretical knowledge with practical, real-world applications.
                      </p>
                      <p>
                        He is passionate about helping students and professionals understand emerging technologies, develop relevant skills, and prepare themselves for the rapidly evolving AI-driven future.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-8">
                      {['AI', 'Machine Learning', 'Data Science', 'Generative AI', 'Software Development', 'Research & Innovation'].map(tag => (
                        <span key={tag} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-brand-text dark:text-brand-dark-text">
                          {tag}
                        </span>
                      ))}
                    </div>


                  </div>
                  
                  <div className="bg-gray-50 dark:bg-black/20 p-6 sm:p-8 md:w-72 lg:w-80 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 dark:border-white/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-5">
                      Speaker Highlights
                    </h4>
                    <ul className="space-y-5">
                      <li className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 p-2 text-violet-600 dark:text-violet-400">
                          <Trophy size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-brand-text dark:text-white">17+ Years Experience</div>
                          <div className="text-xs text-brand-muted dark:text-brand-dark-muted mt-0.5">Teaching, Research & Industry</div>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 p-2 text-cyan-600 dark:text-cyan-400">
                          <GraduationCap size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-brand-text dark:text-white">Ph.D. & Post-Doctorate</div>
                          <div className="text-xs text-brand-muted dark:text-brand-dark-muted mt-0.5">Advanced Academic Qualifications</div>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 p-2 text-amber-600 dark:text-amber-400">
                          <BookOpen size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-brand-text dark:text-white">32+ Research Papers</div>
                          <div className="text-xs text-brand-muted dark:text-brand-dark-muted mt-0.5">Significant Academic Contributions</div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {activeWebinar ? (
                <div className="rounded-3xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-brand-dark-card p-5 sm:p-7 shadow-lg mb-10">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3"><span className="relative flex h-3 w-3"><span className="absolute inset-0 rounded-full bg-red-500 animate-ping"/><span className="relative h-3 w-3 rounded-full bg-red-500"/></span><span className="text-xs font-black uppercase tracking-widest text-red-500">Live now · {activeWebinar.provider}</span></div>
                      <h3 className="text-2xl font-black text-brand-text dark:text-white">{activeWebinar.title}</h3>
                      <p className="mt-2 text-sm text-brand-muted dark:text-brand-dark-muted max-w-2xl">{activeWebinar.description}</p>
                      <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5"><Clock size={13}/> Started at {new Date(activeWebinar.startsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}{activeWebinar.endsAt && ` · Ends at ${new Date(activeWebinar.endsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}</p>
                    </div>
                    <a href={activeWebinar.joinUrl} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-bold text-white hover:bg-red-600"><Video size={16}/> Join Live <ExternalLink size={14}/></a>
                  </div>
                </div>
              ) : upcomingWebinar ? (
                <div className="rounded-3xl border border-violet-100 dark:border-white/10 bg-white dark:bg-brand-dark-card p-5 sm:p-7 shadow-sm mb-10">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-violet-500 mb-2">Next webinar · {upcomingWebinar.provider}</div>
                      <h3 className="text-xl font-black text-brand-text dark:text-white">{upcomingWebinar.title}</h3>
                      <p className="text-sm text-brand-muted mt-1">{upcomingWebinar.description}</p>
                      <div className="mt-5 mb-2">
                        <p className="text-sm font-bold text-brand-text dark:text-white mb-2 pb-1 border-b border-gray-100 dark:border-white/10 w-max">What will you get?</p>
                        <ul className="space-y-2 mt-3">
                          {[
                            'GATE & engineering career guidance',
                            'Mentorship for choosing the right course',
                            'AI & future career opportunities',
                            'Practical roadmap for your career'
                          ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-brand-muted dark:text-brand-dark-muted">
                              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-4 text-sm font-black text-violet-600 dark:text-violet-400">Register NOW — FREE!</p>
                      </div>
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/30 text-xs font-bold text-violet-700 dark:text-violet-300">
                        <CalendarDays size={14} className="text-violet-500" />
                        {new Date(upcomingWebinar.startsAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                    <a href="https://forms.gle/zwvivsCrV2ez28jv7" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/25"><CalendarDays size={16}/> Register for Webinar <ExternalLink size={14} /></a>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-gray-200 dark:border-white/10 p-10 text-center mb-10"><MonitorPlay className="mx-auto text-violet-400 mb-3" size={30}/><h3 className="font-black text-brand-text dark:text-white">No live webinar right now</h3><p className="text-sm text-brand-muted mt-1">Check the replays below or come back when the next session is scheduled.</p></div>
              )}

              <div>
                <div className="flex items-end justify-between mb-5"><div><p className="text-xs font-bold uppercase tracking-widest text-violet-500">Webinar Library</p><h3 className="text-2xl font-black text-brand-text dark:text-white">Past sessions</h3></div><span className="text-xs text-brand-muted">{webinarRecordings.length} replay{webinarRecordings.length !== 1 ? 's' : ''}</span></div>
                {webinarRecordings.length === 0 ? <div className="rounded-3xl border border-gray-100 dark:border-white/10 p-10 text-center text-sm text-brand-muted">No webinar recordings have been published yet.</div> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{webinarRecordings.map(w => <article key={w.id} className="group overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-brand-dark-card shadow-sm hover:shadow-xl transition-shadow"><div className="h-40 bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 relative flex items-center justify-center">{w.thumbnailUrl ? <img src={w.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover"/> : <Play size={38} className="text-white/90"/>}<span className="absolute left-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">REPLAY</span></div><div className="p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">{new Date(w.sessionDate).toLocaleDateString()}</p><span className="mt-1 inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300">{webinarAccessLabel(w)}</span><h4 className="mt-1 font-black text-brand-text dark:text-white line-clamp-2">{w.title}</h4><p className="mt-2 text-xs text-brand-muted dark:text-brand-dark-muted line-clamp-2">{w.description}</p>{w.videoUrl && <button onClick={() => handleOpenReplay(w)} disabled={openingReplayId === w.id} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-violet-600 dark:text-violet-300 disabled:opacity-60">{canAccessWebinar(w) ? (openingReplayId === w.id ? <><Loader2 size={13} className="animate-spin"/> Opening...</> : <>Watch replay <ExternalLink size={13}/></>) : <><Lock size={13}/> {webinarAccessLabel(w)}</>}</button>}</div></article>)}</div>}
              </div>
            </>
          )}
        </section>
      ) : (
      <>
      <div className="sticky top-16 z-30 bg-white dark:bg-brand-dark-bg border-b border-gray-100 dark:border-brand-dark-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
            {groupStats.map(g => (
              <button
                key={g.label}
                onClick={() => { handleHResetHierarchy(); setActiveGroup(g.label); setActiveSub(null) }}
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
        {/* Sidebar — desktop */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div className="sticky top-32">
            {/* Academic Hierarchy — same College → Course → Branch → Semester
                → Subject filter as the Resources panel */}
            <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-4 mb-4">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-brand-dark-border pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text dark:text-brand-dark-text">Academic Filter</h3>
                {(hSelectedCollegeId || hSelectedCourseId || hSelectedBranchId || hSelectedSemesterId || hSelectedSubjectId) && (
                  <button
                    onClick={handleHResetHierarchy}
                    className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider"
                  >
                    Reset
                  </button>
                )}
              </div>

              {renderHHierarchyDropdown(
                'College',
                'Select College...',
                hColleges,
                hSelectedCollegeId,
                handleHCollegeSelect,
                'college',
                false
              )}

              {renderHHierarchyDropdown(
                'Course',
                hSelectedCollegeId ? 'Select Course...' : 'Select College first',
                hCourses,
                hSelectedCourseId,
                handleHCourseSelect,
                'course',
                !hSelectedCollegeId
              )}

              {renderHHierarchyDropdown(
                'Branch',
                hSelectedCourseId ? 'Select Branch...' : 'Select Course first',
                hBranches,
                hSelectedBranchId,
                handleHBranchSelect,
                'branch',
                !hSelectedCourseId
              )}

              {renderHHierarchyDropdown(
                'Semester',
                hSelectedBranchId ? 'Select Semester...' : 'Select Branch first',
                hSemesters.map(s => ({ id: s.id, name: `Semester ${s.semester_number}` })),
                hSelectedSemesterId,
                handleHSemesterSelect,
                'semester',
                !hSelectedBranchId
              )}

              {renderHHierarchyDropdown(
                'Subject',
                hSelectedSemesterId ? 'Select Subject...' : 'Select Semester first',
                hSubjects,
                hSelectedSubjectId,
                handleHSubjectSelect,
                'subject',
                !hSelectedSemesterId
              )}

              <button
                onClick={handleHApplyFilter}
                disabled={!(hSelectedCollegeId || hSelectedCourseId || hSelectedBranchId || hSelectedSemesterId || hSelectedSubjectId)}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Search size={14} /> Search
              </button>
            </div>

            <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-4">
              <div className="space-y-0.5 mb-3 pb-3 border-b border-gray-100 dark:border-brand-dark-border">
                <button
                  onClick={() => setActiveSub(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!activeSub ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}
                >
                  All Categories ({published.filter(c => c.group === activeGroup).length})
                </button>
                {ALL_SUBCATEGORIES.map(({ label: sub, group }) => {
                  const cnt = published.filter(c => c.subcategory === sub).length
                  return (
                    <button
                      key={sub}
                      onClick={() => { handleHResetHierarchy(); setActiveSub(sub); setActiveGroup(group) }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${activeSub === sub ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                      <span className="truncate">{sub}</span>
                      {cnt > 0 && <span className={`text-[10px] font-bold ml-1 px-1.5 py-0.5 rounded-full ${activeSub === sub ? 'bg-white/20 dark:bg-black/20' : 'bg-gray-100 dark:bg-white/10'}`}>{cnt}</span>}
                    </button>
                  )
                })}
              </div>

              <AccordionSection title="Level" badge={activeLevel !== 'All Levels' ? 1 : 0}>
                {LEVELS.map(l => (
                  <button key={l} onClick={() => setActiveLevel(l)} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${activeLevel === l ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}>{l}</button>
                ))}
              </AccordionSection>

              <AccordionSection title="Price" badge={activePrice !== 'All' ? 1 : 0}>
                {PRICES.map(p => (
                  <button key={p} onClick={() => setActivePrice(p)} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${activePrice === p ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}>{p}</button>
                ))}
              </AccordionSection>

              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setActiveSub(null); setActiveLevel('All Levels'); setActivePrice('All'); handleHResetHierarchy() }}
                  className="w-full mt-4 pt-4 border-t border-gray-100 dark:border-brand-dark-border text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors text-center"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main id="courses-list" className="flex-1 min-w-0 scroll-mt-24">
          <div className="flex items-center justify-between mb-6 gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text truncate">{appliedHierarchyLabel || activeSub || activeGroup}</h2>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">{filtered.length} course{filtered.length !== 1 ? 's' : ''} found</p>
            </div>
            {/* Mobile filter trigger */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="md:hidden flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-500 text-white">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-brand-muted dark:text-brand-dark-muted mb-3" />
              <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Loading courses...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen size={48} className="mx-auto text-gray-200 dark:text-brand-dark-muted mb-4" />
              <h3 className="text-lg font-semibold text-brand-text dark:text-brand-dark-text mb-2">No courses found</h3>
              <p className="text-brand-muted dark:text-brand-dark-muted text-sm">
                {hierarchyActive
                  ? 'No courses have been linked to this College/Course/Branch/Semester/Subject yet. Try a broader level (e.g. just the Course) or reset the Academic Filter.'
                  : 'Try adjusting your filters or search terms.'}
              </p>
              {hierarchyActive && (
                <button
                  onClick={handleHResetHierarchy}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Reset Academic Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  userId={userId}
                  isAdmin={isAdmin}
                  isPremium={Boolean(user?.isPremium)}
                  isEnrolled={enrolledIds.has(course.id)}
                  isPending={pendingIds.has(course.id)}
                  onPlay={handlePlay}
                  onEnroll={handleEnroll}
                  onRated={handleCourseRated}
                />
              ))}
            </div>
          )}
        </main>
      </div>


      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFiltersOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
              className="fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white dark:bg-brand-dark-card z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-brand-dark-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-brand-muted dark:text-brand-dark-muted" />
                  <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text">Refine results</h3>
                </div>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  aria-label="Close filters"
                >
                  <X size={18} className="text-brand-text dark:text-brand-dark-text" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-2">
                <AccordionSection
                  title="Academic Filter"
                  defaultOpen
                  badge={(hSelectedCollegeId || hSelectedCourseId || hSelectedBranchId || hSelectedSemesterId || hSelectedSubjectId) ? 1 : 0}
                >
                  {renderHHierarchyDropdown('College', 'Select College...', hColleges, hSelectedCollegeId, handleHCollegeSelect, 'college', false)}
                  {renderHHierarchyDropdown('Course', hSelectedCollegeId ? 'Select Course...' : 'Select College first', hCourses, hSelectedCourseId, handleHCourseSelect, 'course', !hSelectedCollegeId)}
                  {renderHHierarchyDropdown('Branch', hSelectedCourseId ? 'Select Branch...' : 'Select Course first', hBranches, hSelectedBranchId, handleHBranchSelect, 'branch', !hSelectedCourseId)}
                  {renderHHierarchyDropdown('Semester', hSelectedBranchId ? 'Select Semester...' : 'Select Branch first', hSemesters.map(s => ({ id: s.id, name: `Semester ${s.semester_number}` })), hSelectedSemesterId, handleHSemesterSelect, 'semester', !hSelectedBranchId)}
                  {renderHHierarchyDropdown('Subject', hSelectedSemesterId ? 'Select Subject...' : 'Select Semester first', hSubjects, hSelectedSubjectId, handleHSubjectSelect, 'subject', !hSelectedSemesterId)}

                  <button
                    onClick={handleHApplyFilter}
                    disabled={!(hSelectedCollegeId || hSelectedCourseId || hSelectedBranchId || hSelectedSemesterId || hSelectedSubjectId)}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Search size={14} /> Search
                  </button>
                </AccordionSection>

                <div className="space-y-0.5 mb-3 pb-3 border-b border-gray-100 dark:border-brand-dark-border">
                  <button
                    onClick={() => setActiveSub(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!activeSub ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}
                  >
                    All Categories ({published.filter(c => c.group === activeGroup).length})
                  </button>
                  {ALL_SUBCATEGORIES.map(({ label: sub, group }) => {
                    const cnt = published.filter(c => c.subcategory === sub).length
                    return (
                      <button
                        key={sub}
                        onClick={() => { handleHResetHierarchy(); setActiveSub(sub); setActiveGroup(group) }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${activeSub === sub ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}
                      >
                        <span className="truncate">{sub}</span>
                        {cnt > 0 && <span className={`text-[10px] font-bold ml-1 px-1.5 py-0.5 rounded-full ${activeSub === sub ? 'bg-white/20 dark:bg-black/20' : 'bg-gray-100 dark:bg-white/10'}`}>{cnt}</span>}
                      </button>
                    )
                  })}
                </div>

                <AccordionSection title="Level" badge={activeLevel !== 'All Levels' ? 1 : 0}>
                  {LEVELS.map(l => (
                    <button key={l} onClick={() => setActiveLevel(l)} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${activeLevel === l ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}>{l}</button>
                  ))}
                </AccordionSection>

                <AccordionSection title="Price" badge={activePrice !== 'All' ? 1 : 0}>
                  {PRICES.map(p => (
                    <button key={p} onClick={() => setActivePrice(p)} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${activePrice === p ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}>{p}</button>
                  ))}
                </AccordionSection>
              </div>

              <div className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-brand-dark-border flex gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setActiveSub(null); setActiveLevel('All Levels'); setActivePrice('All'); handleHResetHierarchy() }}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border border-gray-200 dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors"
                >
                  Show {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      </>
      )}

      {enrollCourse && (
        <EnrollModal
          course={enrollCourse}
          userId={userId ?? `guest-${Date.now()}`}
          defaultEmail={user?.email}
          defaultName={user?.name}
          onClose={() => setEnrollCourse(null)}
          onEnrolled={(courseId) => {
            handleEnrolled(courseId)
            loadUserEnrollments()
            setEnrollCourse(null)
          }}
        />
      )}

      {showPremiumModal && (
        <EnrollModal
          isPremiumMembership={true}
          premiumAmount={allAccessPrice}
          userId={userId ?? `guest-${Date.now()}`}
          defaultEmail={user?.email}
          defaultName={user?.name}
          onClose={() => setShowPremiumModal(false)}
          onEnrolled={() => {
            loadUserEnrollments()
            setShowPremiumModal(false)
          }}
        />
      )}

      {playCourse && (
        <VideoPlayerModal
          course={playCourse}
          userId={userId ?? ''}
          userName={user?.name ?? 'Guest'}
          isAdmin={isAdmin}
          canWatch={isAdmin || Boolean(user?.isPremium) || enrolledIds.has(playCourse.id) || playCourse.price === 'FREE' || playCourse.price === 0}
          onClose={() => setPlayCourse(null)}
        />
      )}
    </div>
  )
}
