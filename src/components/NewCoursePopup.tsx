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
  PlayCircle,
  FileText,
  Package,
  Layers,
  BadgePercent,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchPublishedSiteCourses } from '../lib/courseService'
import { fetchPublishedResources, type Resource } from '../lib/resourceService'
import { fetchPublishedSubjectBundles } from '../lib/subjectBundleService'
import { fetchPublishedSemesterBundles } from '../lib/semesterBundleService'
import { fetchPublishedResourceBundles } from '../lib/resourceBundleService'
import { useContentStore, type Course } from '../store/contentStore'

const STORAGE_DISMISS_KEY = 'skills021_latest_updates_popup_dismissed_v3'
const MAX_ITEMS = 5
const AUTO_ROTATE_MS = 3500 // Automatically rotates every 3.5 seconds

export type FeaturedItemKind =
  | 'subject_bundle'
  | 'semester_bundle'
  | 'course_bundle'
  | 'resource_bundle'
  | 'course'
  | 'resource'

export interface FeaturedItem {
  id: string
  kind: FeaturedItemKind
  title: string
  description?: string
  thumbnail?: string
  price: number | 'FREE'
  isFree: boolean
  tag: string
  badgeTitle: string
  badgeColorClass: string
  badgeDotColorClass: string
  levelOrType: string
  metaInfo?: string
  rating?: number
  reviews?: number
  createdAt: string
  targetUrl: string
  subjectId?: number
}

function extractYouTubeThumbnail(url?: string | null): string | null {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null
}

const getFallbackItems = (): FeaturedItem[] => {
  try {
    const storeCourses = useContentStore.getState().courses.filter((c) => c.status === 'Published')
    return storeCourses.slice(0, MAX_ITEMS).map((c) => ({
      id: String(c.id),
      kind: 'course' as const,
      title: c.title,
      description: c.description,
      thumbnail: c.thumbnail,
      price: (c.price === 'FREE' || c.price === 0) ? 'FREE' : c.price,
      isFree: c.price === 'FREE' || c.price === 0,
      tag: c.subcategory || c.group || 'Course',
      badgeTitle: 'Newly Added Course',
      badgeColorClass: 'text-blue-700 dark:text-blue-300',
      badgeDotColorClass: 'bg-blue-600 dark:bg-blue-400',
      levelOrType: c.level || 'Course',
      metaInfo: c.duration || (c.lectures ? `${c.lectures} lectures` : undefined),
      rating: c.rating || 4.9,
      reviews: c.reviews || 240,
      createdAt: c.createdAt || '',
      targetUrl: '/courses?tab=courses',
    }))
  } catch {
    return []
  }
}

export default function NewCoursePopup() {
  const location = useLocation()
  const navigate = useNavigate()

  const [itemsList, setItemsList] = useState<FeaturedItem[]>(getFallbackItems)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return (
      (location.pathname === '/' || location.pathname === '/courses') &&
      sessionStorage.getItem(STORAGE_DISMISS_KEY) !== '1'
    )
  })
  const [isHovered, setIsHovered] = useState(false)
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})
  const rotateRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (location.pathname !== '/' && location.pathname !== '/courses') {
      setIsOpen(false)
      return
    }

    if (sessionStorage.getItem(STORAGE_DISMISS_KEY) === '1') {
      return
    }

    setIsOpen(true)

    let cancelled = false

    const syncLatestItems = async () => {
      try {
        const [
          semBundlesRes,
          subBundlesRes,
          coursesRes,
          resourcesRes,
          resBundlesRes,
        ] = await Promise.allSettled([
          fetchPublishedSemesterBundles(),
          fetchPublishedSubjectBundles(),
          fetchPublishedSiteCourses(),
          fetchPublishedResources(),
          fetchPublishedResourceBundles(),
        ])

        const semBundles =
          semBundlesRes.status === 'fulfilled' && Array.isArray(semBundlesRes.value) ? semBundlesRes.value : []
        const subBundles =
          subBundlesRes.status === 'fulfilled' && Array.isArray(subBundlesRes.value) ? subBundlesRes.value : []
        const publishedCourses: Course[] =
          coursesRes.status === 'fulfilled' && Array.isArray(coursesRes.value) ? coursesRes.value : []
        const publishedResources: Resource[] =
          resourcesRes.status === 'fulfilled' && Array.isArray(resourcesRes.value) ? resourcesRes.value : []
        const resourceBundles =
          resBundlesRes.status === 'fulfilled' && Array.isArray(resBundlesRes.value) ? resBundlesRes.value : []

        // Map subjectId -> latest lecture/course upload timestamp & thumbnail
        // When an admin uploads a lecture or notes inside a bundle, the bundle is elevated to latest activity!
        const subjectLatestMeta = new Map<number, { date: string; thumb?: string }>()
        for (const c of publishedCourses) {
          if (c.subjectId) {
            const sid = Number(c.subjectId)
            const cur = subjectLatestMeta.get(sid) || { date: '' }
            const cDate = c.createdAt || ''
            if (!cur.date || (cDate && new Date(cDate) > new Date(cur.date))) {
              cur.date = cDate
            }
            const thumb = c.thumbnail || extractYouTubeThumbnail(c.videoUrl)
            if (thumb && !cur.thumb) {
              cur.thumb = thumb
            }
            subjectLatestMeta.set(sid, cur)
          }
        }
        for (const r of publishedResources) {
          if (r.subjectId) {
            const sid = Number(r.subjectId)
            const cur = subjectLatestMeta.get(sid) || { date: '' }
            const rDate = r.createdAt || ''
            if (!cur.date || (rDate && new Date(rDate) > new Date(cur.date))) {
              cur.date = rDate
            }
            if (r.thumbnail && !cur.thumb) {
              cur.thumb = r.thumbnail
            }
            subjectLatestMeta.set(sid, cur)
          }
        }

        const candidateItems: FeaturedItem[] = []

        // 1. Semester Bundles
        for (const sb of semBundles) {
          const rawPrice = sb.sixMonthPrice || sb.lifetimePrice || 0
          candidateItems.push({
            id: `sem_bundle_${sb.id}`,
            kind: 'semester_bundle',
            title: sb.title,
            description: sb.description || 'Comprehensive semester package with full syllabus coverage, lectures, and resources.',
            thumbnail: sb.thumbnailUrl,
            price: rawPrice === 0 ? 'FREE' : rawPrice,
            isFree: rawPrice === 0,
            tag: sb.branchName ? `${sb.branchName} • Sem ${sb.semesterNumber}` : (sb.semesterNumber ? `Semester ${sb.semesterNumber}` : 'Semester Bundle'),
            badgeTitle: 'Newly Added Semester Bundle',
            badgeColorClass: 'text-purple-700 dark:text-purple-300',
            badgeDotColorClass: 'bg-purple-600 dark:bg-purple-400',
            levelOrType: 'Semester Bundle',
            metaInfo: `Semester ${sb.semesterNumber || ''}`,
            rating: 4.9,
            reviews: 180,
            createdAt: sb.createdAt || '',
            targetUrl: '/courses?tab=semester-bundles',
          })
        }

        // 2. Subject Bundles (Shows the Bundle itself, NOT courses inside the bundle!)
        for (const b of subBundles) {
          const rawPrice = b.sixMonthPrice || b.lifetimePrice || 0
          const meta = subjectLatestMeta.get(Number(b.subjectId))
          const effectiveDate =
            meta?.date && (!b.createdAt || new Date(meta.date) > new Date(b.createdAt))
              ? meta.date
              : b.createdAt || ''
          const thumb = b.thumbnailUrl || meta?.thumb || undefined
          const bundleTitle = b.subjectName
            ? `${b.subjectName} Bundle`
            : (b.description || 'Subject Bundle')

          candidateItems.push({
            id: `sub_bundle_${b.id}`,
            kind: 'subject_bundle',
            title: bundleTitle,
            description: b.description || 'Complete subject study bundle with structured lectures, syllabus units, and revision material.',
            thumbnail: thumb,
            price: rawPrice === 0 ? 'FREE' : rawPrice,
            isFree: rawPrice === 0,
            tag: b.branchName || (b.semesterNumber ? `Semester ${b.semesterNumber}` : 'Subject Bundle'),
            badgeTitle: 'Newly Added Subject Bundle',
            badgeColorClass: 'text-blue-700 dark:text-blue-300',
            badgeDotColorClass: 'bg-blue-600 dark:bg-blue-400',
            levelOrType: 'Subject Bundle',
            metaInfo: b.subjectCode || 'All Units & Lectures',
            rating: b.rating || 4.8,
            reviews: b.reviews || 95,
            createdAt: effectiveDate,
            targetUrl: `/resources/bundles/${b.subjectId}`,
            subjectId: b.subjectId,
          })
        }

        // 3. Course Combo Packs / Course Bundles
        const bundledIds = new Set<string>()
        publishedCourses.forEach((c) => {
          const isBundle = c.isCourseBundle || (c.tags || []).includes('__is_course_bundle')
          if (isBundle && c.bundledCourseIds?.length) {
            c.bundledCourseIds.forEach((id) => {
              bundledIds.add(String(id).replace(/^course_/, ''))
              bundledIds.add(String(id))
            })
          }
        })

        for (const c of publishedCourses) {
          const isBundle = c.isCourseBundle || (c.tags || []).includes('__is_course_bundle')
          if (isBundle) {
            const isFree = c.price === 'FREE' || c.price === 0
            candidateItems.push({
              id: `combo_bundle_${c.id}`,
              kind: 'course_bundle',
              title: c.title,
              description: c.description || 'All-in-one comprehensive course pack covering multiple subject domains.',
              thumbnail: c.thumbnail || extractYouTubeThumbnail(c.videoUrl) || undefined,
              price: isFree ? 'FREE' : c.price,
              isFree,
              tag: c.subcategory || 'Combo Pack',
              badgeTitle: 'Newly Added Combo Bundle',
              badgeColorClass: 'text-indigo-700 dark:text-indigo-300',
              badgeDotColorClass: 'bg-indigo-600 dark:bg-indigo-400',
              levelOrType: 'Combo Pack',
              metaInfo: c.duration || `${c.bundledCourseIds?.length || 2}+ Courses Included`,
              rating: c.rating || 4.9,
              reviews: c.reviews || 160,
              createdAt: c.createdAt || '',
              targetUrl: '/courses?tab=courses',
            })
          }
        }

        // 4. Standalone Courses (ONLY courses that are NOT inside a bundle!)
        for (const c of publishedCourses) {
          const isUnderBundle =
            c.isBundleOnly ||
            (c.tags || []).includes('__bundle_only') ||
            bundledIds.has(String(c.id).replace(/^course_/, '')) ||
            bundledIds.has(String(c.id))
          const isBundle = c.isCourseBundle || (c.tags || []).includes('__is_course_bundle')

          // Skip courses inside a bundle as requested: "that show the bundales not courses inside the bundal"
          if (isUnderBundle || isBundle) continue

          const isFree = c.price === 'FREE' || c.price === 0 || (!c.price && c.price !== undefined)
          candidateItems.push({
            id: `course_${c.id}`,
            kind: 'course',
            title: c.title,
            description: c.description,
            thumbnail: c.thumbnail || extractYouTubeThumbnail(c.videoUrl) || undefined,
            price: isFree ? 'FREE' : c.price,
            isFree,
            tag: c.subcategory || c.group || 'Course',
            badgeTitle: 'Newly Added Course',
            badgeColorClass: 'text-sky-700 dark:text-sky-300',
            badgeDotColorClass: 'bg-sky-600 dark:bg-sky-400',
            levelOrType: c.level || 'Course',
            metaInfo: c.duration || (c.lectures ? `${c.lectures} lectures` : undefined),
            rating: c.rating || 4.9,
            reviews: c.reviews || 120,
            createdAt: c.createdAt || '',
            targetUrl: '/courses?tab=courses',
          })
        }

        // 5. Standalone Resources (ONLY resources that are NOT inside a bundle!)
        for (const r of publishedResources) {
          if (r.isBundleOnly) continue // Skip resources inside bundles

          const isFree = !r.isPremium || !r.price || r.price === 0
          candidateItems.push({
            id: `resource_${r.id}`,
            kind: 'resource',
            title: r.title,
            description: r.description,
            thumbnail: r.thumbnail || undefined,
            price: isFree ? 'FREE' : (r.price || 'FREE'),
            isFree,
            tag: r.subject || r.course || 'Study Material',
            badgeTitle: 'Newly Added Resource',
            badgeColorClass: 'text-emerald-700 dark:text-emerald-300',
            badgeDotColorClass: 'bg-emerald-600 dark:bg-emerald-400',
            levelOrType: r.type || 'Notes',
            metaInfo: r.type ? `${r.type}` : (r.downloads ? `${r.downloads} downloads` : 'Study Resource'),
            rating: 4.8,
            reviews: r.downloads ? r.downloads * 2 + 10 : 85,
            createdAt: r.createdAt || '',
            targetUrl: '/resources',
          })
        }

        // 6. Resource Bundles
        for (const rb of resourceBundles) {
          const rawPrice = rb.sixMonthPrice || rb.lifetimePrice || 0
          candidateItems.push({
            id: `res_bundle_${rb.id}`,
            kind: 'resource_bundle',
            title: rb.title,
            description: rb.description || 'Curated notes, PYQs, and revision resource bundle.',
            thumbnail: rb.items?.find(it => it.thumbnailUrl)?.thumbnailUrl || '',
            price: rawPrice === 0 ? 'FREE' : rawPrice,
            isFree: rawPrice === 0,
            tag: rb.subjectName ? `${rb.subjectName} Notes` : 'Resource Bundle',
            badgeTitle: 'Newly Added Resource Bundle',
            badgeColorClass: 'text-teal-700 dark:text-teal-300',
            badgeDotColorClass: 'bg-teal-600 dark:bg-teal-400',
            levelOrType: 'Resource Bundle',
            metaInfo: `${rb.itemCount || 'Complete'} Included Notes`,
            rating: 4.8,
            reviews: 65,
            createdAt: rb.createdAt || '',
            targetUrl: `/resources/bundles/${rb.subjectId}?from=resources`,
            subjectId: rb.subjectId,
          })
        }

        if (candidateItems.length > 0) {
          // Sort descending by latest upload / activity timestamp
          candidateItems.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return timeB - timeA
          })
          if (!cancelled) {
            setItemsList(candidateItems.slice(0, MAX_ITEMS))
            setCurrentIndex(0)
            setIsOpen(true)
          }
        } else {
          const fallback = getFallbackItems()
          if (!cancelled && fallback.length > 0) {
            setItemsList(fallback)
            setIsOpen(true)
          }
        }
      } catch (err) {
        console.warn('NewCoursePopup sync error:', err)
      }
    }

    syncLatestItems()

    return () => {
      cancelled = true
    }
  }, [location.pathname])

  // Automatically cycle items every 3.5 seconds, pausing when user hovers
  useEffect(() => {
    if (!isOpen || isHovered || itemsList.length <= 1) {
      if (rotateRef.current) clearInterval(rotateRef.current)
      return
    }

    rotateRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % itemsList.length)
    }, AUTO_ROTATE_MS)

    return () => {
      if (rotateRef.current) clearInterval(rotateRef.current)
    }
  }, [isOpen, isHovered, itemsList.length])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % itemsList.length)
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + itemsList.length) % itemsList.length)
      } else if (e.key === 'Escape') {
        handleDismiss()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, itemsList.length])

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % itemsList.length)
  }

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + itemsList.length) % itemsList.length)
  }

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_DISMISS_KEY, '1')
    setIsOpen(false)
  }

  const handleExplore = (item: FeaturedItem) => {
    sessionStorage.setItem(STORAGE_DISMISS_KEY, '1')
    setIsOpen(false)
    navigate(item.targetUrl)
  }

  if (itemsList.length === 0) return null

  const currentItem = itemsList[currentIndex] || itemsList[0]
  if (!currentItem) return null

  const isBundleKind =
    currentItem.kind === 'subject_bundle' ||
    currentItem.kind === 'semester_bundle' ||
    currentItem.kind === 'course_bundle' ||
    currentItem.kind === 'resource_bundle'

  // Early Bird offer: semester bundles for semesters 1, 3 & 5
  // Check metaInfo ("Semester 5"), tag, or title for the semester number
  const semesterNum = (() => {
    if (currentItem.kind !== 'semester_bundle') return 0
    const fromMeta = parseInt((currentItem.metaInfo || '').replace(/[^\d]/g, '')) || 0
    if (fromMeta) return fromMeta
    const fromTag  = parseInt((currentItem.tag  || '').replace(/[^\d]/g, '')) || 0
    if (fromTag) return fromTag
    const m = (currentItem.title || '').match(/semester\s*(\d)/i)
    return m ? parseInt(m[1]) : 0
  })()
  const isEarlyBirdSemBundle = currentItem.kind === 'semester_bundle' && [1, 3, 5].includes(semesterNum)
  // ₹799/180 days ≈ ₹4.44 per day
  const earlyBirdDailyRate = (799 / 180).toFixed(2)

  const hasImage = Boolean(currentItem.thumbnail && !imgErrors[currentItem.id])

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
              {/* Header with Kind indicator and counter */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800/80 pr-10">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${currentItem.badgeDotColorClass}`} />
                  <span className="text-xs font-semibold tracking-wider uppercase text-neutral-700 dark:text-neutral-300">
                    {currentItem.badgeTitle}
                  </span>
                  {itemsList.length > 1 && (
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">
                      ({currentIndex + 1} of {itemsList.length})
                    </span>
                  )}
                </div>
              </div>

              {/* Main Content Showcase */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                {/* Visual Preview */}
                <div className="sm:col-span-5 relative group overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 aspect-[16/11]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentItem.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      onClick={() => handleExplore(currentItem)}
                      className="h-full w-full cursor-pointer relative"
                    >
                      {hasImage ? (
                        <img
                          src={currentItem.thumbnail}
                          alt={currentItem.title}
                          onError={() => setImgErrors((prev) => ({ ...prev, [currentItem.id]: true }))}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-neutral-500 dark:text-neutral-400 bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800">
                          {isBundleKind ? (
                            <Package size={38} className="mb-1.5 opacity-80 text-purple-500" />
                          ) : currentItem.kind === 'course' ? (
                            <BookOpen size={36} className="mb-1.5 opacity-80 text-blue-500" />
                          ) : (
                            <FileText size={36} className="mb-1.5 opacity-80 text-emerald-500" />
                          )}
                          <span className="text-xs font-semibold uppercase tracking-wider line-clamp-1">
                            {currentItem.tag}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

                      {/* Hover action indicator */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-900 shadow-md">
                          {isBundleKind ? <Layers size={22} /> : currentItem.kind === 'course' ? <PlayCircle size={26} /> : <FileText size={24} />}
                        </span>
                      </div>

                      {/* Level/Type & Price Tags */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                        <span className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm max-w-[55%] truncate">
                          {currentItem.levelOrType}
                        </span>
                        {isEarlyBirdSemBundle ? (
                          <div className="flex flex-col items-end bg-gradient-to-r from-amber-500 to-rose-500 px-2 py-1 rounded-md">
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-[15px] font-black text-white leading-none">₹{earlyBirdDailyRate}</span>
                              <span className="text-[9px] text-white/90 font-bold">/day</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-[10px] font-bold text-white/90">₹799</span>
                              <span className="text-[9px] text-white/60 line-through">₹{currentItem.price}</span>
                            </div>
                          </div>
                        ) : (
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-bold backdrop-blur-sm ${
                              currentItem.isFree
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-neutral-900 shadow-sm'
                            }`}
                          >
                            {currentItem.isFree ? 'FREE' : `₹${currentItem.price}`}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Left & Right Arrow Controls on Preview Banner */}
                  {itemsList.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrev}
                        aria-label="Previous item"
                        title="Previous"
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors shadow"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        aria-label="Next item"
                        title="Next"
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors shadow"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </div>

                {/* Details Section */}
                <div className="sm:col-span-7 flex flex-col justify-between">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentItem.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                          {currentItem.tag}
                        </span>
                        {currentItem.metaInfo && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                            <Clock size={11} />
                            {currentItem.metaInfo}
                          </span>
                        )}
                      </div>

                      <h3
                        id="course-popup-title"
                        onClick={() => handleExplore(currentItem)}
                        className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer line-clamp-2"
                      >
                        {currentItem.title}
                      </h3>

                      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {currentItem.description ||
                          (isBundleKind
                            ? 'Complete comprehensive bundle with curriculum lectures, notes, and study material.'
                            : 'High quality content designed to build practical skills and exam mastery.')}
                      </p>

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                          {currentItem.rating || 4.8}
                        </span>
                        <span className="text-neutral-400">
                          ({currentItem.reviews || 120}+ reviews)
                        </span>
                      </div>

                      {/* Early Bird Offer card for Sem 1, 3, 5 */}
                      {isEarlyBirdSemBundle && (
                        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/50">
                          <span className="text-base leading-none">🐣</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">Early Bird Offer</p>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xl font-black text-amber-600 dark:text-amber-400">₹{earlyBirdDailyRate}</span>
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">/day</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">₹799 full semester</span>
                              <span className="text-[10px] line-through text-neutral-400">₹{currentItem.price}</span>
                              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">Save {Math.round(((Number(currentItem.price) - 799) / Number(currentItem.price)) * 100)}%</span>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                              <BadgePercent size={11} /> Use coupon
                            </span>
                            <p className="text-[10px] font-black text-rose-600 dark:text-rose-400">→ ₹699</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* CTAs */}
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleExplore(currentItem)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-sm"
                    >
                      <span>
                        {isBundleKind
                          ? 'Explore Bundle'
                          : currentItem.kind === 'course'
                          ? 'Explore Course'
                          : 'View Resource'}
                      </span>
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

              {/* Minimal Stepper Dots */}
              {itemsList.length > 1 && (
                <div className="mt-5 flex items-center justify-center gap-1.5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                  {itemsList.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to slide ${i + 1}`}
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
