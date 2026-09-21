import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { BookOpen, Clock, Users, Star, Search, Play, SlidersHorizontal, ChevronDown, X, Loader2, Lock, CheckCircle2, Sparkles, GraduationCap, Radio, Video, ExternalLink, CalendarDays, MonitorPlay, Trophy, TrendingUp, Zap, ArrowRight, BadgePercent, Package, FileText, MessageCircle } from 'lucide-react'
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
import { supabase } from '../lib/supabase'
import { getEnrollmentsForUser, getPaymentSettings } from '../lib/videoEngagementService'
import { fetchSubjectBundle, fetchPublishedSubjectBundles } from '../lib/subjectBundleService'
import type { SubjectBundle } from '../lib/subjectBundleTypes'
import { fetchPublishedSemesterBundles } from '../lib/semesterBundleService'
import type { SemesterBundle } from '../lib/semesterBundleTypes'
import { fetchResourceBundleBySubject } from '../lib/resourceBundleService'
import type { ResourceBundle } from '../lib/resourceBundleTypes'
import { fetchUserEntitlements } from '../lib/bundleAuthorizationService'
import EnrollModal from '../components/EnrollModal'
import VideoPlayerModal from '../components/VideoPlayerModal'
import CourseRatingMenu from '../components/CourseRatingMenu'
import {
  getLiveWebinars,
  getWebinarRecordings,
  resolveWebinarRecordingVideo,
  getWebinarTimingState,
  type LiveWebinar,
  type WebinarRecording,
} from '../lib/webinarService'
import PanelSpotlightCard from '../components/PanelSpotlightCard'
import { showAuthRequiredToast } from '../components/AuthRequiredToast'

const GROUPS: { label: CourseGroup }[] = [
  { label: 'Competitive Exams' },
  { label: 'College & Tech Courses' },
]

const SUBCATEGORIES: Record<CourseGroup, CourseSubcategory[]> = {
  'Foundation Programs': ['Class 1-5', 'Class 6-8', 'Class 9-10', 'Class 11-12'],
  'Competitive Exams': ['JEE Preparation', 'NEET Preparation', 'CUET Preparation', 'Olympiads', 'NTSE'],
  'College & Tech Courses': [
    'Certificate', 'DSA', 'IPU Courses', 'AKTU Courses', 'Web Development', 'App Development', 'Flutter Development',
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

import type { ProductDiscount } from '../lib/pricingTypes'
import { applyDiscountToPrice, formatDiscountLabel } from '../lib/discountService'
import { fetchAllDiscounts } from '../lib/discountService'
import { calculateSemesterRates } from '../components/HomeSemesterBundlesSection'

interface SemesterBundleCardProps {
  bundle: SemesterBundle
  isUnlocked: boolean
  discount?: ProductDiscount | null
}

function SemesterBundleCard({ bundle, isUnlocked, discount }: SemesterBundleCardProps) {
  const subjectNames = (bundle.subjects || [])
    .map(s => s.subjectName || s.subjectCode)
    .filter(Boolean)

  const finalSixMonth = discount ? applyDiscountToPrice(bundle.sixMonthPrice, discount) : bundle.sixMonthPrice
  const finalLifetime = discount ? applyDiscountToPrice(bundle.lifetimePrice, discount) : bundle.lifetimePrice

  const isFourYear = bundle.title?.toLowerCase().includes('4-year')
  const semRates = calculateSemesterRates(finalSixMonth || (bundle.semesterNumber === 8 ? 699 : 1499), isFourYear)
  const lifetimeRates = calculateSemesterRates(finalLifetime || 5080, true)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border group hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between overflow-hidden"
    >
      {/* Thumbnail Banner */}
      <Link
        to={`/courses/semester-bundles/${bundle.id}`}
        className="relative h-48 sm:h-52 bg-slate-900 dark:bg-black overflow-hidden rounded-t-2xl flex items-center justify-center cursor-pointer group"
      >
        {bundle.thumbnailUrl ? (
          <img
            src={bundle.thumbnailUrl}
            alt={bundle.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-[#0F0F12] flex flex-col items-center justify-center p-6 text-center">
            <Sparkles size={44} className="text-white/20 mb-2" />
            <span className="text-xs font-mono font-bold tracking-widest text-primary-300 uppercase">
              SEMESTER {bundle.semesterNumber ?? 'BUNDLE'}
            </span>
            <span className="text-sm font-bold text-white/90 line-clamp-2 mt-1 max-w-[220px]">
              {bundle.title}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {bundle.semesterNumber != null && (
            <span className="px-2.5 py-1 text-xs font-bold bg-primary-600/90 backdrop-blur-md text-white rounded-lg border border-white/20 shadow-xs">
              Semester {bundle.semesterNumber}
            </span>
          )}
          {bundle.branchCode && (
            <span className="px-2.5 py-1 text-xs font-mono font-bold bg-white/20 backdrop-blur-md text-white rounded-lg border border-white/20 shadow-xs">
              {bundle.branchCode}
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {isUnlocked ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-500 text-white rounded-lg shadow-sm">
              <CheckCircle2 size={12} /> Unlocked
            </span>
          ) : (
            <>
              {discount && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-black bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-lg shadow-sm">
                  <Sparkles size={11} /> {formatDiscountLabel(discount)}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#0A0A0A] text-white border border-white/20 rounded-lg shadow-xs">
                <Sparkles size={12} /> Semester Pack
              </span>
            </>
          )}
        </div>

        {/* Bottom Badges on Thumbnail */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/90">
          <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/10 font-semibold">
            <Package size={11} className="text-primary-400" /> {bundle.subjects?.length || 0} Subject Bundles
            {Boolean(bundle.totalVideos) && (
              <>
                <span className="text-white/40">•</span>
                <Play size={10} className="text-primary-400" /> {bundle.totalVideos} Videos
              </>
            )}
          </span>
          <span className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 font-bold text-amber-300">
            <Star size={11} className="fill-amber-400 text-amber-400" /> {bundle.rating ?? 4.9}
          </span>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 bg-primary-500/90 text-white rounded-full flex items-center justify-center shadow-lg border border-white/30 transform group-hover:scale-110 transition-transform">
            <ArrowRight size={20} />
          </div>
        </div>
      </Link>

      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Academic Hierarchy */}
          {(bundle.academicCourseName || bundle.branchName || bundle.semesterNumber) && (
            <p className="text-[11px] font-semibold text-brand-muted dark:text-brand-dark-muted mb-1.5 uppercase tracking-wider">
              {[bundle.collegeName, bundle.academicCourseName, bundle.branchName].filter(Boolean).join(' • ')}
            </p>
          )}

          {/* Title */}
          <Link to={`/courses/semester-bundles/${bundle.id}`}>
            <h3 className="text-base sm:text-lg font-black text-brand-text dark:text-brand-dark-text group-hover:text-primary-500 transition-colors line-clamp-2 mb-2">
              {bundle.title}
            </h3>
          </Link>

          <p className="text-xs text-brand-muted dark:text-brand-dark-muted line-clamp-2 mb-3 leading-relaxed">
            {bundle.description || `All-in-one semester bundle unlocking complete video lectures, unit notes, and resources for Semester ${bundle.semesterNumber}.`}
          </p>

          {/* Mapped Subject Pills */}
          {subjectNames.length > 0 && (
            <div className="mb-4">
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1.5">
                Included Subjects ({subjectNames.length}):
              </span>
              <div className="flex flex-wrap gap-1">
                {subjectNames.slice(0, 4).map((name, i) => (
                  <span
                    key={i}
                    className="inline-block text-[10px] px-2 py-0.5 rounded-md font-medium bg-gray-100 dark:bg-white/10 text-brand-text dark:text-brand-dark-text truncate max-w-[150px]"
                  >
                    {name}
                  </span>
                ))}
                {subjectNames.length > 4 && (
                  <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-primary-500/10 text-primary-600 dark:text-primary-400">
                    +{subjectNames.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rs Pricing Section: Shows Rs 8.33/day for 1,3,5 and Rs 3.48/day for Complete 4-Year */}
        <div className="pt-3 border-t border-gray-100 dark:border-brand-dark-border mt-auto">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted block">
                {bundle.semesterNumber ? `Semester ${bundle.semesterNumber} Plan` : 'Semester Plan'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-black text-violet-600 dark:text-violet-400">
                  ₹{semRates.daily}
                </span>
                <span className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted">/ day</span>
              </div>
              <span className="text-[10px] text-brand-muted dark:text-brand-dark-muted block">
                (₹{semRates.monthly}/mo · 6 Months)
              </span>
            </div>

            {bundle.lifetimeEnabled && (
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Complete 4-Year Pass
                </span>
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">₹3.48</span>
                  <span className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted">/ day</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                  All 8 Semesters Pass
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 text-center">
            <span className="text-[10px] font-medium text-primary-600 dark:text-primary-400">
              Click below to view real bundle price & syllabus
            </span>
          </div>
        </div>
      </div>

      {/* Button */}
      <div className="p-4 pt-0">
        <Link
          to={`/courses/semester-bundles/${bundle.id}`}
          className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${isUnlocked
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
              : 'bg-[#0A0A0A] hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 shadow-sm'
            }`}
        >
          {isUnlocked ? (
            <>
              <CheckCircle2 size={15} /> Access Semester Bundle
            </>
          ) : (
            <>
              <Sparkles size={15} /> View Bundle & Real Price <ArrowRight size={13} />
            </>
          )}
        </Link>
      </div>
    </motion.div>
  )
}

interface SubjectBundleCardProps {
  bundle: SubjectBundle
  isUnlocked: boolean
}

function SubjectBundleCard({ bundle, isUnlocked }: SubjectBundleCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border group hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between overflow-hidden"
    >
      {/* Thumbnail Banner */}
      <Link
        to={`/courses/bundles/${bundle.subjectId}`}
        className="fx-bundle-thumb relative h-48 sm:h-52 bg-slate-900 dark:bg-black overflow-hidden rounded-t-2xl flex items-center justify-center cursor-pointer group"
      >
        {bundle.thumbnailUrl ? (
          <img
            src={bundle.thumbnailUrl}
            alt={bundle.subjectName || 'Subject Bundle'}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <Package size={44} className="text-white/20 mb-2" />
            <span className="text-xs font-mono font-bold tracking-widest text-primary-300 uppercase">
              {bundle.subjectCode || 'SUBJECT BUNDLE'}
            </span>
            <span className="text-xs font-bold text-white/80 line-clamp-1 mt-1 max-w-[200px]">
              {bundle.subjectName}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {bundle.subjectCode && (
            <span className="px-2.5 py-1 text-xs font-mono font-bold bg-white/20 backdrop-blur-md text-white rounded-lg border border-white/20 shadow-xs">
              {bundle.subjectCode}
            </span>
          )}
          {bundle.academicCourseName && (
            <span className="px-2.5 py-1 text-xs font-semibold bg-primary-500/85 backdrop-blur-md text-white rounded-lg border border-primary-400/30 truncate max-w-[130px] shadow-xs">
              {bundle.academicCourseName}
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3">
          {isUnlocked ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-500 text-white rounded-lg shadow-sm">
              <CheckCircle2 size={12} /> Unlocked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-amber-500/95 backdrop-blur-md text-white rounded-lg shadow-xs">
              <Package size={12} /> Bundle
            </span>
          )}
        </div>

        {/* Bottom Badges on Thumbnail */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/90">
          <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 font-semibold">
            <Play size={10} className="text-primary-400" /> {bundle.videoCount || 0} Lectures
            <span className="text-white/40">•</span>
            <FileText size={10} className="text-amber-400" /> {bundle.resourceCount || 0} Notes
          </span>
          <span className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 font-bold text-amber-300">
            <Star size={11} className="fill-amber-400 text-amber-400" /> {bundle.rating ?? 4.8}
            <span className="text-white/60 font-normal">({bundle.reviews ?? 120})</span>
          </span>
        </div>

        {/* Play/Open Overlay on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 bg-primary-500/90 text-white rounded-full flex items-center justify-center shadow-lg border border-white/30 transform group-hover:scale-110 transition-transform">
            <Play size={18} className="translate-x-0.5" />
          </div>
        </div>
      </Link>

      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Academic Hierarchy */}
          {(bundle.academicCourseName || bundle.branchName || bundle.semesterNumber) && (
            <p className="text-[11px] font-semibold text-brand-muted dark:text-brand-dark-muted mb-1.5 uppercase tracking-wider">
              {[bundle.academicCourseName, bundle.branchName, bundle.semesterNumber ? `Semester ${bundle.semesterNumber}` : null].filter(Boolean).join(' • ')}
            </p>
          )}

          {/* Title */}
          <Link to={`/courses/bundles/${bundle.subjectId}`}>
            <h3 className="text-base sm:text-lg font-black text-brand-text dark:text-brand-dark-text group-hover:text-primary-500 transition-colors line-clamp-2 mb-2">
              {bundle.subjectName || `Subject #${bundle.subjectId}`}
            </h3>
          </Link>

          <p className="text-xs text-brand-muted dark:text-brand-dark-muted line-clamp-2 mb-4 leading-relaxed">
            {bundle.description || 'Complete semester preparation bundle including all unit-wise video lectures, chapter notes, and revision PDFs.'}
          </p>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 mb-4 text-center">
            <div>
              <div className="text-xs font-bold text-brand-text dark:text-brand-dark-text flex items-center justify-center gap-1">
                <Play size={11} className="text-primary-500" />
                {bundle.videoCount || 0}
              </div>
              <div className="text-[10px] text-brand-muted dark:text-brand-dark-muted">Lectures</div>
            </div>
            <div>
              <div className="text-xs font-bold text-brand-text dark:text-brand-dark-text flex items-center justify-center gap-1">
                <FileText size={11} className="text-amber-500" />
                {bundle.resourceCount || 0}
              </div>
              <div className="text-[10px] text-brand-muted dark:text-brand-dark-muted">Notes/PDFs</div>
            </div>
            <div>
              <div className="text-xs font-bold text-brand-text dark:text-brand-dark-text flex items-center justify-center gap-1">
                <BookOpen size={11} className="text-emerald-500" />
                {bundle.unitCount || 0}
              </div>
              <div className="text-[10px] text-brand-muted dark:text-brand-dark-muted">Units</div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline justify-between pt-3 border-t border-gray-100 dark:border-brand-dark-border mt-auto">
          {bundle.sixMonthEnabled && (
            <div>
              <span className="text-[11px] text-brand-muted dark:text-brand-dark-muted block">6-Month Access</span>
              <span className="text-sm font-bold text-brand-text dark:text-brand-dark-text">₹{bundle.sixMonthPrice}</span>
            </div>
          )}
          {bundle.lifetimeEnabled && (
            <div className={bundle.sixMonthEnabled ? 'text-right' : ''}>
              <span className="text-[11px] text-brand-muted dark:text-brand-dark-muted block">Lifetime Access</span>
              <span className="text-sm font-black text-primary-600 dark:text-primary-400">₹{bundle.lifetimePrice}</span>
            </div>
          )}
          {!bundle.sixMonthEnabled && !bundle.lifetimeEnabled && (
            <div>
              <span className="text-xs font-bold text-brand-muted">Pricing Unavailable</span>
            </div>
          )}
        </div>
      </div>

      {/* Button */}
      <div className="p-4 pt-0">
        <Link
          to={`/courses/bundles/${bundle.subjectId}`}
          className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${isUnlocked
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm'
              : 'bg-[#0A0A0A] hover:bg-primary-600 text-white dark:bg-white dark:text-black dark:hover:bg-primary-500 dark:hover:text-white shadow-sm'
            }`}
        >
          {isUnlocked ? (
            <>
              <CheckCircle2 size={15} /> Open Curriculum
            </>
          ) : (
            <>
              <Package size={15} /> Open Subject Bundle <ArrowRight size={13} />
            </>
          )}
        </Link>
      </div>
    </motion.div>
  )
}

interface CourseCardProps {
  course: Course
  userId: string | null
  isAdmin: boolean
  isPremium: boolean
  isEnrolled: boolean
  isPending: boolean
  isSubjectBundleUnlocked?: boolean
  isResourceBundleUnlocked?: boolean
  isCourseBundleUnlocked?: boolean
  allCourses?: Course[]
  onPlay: (course: Course) => void
  onEnroll: (course: Course) => void
  onRated: (courseId: string, average: number, count: number) => void
  onViewBundleDetails?: (bundle: Course) => void
}

function CourseCard({
  course,
  userId,
  isAdmin,
  isPremium,
  isEnrolled,
  isPending,
  isSubjectBundleUnlocked,
  isResourceBundleUnlocked,
  isCourseBundleUnlocked,
  allCourses = [],
  onPlay,
  onEnroll,
  onRated,
  onViewBundleDetails,
}: CourseCardProps) {
  const isCourseBundle = Boolean(course.isCourseBundle)
  const isBundleOnly = Boolean(course.isBundleOnly)
  const isFreeCourse = !isBundleOnly && (course.price === 'FREE' || course.price === 0)
  const canWatch = isAdmin || isPremium || isEnrolled || isFreeCourse || Boolean(isSubjectBundleUnlocked) || Boolean(isCourseBundleUnlocked)

  // Compute bundled child courses and total standalone value for Course Bundles (strictly individual videos)
  const bundledCourses = useMemo(() => {
    if (!isCourseBundle || !course.bundledCourseIds?.length) return []
    const idSet = new Set(course.bundledCourseIds.map(id => String(id).replace(/^course_/, '')))
    return allCourses.filter(c => {
      const isBundle = c.isCourseBundle || (c.tags || []).includes('__is_course_bundle')
      const isUnderBundle = c.isBundleOnly || (c.tags || []).includes('__bundle_only')
      if (isBundle || isUnderBundle) return false
      return idSet.has(String(c.id).replace(/^course_/, ''))
    })
  }, [isCourseBundle, course.bundledCourseIds, allCourses])

  const standaloneTotal = useMemo(() => {
    return bundledCourses.reduce((sum, c) => sum + (typeof c.price === 'number' ? c.price : 0), 0)
  }, [bundledCourses])

  const bundleSavings = useMemo(() => {
    if (typeof course.price === 'number' && standaloneTotal > course.price) {
      const saved = standaloneTotal - course.price
      const rawPct = Math.round((saved / standaloneTotal) * 100)
      const pct = course.price > 0 ? Math.min(99, rawPct) : rawPct
      return { saved, pct }
    }
    return null
  }, [course.price, standaloneTotal])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border group hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between overflow-hidden"
    >
      {/* Thumbnail */}
      <div
        onClick={() => {
          if (isCourseBundle) {
            onViewBundleDetails?.(course)
          } else if (canWatch) {
            onPlay(course)
          }
        }}
        className="fx-course-thumb relative h-44 bg-gray-900 dark:bg-black overflow-hidden rounded-t-2xl flex items-center justify-center cursor-pointer"
      >
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <BookOpen size={48} className="text-white/10" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {isCourseBundle ? (
            <span className="px-2.5 py-1 text-xs font-black bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg shadow-sm flex items-center gap-1">
              <Sparkles size={11} /> Combo Bundle ({course.bundledCourseIds?.length || bundledCourses.length || 0})
            </span>
          ) : (
            <>
              <span className="px-2.5 py-1 text-xs font-semibold bg-white/15 backdrop-blur-sm text-white rounded-lg border border-white/20">
                {course.level}
              </span>
              {course.subject && (
                <span className="px-2.5 py-1 text-xs font-semibold bg-primary-500/80 backdrop-blur-sm text-white rounded-lg border border-primary-400/30 truncate max-w-[140px]">
                  {course.subject}
                </span>
              )}
            </>
          )}
        </div>

        {canWatch ? (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-green-500 text-white rounded-lg shadow-sm">
            <CheckCircle2 size={11} /> {isAdmin ? 'ADMIN' : isPremium ? 'PREMIUM PASS' : isCourseBundleUnlocked ? 'UNLOCKED VIA BUNDLE' : isSubjectBundleUnlocked ? 'SUBJECT UNLOCKED' : isFreeCourse ? 'FREE ACCESS' : isCourseBundle ? 'COMBO UNLOCKED' : 'ENROLLED'}
          </div>
        ) : isPending ? (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-amber-500 text-white rounded-lg animate-pulse">
            <Clock size={11} /> PENDING APPROVAL
          </div>
        ) : isCourseBundle ? (
          <div className="absolute top-3 right-3 flex items-center gap-1">
            {bundleSavings && (
              <span className="px-2 py-1 text-[10px] font-black bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-lg shadow-sm">
                {bundleSavings.pct}% OFF
              </span>
            )}
            <span className="px-2.5 py-1 text-[10px] font-bold bg-[#0A0A0A] text-white rounded-lg border border-white/20 shadow-xs">
              {typeof course.price === 'number' ? `₹${course.price}` : 'FREE'}
            </span>
          </div>
        ) : isBundleOnly ? (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-primary-500 text-white rounded-lg">
            <Package size={11} /> SUBJECT BUNDLE
          </div>
        ) : isResourceBundleUnlocked ? (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-blue-500 text-white rounded-lg">
            <CheckCircle2 size={11} /> NOTES ONLY
          </div>
        ) : typeof course.price === 'number' ? (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-[#0A0A0A] text-white rounded-lg">
            ₹{course.price}
          </div>
        ) : null}

        {/* Play / Lock / Bundle icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40">
            {isCourseBundle ? (
              <Package size={18} className="text-white" />
            ) : canWatch ? (
              <Play size={18} className="text-white ml-0.5" />
            ) : (
              <Lock size={16} className="text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-brand-muted dark:text-brand-dark-muted bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
              {isCourseBundle ? 'Curated Combo Bundle' : (course.academicCourse || course.subcategory)}
            </span>
            {course.subjectId && (
              <Link
                to={`/courses/bundles/${course.subjectId}`}
                className="text-[11px] font-bold text-primary-500 hover:underline flex items-center gap-1"
                title="View Complete Subject Bundle"
              >
                <Package size={11} /> Subject Bundles
              </Link>
            )}
          </div>

          <h3 className="text-[15px] font-bold text-brand-text dark:text-brand-dark-text mt-2 mb-1 leading-snug line-clamp-2 group-hover:text-primary-500 transition-colors">
            {course.title}
          </h3>
          <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-3 line-clamp-2 leading-relaxed">
            {course.description}
          </p>
          <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-3">By {course.instructor}</p>

          {/* Included Courses Preview for Course Bundles */}
          {isCourseBundle && bundledCourses.length > 0 && (
            <div className="mb-3 p-2.5 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/30">
              <div className="flex items-center justify-between text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1">
                  <Package size={11} /> Included Courses ({bundledCourses.length})
                </span>
                {standaloneTotal > 0 && <span className="text-brand-muted line-through font-normal">Valued ₹{standaloneTotal}</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                {bundledCourses.slice(0, 3).map((bc, idx) => (
                  <span key={idx} className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-white/10 text-brand-text dark:text-brand-dark-text font-medium truncate max-w-[150px]">
                    {bc.title}
                  </span>
                ))}
                {bundledCourses.length > 3 && (
                  <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    +{bundledCourses.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* WhatsApp Group Badge if configured */}
          {course.whatsappGroupUrl && (
            <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40 w-fit">
              <MessageCircle size={11} className="text-[#25D366]" />
              <span>WhatsApp Group Included</span>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-brand-muted dark:text-brand-dark-muted mb-4">
            <span className="flex items-center gap-1"><Star size={11} className="text-amber-400 fill-amber-400" />{course.rating}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{course.duration}</span>
            <span className="flex items-center gap-1"><Users size={11} />{course.enrolled.toLocaleString()}</span>
          </div>
        </div>

        {/* Action & CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-brand-dark-border mt-auto">
          <div>
            {isCourseBundle ? (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-brand-text dark:text-brand-dark-text">
                    {typeof course.price === 'number' ? `₹${course.price}` : 'FREE BUNDLE'}
                  </span>
                  {standaloneTotal > 0 && typeof course.price === 'number' && (
                    <span className="text-xs line-through text-brand-muted">₹{standaloneTotal}</span>
                  )}
                </div>
                {bundleSavings && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                    Save ₹{bundleSavings.saved} ({bundleSavings.pct}% off)
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs text-brand-muted dark:text-brand-dark-muted font-medium">
                {isBundleOnly
                  ? 'Bundle Pricing'
                  : isFreeCourse
                    ? 'Free Access'
                    : `₹${course.price}`}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isCourseBundle && (
              <CourseRatingMenu
                courseId={course.id}
                userId={userId}
                isEnrolled={canWatch}
                onRated={(average, count) => onRated(course.id, average, count)}
              />
            )}

            {isCourseBundle ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onViewBundleDetails?.(course)}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-brand-text dark:text-brand-dark-text bg-gray-100 dark:bg-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                  title="View all included courses"
                >
                  <Package size={12} /> Courses
                </button>
                {canWatch ? (
                  <div className="flex items-center gap-1">
                    {course.whatsappGroupUrl && (
                      <a
                        href={course.whatsappGroupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-2 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border border-[#25D366]/30 transition-all shadow-xs"
                        title="Join WhatsApp Group"
                        aria-label="Join WhatsApp Group"
                      >
                        <MessageCircle size={13} />
                      </a>
                    )}
                    <button
                      onClick={() => onViewBundleDetails?.(course)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                    >
                      <CheckCircle2 size={12} /> Access
                    </button>
                  </div>
                ) : isPending ? (
                  <button
                    onClick={() => toast('Your payment proof with UPI UTR is currently being verified by the Admin. Access will unlock once approved.', { icon: '⏳' })}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 rounded-xl hover:bg-amber-200 transition-colors"
                  >
                    <Clock size={11} /> Pending
                  </button>
                ) : (
                  <button
                    onClick={() => onEnroll(course)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl transition-all shadow-xs"
                  >
                    <Sparkles size={12} /> {typeof course.price === 'number' ? `Enroll · ₹${course.price}` : 'Free'}
                  </button>
                )}
              </div>
            ) : canWatch ? (
              <div className="flex items-center gap-1.5">
                {course.whatsappGroupUrl && (
                  <a
                    href={course.whatsappGroupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="p-2 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border border-[#25D366]/30 transition-all shadow-xs"
                    title="Join Course WhatsApp Group"
                    aria-label="Join Course WhatsApp Group"
                  >
                    <MessageCircle size={14} />
                  </a>
                )}
                <button
                  onClick={() => onPlay(course)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-500 rounded-xl hover:bg-primary-600 transition-colors shadow-xs"
                >
                  <Play size={11} /> Watch Lectures
                </button>
              </div>
            ) : isPending ? (
              <button
                onClick={() => toast('Your payment proof with UPI UTR is currently being verified by the Admin. Access will unlock once approved.', { icon: '⏳' })}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 rounded-xl hover:bg-amber-200 transition-colors"
              >
                <Clock size={11} /> Pending Review
              </button>
            ) : isBundleOnly ? (
              <Link
                to={`/courses/bundles/${course.subjectId}`}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary-500 rounded-xl hover:bg-primary-600 transition-colors shadow-xs"
              >
                <Package size={12} /> View Subject & Bundles
              </Link>
            ) : (
              <button
                onClick={() => onEnroll(course)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary-500 rounded-xl hover:bg-primary-600 transition-colors shadow-xs"
              >
                Enroll · {typeof course.price === 'number' ? `₹${course.price}` : 'Free'}
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

interface BundleDetailModalProps {
  bundle: Course
  allCourses: Course[]
  isUnlocked: boolean
  isPending: boolean
  onClose: () => void
  onEnroll: (course: Course) => void
  onPlayCourse: (course: Course) => void
}

function BundleDetailModal({
  bundle,
  allCourses,
  isUnlocked,
  isPending,
  onClose,
  onEnroll,
  onPlayCourse,
}: BundleDetailModalProps) {
  const childCourses = useMemo(() => {
    const idSet = new Set((bundle.bundledCourseIds || []).map(id => String(id).replace(/^course_/, '')))
    return allCourses.filter(c => {
      const isBundle = c.isCourseBundle || (c.tags || []).includes('__is_course_bundle')
      const isUnderBundle = c.isBundleOnly || (c.tags || []).includes('__bundle_only')
      if (isBundle || isUnderBundle) return false
      return idSet.has(String(c.id).replace(/^course_/, ''))
    })
  }, [bundle.bundledCourseIds, allCourses])

  const standaloneTotal = useMemo(() => {
    return childCourses.reduce((sum, c) => sum + (typeof c.price === 'number' ? c.price : 0), 0)
  }, [childCourses])

  const savings = useMemo(() => {
    if (typeof bundle.price === 'number' && standaloneTotal > bundle.price) {
      const amount = standaloneTotal - bundle.price
      const rawPct = Math.round((amount / standaloneTotal) * 100)
      const percent = bundle.price > 0 ? Math.min(99, rawPct) : rawPct
      return { amount, percent }
    }
    return null
  }, [bundle.price, standaloneTotal])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-brand-dark-card rounded-3xl border border-gray-100 dark:border-brand-dark-border shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-brand-dark-border flex items-start justify-between gap-4 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                <Sparkles size={11} /> Combo Course Bundle
              </span>
              {isUnlocked && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <CheckCircle2 size={11} /> You Own This Bundle
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-brand-text dark:text-brand-dark-text">
              {bundle.title}
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted dark:text-brand-dark-muted mt-1 leading-relaxed">
              {bundle.description || 'Get all-in-one access to this curated combination of individual videos.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-brand-muted hover:text-brand-text dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pricing Banner */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-brand-dark-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">Bundle Price:</span>
            <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
              {typeof bundle.price === 'number' ? `₹${bundle.price}` : 'FREE'}
            </span>
            {standaloneTotal > 0 && typeof bundle.price === 'number' && (
              <span className="text-sm line-through text-brand-muted font-medium">
                ₹{standaloneTotal}
              </span>
            )}
          </div>
          {savings && (
            <span className="px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-xs">
              Save ₹{savings.amount} ({savings.percent}% OFF)
            </span>
          )}
        </div>

        {/* Included Courses List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted flex items-center gap-1.5">
              <Video size={14} className="text-violet-500" />
              Included Individual Videos ({childCourses.length})
            </h3>
            <span className="text-[11px] text-brand-muted">
              {isUnlocked ? 'Click any video to watch now' : 'All videos will unlock upon enrollment'}
            </span>
          </div>

          {childCourses.length === 0 ? (
            <div className="text-center py-10 text-brand-muted text-sm">
              No individual videos linked to this bundle yet.
            </div>
          ) : (
            childCourses.map((cc) => (
              <div
                key={cc.id}
                className="p-3.5 rounded-2xl border border-gray-100 dark:border-brand-dark-border bg-white dark:bg-brand-dark-card flex items-center justify-between gap-3 hover:border-violet-500/40 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-12 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center text-white relative">
                    {cc.thumbnail ? (
                      <img src={cc.thumbnail} alt={cc.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen size={18} className="text-white/40" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-brand-text dark:text-brand-dark-text truncate group-hover:text-violet-500 transition-colors">
                      {cc.title}
                    </h4>
                    <p className="text-[11px] text-brand-muted truncate">
                      {cc.instructor ? `By ${cc.instructor} • ` : ''}{cc.duration || 'Self-paced'} • {cc.level || 'All Levels'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {typeof cc.price === 'number' && (
                    <span className="text-xs font-semibold text-brand-muted hidden sm:inline">
                      ₹{cc.price}
                    </span>
                  )}
                  {(cc.whatsappGroupUrl || bundle.whatsappGroupUrl) && (
                    <a
                      href={cc.whatsappGroupUrl || bundle.whatsappGroupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Join WhatsApp Group for updates & announcements"
                      aria-label="Join WhatsApp Group"
                      className="w-8 h-8 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white dark:bg-[#25D366]/20 dark:text-emerald-400 dark:hover:bg-[#25D366] dark:hover:text-white flex items-center justify-center transition-all border border-[#25D366]/30 shadow-xs group/wa"
                    >
                      <MessageCircle size={15} className="transition-transform group-hover/wa:scale-110" />
                    </a>
                  )}
                  {isUnlocked ? (
                    <button
                      onClick={() => {
                        onClose()
                        onPlayCourse(cc)
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Play size={12} /> Watch
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                      Included
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-brand-dark-border bg-gray-50 dark:bg-white/5 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-brand-muted hover:text-brand-text dark:hover:text-white"
          >
            Close
          </button>
          {isUnlocked ? (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} /> All {childCourses.length} courses unlocked for your account
            </div>
          ) : isPending ? (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Clock size={16} /> Enrollment Pending Verification
            </div>
          ) : (
            <button
              onClick={() => {
                onClose()
                onEnroll(bundle)
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md"
            >
              <Sparkles size={14} />
              {typeof bundle.price === 'number' ? `Enroll in Combo Pack · ₹${bundle.price}` : 'Enroll in Free Combo Pack'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function Courses() {
  const [courseSection, setCourseSection] = useState<'semester-bundles' | 'bundles' | 'courses' | 'webinars'>('semester-bundles')
  const [liveWebinars, setLiveWebinars] = useState<LiveWebinar[]>([])
  const [webinarRecordings, setWebinarRecordings] = useState<WebinarRecording[]>([])
  const [webinarsLoading, setWebinarsLoading] = useState(false)
  const [openingReplayId, setOpeningReplayId] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [subjectBundles, setSubjectBundles] = useState<SubjectBundle[]>([])
  const [semesterBundles, setSemesterBundles] = useState<SemesterBundle[]>([])
  const [loading, setLoading] = useState(true)

  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const userId = user?.id ?? null

  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [unlockedSubjectIds, setUnlockedSubjectIds] = useState<Set<number>>(new Set())
  const [unlockedResourceSubjectIds, setUnlockedResourceSubjectIds] = useState<Set<number>>(new Set())
  const [unlockedSemesterIds, setUnlockedSemesterIds] = useState<Set<number>>(new Set())
  const [unlockedSemesterBundleIds, setUnlockedSemesterBundleIds] = useState<Set<string>>(new Set())
  const [activeSubjectBundle, setActiveSubjectBundle] = useState<SubjectBundle | null>(null)
  const [activeResourceBundle, setActiveResourceBundle] = useState<ResourceBundle | null>(null)
  const [enrollCourse, setEnrollCourse] = useState<Course | null>(null)
  const [enrollWebinar, setEnrollWebinar] = useState<LiveWebinar | null>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [playCourse, setPlayCourse] = useState<Course | null>(null)
  const [bundleDetailModalCourse, setBundleDetailModalCourse] = useState<Course | null>(null)
  const [courseTypeFilter, setCourseTypeFilter] = useState<'all' | 'single' | 'bundle'>('all')
  const [allAccessPrice, setAllAccessPrice] = useState(999)
  // Map of courseId -> active ProductDiscount (null means no active discount)
  const [courseDiscountsMap, setCourseDiscountsMap] = useState<Map<string, ProductDiscount>>(new Map())
  // Map of semesterBundleId -> active ProductDiscount
  const [semesterDiscountsMap, setSemesterDiscountsMap] = useState<Map<string, ProductDiscount>>(new Map())
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

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
      ; (async () => {
        try {
          const [coursesData, bundlesData, semBundlesData] = await Promise.all([
            fetchPublishedSiteCourses(),
            fetchPublishedSubjectBundles(),
            fetchPublishedSemesterBundles(),
          ])
          setCourses(coursesData)
          setSubjectBundles(bundlesData)
          setSemesterBundles(semBundlesData)

          // Load all active discounts in parallel queries
          try {
            const [discounts, semDiscounts] = await Promise.all([
              fetchAllDiscounts('course').catch(() => []),
              fetchAllDiscounts('semester_bundle').catch(() => []),
            ])
            const now = new Date()
            const map = new Map<string, ProductDiscount>()
            for (const d of discounts) {
              if (!d.isActive) continue
              if (d.startsAt && new Date(d.startsAt) > now) continue
              if (d.expiresAt && new Date(d.expiresAt) <= now) continue
              if (!map.has(d.productId)) map.set(d.productId, d)
            }
            setCourseDiscountsMap(map)

            const semMap = new Map<string, ProductDiscount>()
            for (const d of semDiscounts) {
              if (!d.isActive) continue
              if (d.startsAt && new Date(d.startsAt) > now) continue
              if (d.expiresAt && new Date(d.expiresAt) <= now) continue
              if (!semMap.has(d.productId)) semMap.set(d.productId, d)
            }
            setSemesterDiscountsMap(semMap)
          } catch {
            // Discount fetch failure is non-critical — don't block page
          }
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
      setUnlockedSubjectIds(new Set())
      setUnlockedResourceSubjectIds(new Set())
      setUnlockedSemesterIds(new Set())
      setUnlockedSemesterBundleIds(new Set())
      return
    }
    try {
      const enrollments = await getEnrollmentsForUser(userId)
      const approved = enrollments.filter(e => e.status === 'paid' || e.status === 'free').map(e => e.courseId)
      const pending = enrollments.filter(e => e.status === 'pending').map(e => e.courseId)

      // Authoritative batch query for subject, resource, and semester bundle entitlements
      const entitlements = await fetchUserEntitlements(userId)
      setUnlockedSubjectIds(entitlements.subjectBundleSubjectIds)
      setUnlockedResourceSubjectIds(entitlements.resourceBundleSubjectIds)
      setUnlockedSemesterIds(entitlements.semesterBundleSemesterIds || new Set())
      setUnlockedSemesterBundleIds(entitlements.semesterBundleIds || new Set())

      const allEnrolledSet = new Set(approved)
      if (entitlements.enrolledCourseIds) {
        entitlements.enrolledCourseIds.forEach(id => allEnrolledSet.add(id))
      }
      setEnrolledIds(allEnrolledSet)
      setPendingIds(new Set(pending))
    } catch (err) {
      console.error('Failed to load enrollments:', err)
    }
  }, [userId])

  useEffect(() => {
    loadUserEnrollments()
  }, [loadUserEnrollments])

  // Track which individual child courses are unlocked because the user owns a parent Course Bundle
  const ownedBundleChildCourseIds = useMemo(() => {
    const ids = new Set<string>()
    if (isAdmin || user?.isPremium) return ids
    for (const c of courses) {
      if (c.isCourseBundle && enrolledIds.has(c.id) && c.bundledCourseIds) {
        for (const childId of c.bundledCourseIds) {
          ids.add(childId)
          ids.add(childId.replace(/^course_/, ''))
        }
      }
    }
    return ids
  }, [courses, enrolledIds, isAdmin, user?.isPremium])

  const handlePlay = (course: Course) => {
    if (!isAuthenticated) return requireLogin()
    const isBundleOnly = Boolean(course.isBundleOnly)
    const isSubjectUnlocked = isBundleOnly && course.subjectId ? unlockedSubjectIds.has(course.subjectId) : false
    const isCourseBundleUnlocked = ownedBundleChildCourseIds.has(course.id) || ownedBundleChildCourseIds.has(course.id.replace(/^course_/, ''))
    const isFreeCourse = !isBundleOnly && (course.price === 'FREE' || course.price === 0)

    if (course.isCourseBundle) {
      setBundleDetailModalCourse(course)
      return
    }

    if (isAdmin || user?.isPremium || enrolledIds.has(course.id) || isFreeCourse || isSubjectUnlocked || isCourseBundleUnlocked) {
      setPlayCourse(course)
    } else if (isBundleOnly && course.subjectId) {
      navigate(`/courses/bundles/${course.subjectId}`)
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
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'webinars') setCourseSection('webinars')
    else if (tab === 'semester-bundles') setCourseSection('semester-bundles')
    else if (tab === 'bundles') setCourseSection('bundles')
    else if (tab === 'courses') setCourseSection('courses')
  }, [searchParams])
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

  useEffect(() => {
    if (!appliedSubjectId) {
      setActiveSubjectBundle(null)
      setActiveResourceBundle(null)
      return
    }
    let cancelled = false
    Promise.all([
      fetchSubjectBundle(appliedSubjectId),
      fetchResourceBundleBySubject(appliedSubjectId),
    ])
      .then(([subBundle, resBundle]) => {
        if (!cancelled) {
          setActiveSubjectBundle(subBundle)
          setActiveResourceBundle(resBundle)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch bundles for subject:', err)
        if (!cancelled) {
          setActiveSubjectBundle(null)
          setActiveResourceBundle(null)
        }
      })
    return () => { cancelled = true }
  }, [appliedSubjectId])

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
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all text-left ${disabled
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
              className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''
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
                      className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-white/10 ${selectedValue === opt.id
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

  // Set of course IDs that are bundled inside ANY published Course Bundle.
  // When an individual course is added to a Course Bundle, it must not show as a
  // standalone individual course in the catalog — it will only show inside that bundle!
  const bundledCourseIdSet = useMemo(() => {
    const ids = new Set<string>()
    for (const c of courses) {
      const isBundle = c.isCourseBundle || (c.tags || []).includes('__is_course_bundle')
      if (isBundle && c.status === 'Published' && c.bundledCourseIds?.length) {
        for (const id of c.bundledCourseIds) {
          const cleanId = String(id).replace(/^course_/, '')
          ids.add(cleanId)
          ids.add(String(id))
        }
      }
    }
    return ids
  }, [courses])

  // Only standalone courses and Course Bundles are displayed in 'All Courses' —
  // courses uploaded under a Subject Bundle belong to the subject curriculum,
  // and individual courses added into a Course Bundle belong to that bundle and only show inside it.
  const published = useMemo(() => {
    return courses.filter(c => {
      if (c.status !== 'Published') return false
      if (c.isBundleOnly) return false
      const isBundle = c.isCourseBundle || (c.tags || []).includes('__is_course_bundle')
      if (!isBundle) {
        const cleanId = String(c.id).replace(/^course_/, '')
        if (bundledCourseIdSet.has(cleanId) || bundledCourseIdSet.has(String(c.id))) {
          return false
        }
      }
      return true
    })
  }, [courses, bundledCourseIdSet])

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

  const bundleCount = useMemo(() => published.filter(c => c.isCourseBundle).length, [published])
  const singleCount = useMemo(() => published.filter(c => !c.isCourseBundle).length, [published])

  const filtered = useMemo(() => {
    return published.filter(c => {
      if (courseTypeFilter === 'single' && c.isCourseBundle) return false
      if (courseTypeFilter === 'bundle' && !c.isCourseBundle) return false
      if (!hierarchyActive) {
        if (activeSub) {
          const subMatches =
            c.subcategory?.trim().toLowerCase() === activeSub.trim().toLowerCase() ||
            (activeSub.trim().toLowerCase() === 'certificate' && c.subcategory?.trim().toLowerCase() === 'certificate courses') ||
            (activeSub.trim().toLowerCase() === 'certificate courses' && c.subcategory?.trim().toLowerCase() === 'certificate')
          if (!subMatches) return false
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
      if (search) {
        const q = search.toLowerCase()
        const titleMatch = c.title.toLowerCase().includes(q)
        const descMatch = (c.description || '').toLowerCase().includes(q)
        let childMatch = false
        if (c.isCourseBundle && c.bundledCourseIds?.length) {
          const idSet = new Set(c.bundledCourseIds.map(id => String(id).replace(/^course_/, '')))
          childMatch = courses.some(child => idSet.has(String(child.id).replace(/^course_/, '')) && child.title.toLowerCase().includes(q))
        }
        if (!titleMatch && !descMatch && !childMatch) return false
      }
      return true
    })
  }, [published, courses, courseTypeFilter, activeGroup, activeSub, activeLevel, activePrice, search, appliedCollegeId, appliedCourseId, appliedBranchId, appliedSemesterId, appliedSubjectId])

  const filteredBundles = useMemo(() => {
    return subjectBundles.filter(b => {
      if (appliedSubjectId && b.subjectId !== appliedSubjectId) return false
      if (search) {
        const q = search.toLowerCase()
        const name = (b.subjectName || '').toLowerCase()
        const code = (b.subjectCode || '').toLowerCase()
        const course = (b.academicCourseName || '').toLowerCase()
        const branch = (b.branchName || '').toLowerCase()
        const college = (b.collegeName || '').toLowerCase()
        if (!name.includes(q) && !code.includes(q) && !course.includes(q) && !branch.includes(q) && !college.includes(q)) return false
      }
      return true
    })
  }, [subjectBundles, appliedSubjectId, search])

  const filteredSemesterBundles = useMemo(() => {
    return semesterBundles.filter(b => {
      if (appliedSemesterId && b.semesterId !== appliedSemesterId) return false
      if (appliedBranchId && b.branchId && b.branchId !== appliedBranchId) return false
      if (appliedCourseId && b.academicCourseId && b.academicCourseId !== appliedCourseId) return false
      if (appliedCollegeId && b.collegeId && b.collegeId !== appliedCollegeId) return false
      if (search) {
        const q = search.toLowerCase()
        const title = (b.title || '').toLowerCase()
        const desc = (b.description || '').toLowerCase()
        const course = (b.academicCourseName || '').toLowerCase()
        const branch = (b.branchName || '').toLowerCase()
        const college = (b.collegeName || '').toLowerCase()
        const subs = (b.subjects || []).map(s => `${s.subjectName || ''} ${s.subjectCode || ''}`).join(' ').toLowerCase()
        if (!title.includes(q) && !desc.includes(q) && !course.includes(q) && !branch.includes(q) && !college.includes(q) && !subs.includes(q)) return false
      }
      return true
    })
  }, [semesterBundles, appliedSemesterId, appliedBranchId, appliedCourseId, appliedCollegeId, search])

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

      {/* Course / Bundle / Webinar switcher */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="inline-flex rounded-2xl border border-gray-100 dark:border-brand-dark-border bg-white dark:bg-brand-dark-card p-1 shadow-sm flex-wrap gap-1">
          <button
            onClick={() => setCourseSection('semester-bundles')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${courseSection === 'semester-bundles'
                ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black shadow-md'
                : 'text-brand-muted dark:text-brand-dark-muted hover:text-brand-text dark:hover:text-brand-dark-text'
              }`}
          >
            <Sparkles size={15} /> Semester Bundles
            {semesterBundles.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${courseSection === 'semester-bundles' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/10'}`}>
                {semesterBundles.length}
              </span>
            )}
          </button>
          {/* <button
            onClick={() => setCourseSection('bundles')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              courseSection === 'bundles'
                ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md'
                : 'text-brand-muted dark:text-brand-dark-muted hover:text-brand-text dark:hover:text-brand-dark-text'
            }`}
          >
            <Package size={15} /> Subject Bundles
            {subjectBundles.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${courseSection === 'bundles' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/10'}`}>
                {subjectBundles.length}
              </span>
            )}
          </button> */}
          <button
            onClick={() => setCourseSection('courses')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${courseSection === 'courses'
                ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black shadow-md'
                : 'text-brand-muted dark:text-brand-dark-muted hover:text-brand-text dark:hover:text-brand-dark-text'
              }`}
          >
            <BookOpen size={15} /> All Courses
            {published.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${courseSection === 'courses' ? 'bg-white/20 text-white dark:bg-black/20' : 'bg-gray-100 dark:bg-white/10'}`}>
                {published.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setCourseSection('webinars')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${courseSection === 'webinars'
                ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-md'
                : 'text-brand-muted dark:text-brand-dark-muted hover:text-brand-text dark:hover:text-brand-dark-text'
              }`}
          >
            <Radio size={15} /> Webinars
          </button>
        </div>
      </div>

      {courseSection === 'webinars' ? (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="rounded-[28px] overflow-hidden border border-violet-100 dark:border-white/10 bg-gradient-to-br from-violet-50 via-white to-cyan-50 dark:from-violet-950/20 dark:via-brand-dark-card dark:to-cyan-950/20 p-6 sm:p-8 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-300 mb-3"><Radio size={12} /> Live & Replay Hub</div>
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

          {webinarsLoading ? (
            <div className="py-16 text-center text-sm text-brand-muted">
              <Loader2 className="animate-spin mx-auto mb-3" />
              Loading webinars...
            </div>
          ) : (() => {
            const hasAnySavedWebinars = liveWebinars.length > 0 || webinarRecordings.length > 0

            if (!hasAnySavedWebinars) {
              return (
                <div className="rounded-3xl border border-dashed border-violet-200 dark:border-white/10 p-12 text-center my-6 bg-violet-50/20 dark:bg-brand-dark-card">
                  <MonitorPlay className="mx-auto text-violet-400 mb-3" size={36} />
                  <h3 className="font-black text-xl text-brand-text dark:text-white">No Live Webinars Scheduled Yet</h3>
                  <p className="text-sm text-brand-muted mt-2 max-w-md mx-auto">
                    No webinar sessions or replays have been scheduled yet. Once a webinar is scheduled in the Admin Panel, it will appear here.
                  </p>
                </div>
              )
            }

            const featuredWebinar = liveWebinars.find(w => w.isFeatured) || liveWebinars.find(w => w.speakerName) || liveWebinars[0]
            const featuredTiming = featuredWebinar ? getWebinarTimingState(featuredWebinar, currentTime) : null
            const otherWebinars = liveWebinars.filter(w => !featuredWebinar || w.id !== featuredWebinar.id)

            const featuredIsApproved = Boolean(featuredWebinar && (isAdmin || (userId ? enrolledIds.has(featuredWebinar.id) : false)))
            const featuredIsPending = Boolean(featuredWebinar && !isAdmin && (userId ? pendingIds.has(featuredWebinar.id) : false))
            const featuredIsFree = Boolean(featuredWebinar && (featuredWebinar.access === 'free' || !featuredWebinar.price || featuredWebinar.price === 0))
            const featuredIsEnrolledPass = Boolean(featuredWebinar && featuredWebinar.access === 'enrolled_free' && (enrolledIds.size > 0 || user?.isPremium))
            const featuredIsEffectivelyFree = featuredIsFree || featuredIsEnrolledPass

            return (
              <>
                {/* Featured Webinar Banner (from live_webinars database row) */}
                {featuredWebinar && featuredTiming && (
                  <div className="rounded-[28px] border border-violet-100 dark:border-white/10 bg-white dark:bg-brand-dark-card overflow-hidden shadow-sm mb-10">
                    <div className="flex flex-col md:flex-row">
                      <div className="relative min-h-72 md:min-h-0 md:w-72 lg:w-80 shrink-0 overflow-hidden bg-gray-100 dark:bg-black/20">
                        {featuredWebinar.speakerPhotoUrl ? (
                          <img
                            src={featuredWebinar.speakerPhotoUrl}
                            alt={featuredWebinar.speakerName || featuredWebinar.title}
                            className="absolute inset-0 h-full w-full object-cover object-top"
                            onError={(event) => { event.currentTarget.style.display = 'none' }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600 text-white text-center">
                            <Sparkles size={42} className="text-white/80 mb-3" />
                            <p className="font-black text-lg leading-snug">{featuredWebinar.speakerName || featuredWebinar.title}</p>
                            <span className="text-xs text-white/80 mt-1 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
                              {featuredWebinar.speakerBadge || 'Live Webinar'}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center text-center text-xs font-bold uppercase tracking-widest text-brand-muted dark:text-brand-dark-muted -z-10" aria-hidden="true">
                          .
                        </div>
                      </div>
                      <div className="p-6 sm:p-8 flex-1">
                        {/* Status Badges Header */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider border transition-all ${
                            featuredTiming.isWebinarLive
                              ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-500/30'
                              : featuredTiming.isWebinarUpcoming
                              ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800'
                              : 'bg-gray-100 dark:bg-white/10 text-gray-500 border-gray-200 dark:border-white/10'
                          }`}>
                            {featuredTiming.isWebinarLive ? (
                              <>
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                                </span>
                                LIVE NOW · {featuredWebinar.provider}
                              </>
                            ) : featuredTiming.isWebinarUpcoming ? (
                              <>
                                <Clock size={13} className="text-violet-500 animate-pulse" />
                                Starts in: {featuredTiming.remainingTimeWebinarStr} · {featuredWebinar.provider}
                              </>
                            ) : (
                              <>Session Ended · {featuredWebinar.provider}</>
                            )}
                          </div>

                          {featuredIsApproved && (
                            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 size={13} /> Registered & Approved
                            </span>
                          )}

                          {featuredIsPending && (
                            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                              <Clock size={13} /> Payment Under Review
                            </span>
                          )}

                          <span className="ml-auto text-xs font-bold text-brand-muted">
                            {featuredIsFree ? 'Free Access' : featuredIsEnrolledPass ? `Free (Enrolled Pass) · ₹${featuredWebinar.price}` : `₹${featuredWebinar.price}`}
                          </span>
                        </div>

                        <h3 className="text-2xl sm:text-3xl font-black text-brand-text dark:text-white mb-2">
                          {featuredWebinar.title}
                        </h3>
                        {featuredWebinar.speakerName && (
                          <p className="text-sm font-bold text-violet-600 dark:text-violet-400 mb-4">
                            Session Speaker: {featuredWebinar.speakerName}
                          </p>
                        )}

                        <div className="text-sm leading-relaxed text-brand-muted dark:text-brand-dark-muted mb-6 space-y-3">
                          {featuredWebinar.speakerBio && featuredWebinar.speakerBio.length > 0 ? (
                            featuredWebinar.speakerBio.map((p, idx) => (
                              <p key={idx}>{p}</p>
                            ))
                          ) : (
                            <p>{featuredWebinar.description || 'Join our upcoming live webinar session to learn key industry topics and career roadmaps.'}</p>
                          )}
                        </div>

                        {featuredWebinar.tags && featuredWebinar.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-8">
                            {featuredWebinar.tags.map(tag => (
                              <span key={tag} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-brand-text dark:text-brand-dark-text">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-50 dark:bg-black/20 p-6 sm:p-8 md:w-72 lg:w-80 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 dark:border-white/10">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-5">
                          Session Highlights
                        </h4>
                        <ul className="space-y-5">
                          {(featuredWebinar.highlights && featuredWebinar.highlights.length > 0 ? featuredWebinar.highlights : [
                            { title: 'Interactive Live Q&A', subtitle: 'Direct mentor interaction' },
                            { title: 'Industry Strategies', subtitle: 'Practical placement roadmaps' },
                            { title: 'Certificate of Attendance', subtitle: 'Issued for active attendees' },
                          ]).map((h, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <div className="mt-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 p-2 text-violet-600 dark:text-violet-400">
                                {idx === 0 ? <Trophy size={16} /> : idx === 1 ? <GraduationCap size={16} /> : <BookOpen size={16} />}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-brand-text dark:text-white">{h.title}</div>
                                <div className="text-xs text-brand-muted dark:text-brand-dark-muted mt-0.5">{h.subtitle}</div>
                              </div>
                            </li>
                          ))}
                        </ul>

                        {/* Registration & Join Action Gate */}
                        <div className="mt-6">
                          {featuredTiming.isRegUpcoming ? (
                            <button
                              type="button"
                              disabled
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-white/10 px-5 py-3 text-sm font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/10 shadow-none select-none"
                              title="Registration will open soon"
                            >
                              <Clock size={16} /> Registration Opens Soon
                            </button>
                          ) : featuredIsApproved ? (
                            /* Student is Approved (or Admin) -> Access Granted! */
                            featuredTiming.isWebinarEnded ? (
                              <button
                                type="button"
                                disabled
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-white/10 px-5 py-3 text-sm font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/10 select-none"
                              >
                                <Clock size={16} /> Webinar Ended
                              </button>
                            ) : (
                              <a
                                href={featuredWebinar.joinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl ${
                                  featuredTiming.isWebinarLive
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/20'
                                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-violet-500/20'
                                }`}
                              >
                                {featuredTiming.isWebinarLive ? (
                                  <>
                                    <Video size={16} /> Join Live Webinar <ExternalLink size={14} />
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={16} /> Registered ✓ · Open Join Link <ExternalLink size={14} />
                                  </>
                                )}
                              </a>
                            )
                          ) : featuredIsPending ? (
                            /* Student submitted payment proof -> Under review */
                            <button
                              type="button"
                              disabled
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-5 py-3 text-sm font-bold cursor-wait select-none"
                              title="Your payment is pending admin approval"
                            >
                              <Clock size={16} className="animate-spin text-amber-500" /> Payment Under Admin Review
                            </button>
                          ) : featuredTiming.isRegClosed ? (
                            /* Registration closed and user not registered */
                            <button
                              type="button"
                              disabled
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-white/10 px-5 py-3 text-sm font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/10 shadow-none select-none"
                              title="Registration has closed"
                            >
                              <Clock size={16} /> {featuredTiming.isWebinarEnded ? 'Webinar Ended' : 'Registration Closed'}
                            </button>
                          ) : (
                            /* Registration is open -> Compulsory Registration */
                            <button
                              type="button"
                              onClick={() => {
                                if (!isAuthenticated) {
                                  showAuthRequiredToast({
                                    title: 'Sign In Required',
                                    message: 'Please sign in with your Skills021 account to register for this webinar.',
                                  })
                                  navigate('/login', { state: { from: { pathname: '/courses', search: '?tab=webinars' } } })
                                  return
                                }
                                setEnrollWebinar(featuredWebinar)
                              }}
                              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl ${
                                featuredIsEffectivelyFree
                                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-violet-500/20'
                                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
                              }`}
                            >
                              <CalendarDays size={16} />
                              {featuredIsEffectivelyFree
                                ? (featuredIsEnrolledPass ? 'Register (Free with Enrolled Course)' : 'Register for Webinar (Free)')
                                : `Register & Pay (₹${featuredWebinar.price})`}
                            </button>
                          )}

                          {/* Helper Subtext */}
                          <p className={`text-[11px] font-semibold text-center mt-2 flex items-center justify-center gap-1 ${
                            featuredIsApproved
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : featuredIsPending
                              ? 'text-amber-600 dark:text-amber-400'
                              : featuredTiming.isRegUpcoming
                              ? 'text-brand-muted'
                              : featuredTiming.isRegOpen
                              ? 'text-violet-600 dark:text-violet-400'
                              : 'text-red-500'
                          }`}>
                            <Clock size={12} />
                            {featuredIsApproved
                              ? (featuredTiming.isWebinarLive
                                  ? 'You are registered! Session is live now · Click above to enter'
                                  : 'You are registered! Meeting link will remain unlocked')
                              : featuredIsPending
                              ? 'Payment proof submitted. Admin will approve your access shortly.'
                              : featuredTiming.isRegUpcoming
                              ? `Registration opens ${new Date(featuredTiming.regStartMs).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                                })}`
                              : featuredTiming.isRegOpen
                              ? `Registration open · Compulsory registration before accessing join link (Closes ${new Date(featuredTiming.regEndMs).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                                })})`
                              : featuredTiming.isWebinarEnded
                              ? `Session ended on ${new Date(featuredTiming.webinarEndMs).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                                })}`
                              : `Registration closed on ${new Date(featuredTiming.regEndMs).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                                })}`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Scheduled Webinars from live_webinars */}
                {otherWebinars.length > 0 && (
                  <div className="mb-10 space-y-4">
                    <h3 className="text-xl font-black text-brand-text dark:text-white">Other Scheduled Sessions</h3>
                    <div className="grid md:grid-cols-2 gap-5">
                      {otherWebinars.map(w => {
                        const timing = getWebinarTimingState(w, currentTime)
                        const isApproved = Boolean(isAdmin || (userId ? enrolledIds.has(w.id) : false))
                        const isPending = Boolean(!isAdmin && (userId ? pendingIds.has(w.id) : false))
                        const isFreeWebinar = w.access === 'free' || !w.price || w.price === 0
                        const isEnrolledPass = Boolean(w.access === 'enrolled_free' && (enrolledIds.size > 0 || user?.isPremium))
                        const isEffectivelyFree = isFreeWebinar || isEnrolledPass

                        return (
                          <div key={w.id} className="rounded-3xl border border-violet-100 dark:border-white/10 bg-white dark:bg-brand-dark-card p-6 shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                                  timing.isWebinarLive
                                    ? 'bg-red-500 text-white'
                                    : timing.isWebinarUpcoming
                                    ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300'
                                    : 'bg-gray-100 dark:bg-white/10 text-gray-500'
                                }`}>
                                  {timing.isWebinarLive
                                    ? 'Live Now'
                                    : timing.isWebinarUpcoming
                                    ? `Starts in ${timing.remainingTimeWebinarStr}`
                                    : 'Session Ended'}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {isApproved && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      ✓ Registered
                                    </span>
                                  )}
                                  {isPending && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                      ⏳ Under Review
                                    </span>
                                  )}
                                  <span className="text-xs font-semibold text-brand-muted">
                                    {isFreeWebinar ? 'Free' : isEnrolledPass ? `Free (Pass) · ₹${w.price}` : `₹${w.price}`}
                                  </span>
                                </div>
                              </div>

                              <h4 className="text-lg font-black text-brand-text dark:text-white mb-1">{w.title}</h4>
                              {w.speakerName && (
                                <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-2">Speaker: {w.speakerName}</p>
                              )}
                              <p className="text-xs text-brand-muted dark:text-brand-dark-muted line-clamp-3 mb-4">{w.description}</p>
                              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-muted">
                                <Clock size={13} className="text-violet-500" />
                                {new Date(w.startsAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </div>
                            </div>

                            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/10">
                              {timing.isRegUpcoming ? (
                                <button
                                  type="button"
                                  disabled
                                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-white/10 px-4 py-2.5 text-xs font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/10 select-none"
                                >
                                  <Clock size={14} /> Registration Opens Soon
                                </button>
                              ) : isApproved ? (
                                timing.isWebinarEnded ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-white/10 px-4 py-2.5 text-xs font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/10 select-none"
                                  >
                                    <Clock size={14} /> Webinar Ended
                                  </button>
                                ) : (
                                  <a
                                    href={w.joinUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-colors ${
                                      timing.isWebinarLive
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-500/20'
                                    }`}
                                  >
                                    {timing.isWebinarLive ? (
                                      <>
                                        <Video size={14} /> Join Live Now <ExternalLink size={12} />
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 size={14} /> Registered ✓ · Join Link <ExternalLink size={12} />
                                      </>
                                    )}
                                  </a>
                                )
                              ) : isPending ? (
                                <button
                                  type="button"
                                  disabled
                                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-4 py-2.5 text-xs font-bold cursor-wait select-none"
                                  title="Your payment proof is under admin review"
                                >
                                  <Clock size={14} className="animate-spin text-amber-500" /> Payment Under Admin Review
                                </button>
                              ) : timing.isRegClosed ? (
                                <button
                                  type="button"
                                  disabled
                                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-white/10 px-4 py-2.5 text-xs font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/10 select-none"
                                >
                                  <Clock size={14} /> {timing.isWebinarEnded ? 'Webinar Ended' : 'Registration Closed'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isAuthenticated) {
                                      showAuthRequiredToast({
                                        title: 'Sign In Required',
                                        message: 'Please sign in with your Skills021 account to register for this webinar.',
                                      })
                                      navigate('/login', { state: { from: { pathname: '/courses', search: '?tab=webinars' } } })
                                      return
                                    }
                                    setEnrollWebinar(w)
                                  }}
                                  className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-colors ${
                                    isEffectivelyFree
                                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-500/20'
                                      : 'bg-emerald-600 hover:bg-emerald-700'
                                  }`}
                                >
                                  <CalendarDays size={14} />
                                  {isEffectivelyFree
                                    ? (isEnrolledPass ? 'Register (Free with Course)' : 'Register for Webinar (Free)')
                                    : `Register & Pay (₹${w.price})`}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Saved Replays Library */}
                {webinarRecordings.length > 0 && (
                  <div>
                    <div className="flex items-end justify-between mb-5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-violet-500">Webinar Library</p>
                        <h3 className="text-2xl font-black text-brand-text dark:text-white">Past sessions</h3>
                      </div>
                      <span className="text-xs text-brand-muted">{webinarRecordings.length} replay{webinarRecordings.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {webinarRecordings.map(w => (
                        <article key={w.id} className="group overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-brand-dark-card shadow-sm hover:shadow-xl transition-shadow">
                          <div className="h-40 bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 relative flex items-center justify-center">
                            {w.thumbnailUrl ? <img src={w.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <Play size={38} className="text-white/90" />}
                            <span className="absolute left-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">REPLAY</span>
                          </div>
                          <div className="p-5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">{new Date(w.sessionDate).toLocaleDateString()}</p>
                            <span className="mt-1 inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300">{webinarAccessLabel(w)}</span>
                            <h4 className="mt-1 font-black text-brand-text dark:text-white line-clamp-2">{w.title}</h4>
                            <p className="mt-2 text-xs text-brand-muted dark:text-brand-dark-muted line-clamp-2">{w.description}</p>
                            {w.videoUrl && (
                              <button onClick={() => handleOpenReplay(w)} disabled={openingReplayId === w.id} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-violet-600 dark:text-violet-300 disabled:opacity-60">
                                {canAccessWebinar(w) ? (openingReplayId === w.id ? <><Loader2 size={13} className="animate-spin" /> Opening...</> : <>Watch replay <ExternalLink size={13} /></>) : <><Lock size={13} /> {webinarAccessLabel(w)}</>}
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </section>
      ) : courseSection === 'semester-bundles' ? (
        <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
          {/* Sidebar — desktop */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-32">
              <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-4 mb-4">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-brand-dark-border pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text dark:text-brand-dark-text">Academic Filter</h3>
                  {(hSelectedCollegeId || hSelectedCourseId || hSelectedBranchId || hSelectedSemesterId) && (
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

                <button
                  onClick={handleHApplyFilter}
                  disabled={!(hSelectedCollegeId || hSelectedCourseId || hSelectedBranchId || hSelectedSemesterId)}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Search size={14} /> Search
                </button>
              </div>

              {/* Semester Bundle Information Card */}
              <div className="bg-gray-50 dark:bg-white/5 rounded-2xl border border-brand-border p-4 text-xs leading-relaxed text-brand-muted dark:text-brand-dark-muted space-y-2.5">
                <div className="font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-1.5">
                  <Sparkles size={14} className="text-violet-500" /> All-in-One Semester Pack
                </div>
                <p>
                  Get full semester syllabus coverage across <strong>all subjects</strong> with complete <strong>video lectures</strong>, <strong>unit notes</strong>, and <strong>revision PDFs</strong> in one combined package.
                </p>
                <div className="pt-2 border-t border-brand-border space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-brand-text dark:text-white">Semesters 1, 3 & 5:</span>
                    <span className="font-black text-violet-600 dark:text-violet-400">₹4.44 / day</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Complete 4-Year Pass:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">₹3.48 / day</span>
                  </div>
                </div>
                <p className="text-[10px] text-brand-muted dark:text-brand-dark-muted">
                  Click any bundle card to view its full real price, syllabus units & instant enrollment.
                </p>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main id="semester-bundles-list" className="flex-1 min-w-0 scroll-mt-24">
            <div className="flex items-center justify-between mb-6 gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text truncate">
                  {appliedHierarchyLabel || 'All Semester Bundles'}
                </h2>
                <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
                  {filteredSemesterBundles.length} semester bundle{filteredSemesterBundles.length !== 1 ? 's' : ''} available
                </p>
              </div>

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
                <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Loading semester bundles...</p>
              </div>
            ) : filteredSemesterBundles.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10 p-8">
                <Sparkles size={48} className="mx-auto text-gray-300 dark:text-brand-dark-muted mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-2">No semester bundles found</h3>
                <p className="text-brand-muted dark:text-brand-dark-muted text-sm max-w-md mx-auto mb-4">
                  {hierarchyActive
                    ? 'No semester bundles matched your academic filter. Try selecting a different college, course, branch, or semester, or reset the filter.'
                    : 'No published semester bundles were found. You can explore individual subject bundles instead.'}
                </p>
                {hierarchyActive ? (
                  <button
                    onClick={handleHResetHierarchy}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Reset Academic Filter
                  </button>
                ) : (
                  <button
                    onClick={() => setCourseSection('bundles')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                  >
                    <Package size={15} /> Browse Subject Bundles
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredSemesterBundles.map(bundle => (
                  <SemesterBundleCard
                    key={bundle.id}
                    bundle={bundle}
                    isUnlocked={unlockedSemesterIds.has(bundle.semesterId) || unlockedSemesterBundleIds.has(bundle.id)}
                    discount={semesterDiscountsMap.get(bundle.id) || semesterDiscountsMap.get(String(bundle.semesterId))}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      ) : courseSection === 'bundles' ? (
        <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
          {/* Sidebar — desktop */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-32">
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

              {/* Subject Bundle Information Card */}
              <div className="bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-950/20 dark:to-indigo-950/20 rounded-2xl border border-primary-100 dark:border-primary-900/30 p-4 text-xs leading-relaxed text-brand-muted dark:text-brand-dark-muted space-y-2">
                <div className="font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-1.5 text-primary-600 dark:text-primary-400">
                  <Sparkles size={14} /> Complete Subject Bundles
                </div>
                <p>
                  Get full semester syllabus coverage with <strong>all unit video lectures</strong>, <strong>chapter notes</strong>, and <strong>revision PDFs</strong> in one package.
                </p>
                <p>
                  Choose between <strong>6-Month</strong> and <strong>Lifetime Access</strong> plans.
                </p>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main id="subject-bundles-list" className="flex-1 min-w-0 scroll-mt-24">
            <div className="flex items-center justify-between mb-6 gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text truncate">
                  {appliedHierarchyLabel || 'All Subject Bundles'}
                </h2>
                <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
                  {filteredBundles.length} subject bundle{filteredBundles.length !== 1 ? 's' : ''} available
                </p>
              </div>

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
                <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Loading subject bundles...</p>
              </div>
            ) : filteredBundles.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10 p-8">
                <Package size={48} className="mx-auto text-gray-300 dark:text-brand-dark-muted mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-2">No subject bundles found</h3>
                <p className="text-brand-muted dark:text-brand-dark-muted text-sm max-w-md mx-auto mb-4">
                  {hierarchyActive
                    ? 'No subject bundles matched your academic filter. Try selecting a different college, course, branch, or semester, or reset the filter.'
                    : 'No published subject bundles were found. You can browse all individual courses instead.'}
                </p>
                {hierarchyActive ? (
                  <button
                    onClick={handleHResetHierarchy}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Reset Academic Filter
                  </button>
                ) : (
                  <button
                    onClick={() => setCourseSection('courses')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                  >
                    <BookOpen size={15} /> Browse All Courses
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredBundles.map(bundle => (
                  <SubjectBundleCard
                    key={bundle.id}
                    bundle={bundle}
                    isUnlocked={unlockedSubjectIds.has(bundle.subjectId)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      ) : (
        <>
          <div className="sticky top-16 z-30 bg-white dark:bg-brand-dark-bg border-b border-gray-100 dark:border-brand-dark-border shadow-sm">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
                {groupStats.map(g => (
                  <button
                    key={g.label}
                    onClick={() => { handleHResetHierarchy(); setActiveGroup(g.label); setActiveSub(null) }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeGroup === g.label
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
                      const cnt = published.filter(c =>
                        c.subcategory === sub ||
                        (sub === 'Certificate' && c.subcategory === 'Certificate Courses') ||
                        (sub === 'Certificate Courses' && c.subcategory === 'Certificate')
                      ).length
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
              {appliedSubjectId && (activeSubjectBundle || activeResourceBundle) && (
                <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-700 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {activeSubjectBundle && activeSubjectBundle.isActive && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm border border-white/20 text-white">
                          <Package size={13} /> Complete Subject Bundle
                        </span>
                      )}
                      {activeResourceBundle && activeResourceBundle.isActive && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 backdrop-blur-sm border border-white/10 text-white/90">
                          <FileText size={13} /> Resource Bundle (Notes Only)
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black">
                      {appliedHierarchyLabel || 'Unlock this Subject'}
                    </h3>
                    <p className="text-sm text-white/80 max-w-xl">
                      Choose between the <strong>Complete Subject Bundle</strong> (All lectures + notes) or the <strong>Resource Bundle</strong> (Notes & PDFs only).
                    </p>
                  </div>

              <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
                {unlockedSubjectIds.has(appliedSubjectId) ? (
                  <Link
                    to={`/courses/bundles/${appliedSubjectId}`}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-green-500 text-white hover:bg-green-600 shadow-md flex items-center gap-2 transition-all"
                  >
                    <CheckCircle2 size={16} /> Subject Unlocked
                  </Link>
                ) : (
                  <Link
                    to={`/courses/bundles/${appliedSubjectId}`}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white text-primary-600 hover:bg-gray-100 shadow-md flex items-center gap-2 transition-all"
                  >
                    <Package size={16} /> View Subject & Bundles
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text truncate">{appliedHierarchyLabel || activeSub || activeGroup}</h2>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">{filtered.length} course{filtered.length !== 1 ? 's' : ''} found</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter pills for All / Single / Combo Bundles */}
              <div className="inline-flex rounded-xl bg-gray-100 dark:bg-white/5 p-1 border border-gray-200/60 dark:border-white/10 text-xs font-semibold">
                <button
                  onClick={() => setCourseTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${courseTypeFilter === 'all' ? 'bg-white dark:bg-brand-dark-card text-brand-text dark:text-brand-dark-text font-bold shadow-xs' : 'text-brand-muted hover:text-brand-text'}`}
                >
                  All ({published.length})
                </button>
                <button
                  onClick={() => setCourseTypeFilter('single')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${courseTypeFilter === 'single' ? 'bg-white dark:bg-brand-dark-card text-brand-text dark:text-brand-dark-text font-bold shadow-xs' : 'text-brand-muted hover:text-brand-text'}`}
                >
                  Single ({singleCount})
                </button>
                <button
                  onClick={() => setCourseTypeFilter('bundle')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${courseTypeFilter === 'bundle' ? 'bg-violet-600 text-white font-bold shadow-xs' : 'text-violet-600 dark:text-violet-400 hover:text-violet-700'}`}
                >
                  <Sparkles size={11} /> Combo Bundles ({bundleCount})
                </button>
              </div>

              {/* Mobile filter trigger */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="md:hidden flex-shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <SlidersHorizontal size={13} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-500 text-white">{activeFilterCount}</span>
                )}
              </button>
            </div>
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
                    isSubjectBundleUnlocked={Boolean(course.isBundleOnly && course.subjectId && unlockedSubjectIds.has(course.subjectId))}
                    isResourceBundleUnlocked={course.subjectId ? unlockedResourceSubjectIds.has(course.subjectId) : false}
                    isCourseBundleUnlocked={ownedBundleChildCourseIds.has(course.id) || ownedBundleChildCourseIds.has(course.id.replace(/^course_/, ''))}
                    allCourses={courses}
                    onPlay={handlePlay}
                    onEnroll={handleEnroll}
                    onRated={handleCourseRated}
                    onViewBundleDetails={(bundle) => setBundleDetailModalCourse(bundle)}
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
                        const cnt = published.filter(c =>
                          c.subcategory === sub ||
                          (sub === 'Certificate' && c.subcategory === 'Certificate Courses') ||
                          (sub === 'Certificate Courses' && c.subcategory === 'Certificate')
                        ).length
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

      {enrollWebinar && (
        <EnrollModal
          webinar={enrollWebinar}
          isEnrolledStudentPass={enrolledIds.size > 0 || user?.isPremium}
          userId={userId ?? `guest-${Date.now()}`}
          defaultEmail={user?.email}
          defaultName={user?.name}
          onClose={() => setEnrollWebinar(null)}
          onEnrolled={() => {
            loadUserEnrollments()
            setEnrollWebinar(null)
          }}
        />
      )}

      {bundleDetailModalCourse && (
        <BundleDetailModal
          bundle={bundleDetailModalCourse}
          allCourses={courses}
          isUnlocked={
            isAdmin ||
            Boolean(user?.isPremium) ||
            enrolledIds.has(bundleDetailModalCourse.id) ||
            (!bundleDetailModalCourse.isBundleOnly && (bundleDetailModalCourse.price === 'FREE' || bundleDetailModalCourse.price === 0))
          }
          isPending={pendingIds.has(bundleDetailModalCourse.id)}
          onClose={() => setBundleDetailModalCourse(null)}
          onEnroll={(bundle) => {
            setBundleDetailModalCourse(null)
            handleEnroll(bundle)
          }}
          onPlayCourse={(childCourse) => {
            setBundleDetailModalCourse(null)
            handlePlay(childCourse)
          }}
        />
      )}

      {playCourse && (
        <VideoPlayerModal
          course={playCourse}
          userId={userId ?? ''}
          userName={user?.name ?? 'Guest'}
          isAdmin={isAdmin}
          canWatch={
            isAdmin ||
            Boolean(user?.isPremium) ||
            enrolledIds.has(playCourse.id) ||
            ownedBundleChildCourseIds.has(playCourse.id) ||
            ownedBundleChildCourseIds.has(playCourse.id.replace(/^course_/, '')) ||
            (!playCourse.isBundleOnly && (playCourse.price === 'FREE' || playCourse.price === 0)) ||
            Boolean(playCourse.isBundleOnly && playCourse.subjectId && unlockedSubjectIds.has(playCourse.subjectId))
          }
          onClose={() => setPlayCourse(null)}
        />
      )}
    </div>
  )
}
