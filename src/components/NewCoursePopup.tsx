import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  ArrowRight,
  Clock,
  Star,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  PlayCircle
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchPublishedSiteCourses } from '../lib/courseService'
import { useContentStore, type Course } from '../store/contentStore'

const STORAGE_DISMISS_KEY = 'skills021_new_courses_popup_dismissed_session'
const MAX_COURSES = 5
const AUTO_ROTATE_MS = 3000 // Automatically rotates every 3 seconds

const getInitialCourses = (): Course[] => {
  try {
    const storeCourses = useContentStore.getState().courses.filter((c) => c.status === 'Published')
    return storeCourses.slice(0, MAX_COURSES)
  } catch {
    return []
  }
}

export default function NewCoursePopup() {
  const location = useLocation()
  const navigate = useNavigate()

  const [coursesList, setCoursesList] = useState<Course[]>(getInitialCourses)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return (
      location.pathname === '/' &&
      sessionStorage.getItem(STORAGE_DISMISS_KEY) !== '1' &&
      getInitialCourses().length > 0
    )
  })
  const [isHovered, setIsHovered] = useState(false)
  const rotateRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (location.pathname !== '/') {
      setIsOpen(false)
      return
    }

    if (sessionStorage.getItem(STORAGE_DISMISS_KEY) === '1') {
      return
    }

    setIsOpen(true)

    let cancelled = false

    const syncLatestCourses = async () => {
      try {
        let publishedCourses: Course[] = []
        try {
          publishedCourses = await fetchPublishedSiteCourses()
        } catch {
          // Fallback handled below
        }

        if (!publishedCourses || publishedCourses.length === 0) {
          publishedCourses = useContentStore.getState().courses.filter((c) => c.status === 'Published')
        }

        if (cancelled || !publishedCourses || publishedCourses.length === 0) return

        const recent = publishedCourses.slice(0, MAX_COURSES)
        setCoursesList(recent)
        setIsOpen(true)
      } catch (err) {
        console.warn('NewCoursePopup sync error:', err)
      }
    }

    syncLatestCourses()

    return () => {
      cancelled = true
    }
  }, [location.pathname])

  // Automatically cycle courses every 3 seconds, pausing when user hovers
  useEffect(() => {
    if (!isOpen || isHovered || coursesList.length <= 1) {
      if (rotateRef.current) clearInterval(rotateRef.current)
      return
    }

    rotateRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % coursesList.length)
    }, AUTO_ROTATE_MS)

    return () => {
      if (rotateRef.current) clearInterval(rotateRef.current)
    }
  }, [isOpen, isHovered, coursesList.length])

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % coursesList.length)
  }

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + coursesList.length) % coursesList.length)
  }

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_DISMISS_KEY, '1')
    setIsOpen(false)
  }

  const handleExplore = (course: Course) => {
    sessionStorage.setItem(STORAGE_DISMISS_KEY, '1')
    setIsOpen(false)
    navigate('/courses', { state: { highlightCourseId: course.id } })
  }

  if (coursesList.length === 0) return null

  const currentCourse = coursesList[currentIndex] || coursesList[0]
  if (!currentCourse) return null

  const isFree = currentCourse.price === 'FREE' || currentCourse.price === 0

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="center-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-popup-title"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative my-auto w-full max-w-xl sm:max-w-2xl overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#12161d] shadow-2xl"
          >
            {/* Dedicated Top Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close popup"
              title="Close"
              className="absolute right-4 top-4 z-30 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="p-6 sm:p-7">
              {/* Clean, Non-Colorful Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800/80 pr-10">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                  <span className="text-xs font-semibold tracking-wider uppercase text-neutral-700 dark:text-neutral-300">
                    Newly Added Course
                  </span>
                  {coursesList.length > 1 && (
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">
                      ({currentIndex + 1} of {coursesList.length})
                    </span>
                  )}
                </div>
              </div>

              {/* Main Course Showcase */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                {/* Visual Preview */}
                <div className="sm:col-span-5 relative group overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 aspect-[16/11]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentCourse.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      onClick={() => handleExplore(currentCourse)}
                      className="h-full w-full cursor-pointer relative"
                    >
                      {currentCourse.thumbnail ? (
                        <img
                          src={currentCourse.thumbnail}
                          alt={currentCourse.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-neutral-500 dark:text-neutral-400">
                          <BookOpen size={36} className="mb-1 opacity-70" />
                          <span className="text-xs font-semibold uppercase tracking-wider">
                            {currentCourse.subcategory}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                      {/* Play hover effect */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-900 shadow-md">
                          <PlayCircle size={26} />
                        </span>
                      </div>

                      {/* Level & Price Tags */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                        <span className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                          {currentCourse.level}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold backdrop-blur-sm ${
                            isFree
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-neutral-900 shadow-sm'
                          }`}
                        >
                          {isFree ? 'FREE' : `₹${currentCourse.price}`}
                        </span>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Left & Right Arrow Controls on Preview Banner */}
                  {coursesList.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrev}
                        aria-label="Previous course"
                        title="Previous course"
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors shadow"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        aria-label="Next course"
                        title="Next course"
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors shadow"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </div>

                {/* Course Details */}
                <div className="sm:col-span-7 flex flex-col justify-between">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentCourse.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                          {currentCourse.subcategory}
                        </span>
                        {currentCourse.duration && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                            <Clock size={11} />
                            {currentCourse.duration}
                          </span>
                        )}
                      </div>

                      <h3
                        id="course-popup-title"
                        onClick={() => handleExplore(currentCourse)}
                        className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer line-clamp-2"
                      >
                        {currentCourse.title}
                      </h3>

                      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {currentCourse.description ||
                          'Comprehensive structured curriculum designed to build practical, real-world skills.'}
                      </p>

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                          {currentCourse.rating || 4.9}
                        </span>
                        <span className="text-neutral-400">
                          ({currentCourse.reviews || 240}+ reviews)
                        </span>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Clean CTAs */}
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleExplore(currentCourse)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-sm"
                    >
                      <span>Explore Course</span>
                      <ArrowRight size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="inline-flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>

              {/* Minimal Stepper Dots Only — No quote / text */}
              {coursesList.length > 1 && (
                <div className="mt-5 flex items-center justify-center gap-1.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                  {coursesList.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to course ${i + 1}`}
                      onClick={() => setCurrentIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        i === currentIndex
                          ? 'w-6 bg-neutral-900 dark:bg-white'
                          : 'w-1.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
