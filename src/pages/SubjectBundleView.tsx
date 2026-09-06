import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Lock, Unlock, CheckCircle2, AlertCircle, Clock,
  Play, FileText, ChevronDown, ChevronRight, ArrowLeft, ArrowRight,
  Sparkles, ShieldCheck, HelpCircle, Check, Loader2,
  Calendar, Layers, Download, Upload, X, Copy, QrCode, Tag,
  BadgePercent, AlertTriangle, ExternalLink, BookOpen,
  Star, Users, GraduationCap
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import {
  fetchSubjectBundle,
  fetchSubjectCurriculum,
  getUserSubjectBundleEntitlement,
  submitSubjectBundlePaymentProof,
} from '../lib/subjectBundleService'
import type {
  SubjectBundle,
  SubjectUnit,
  SubjectVideo,
  SubjectUnitResource,
  SubjectBundleAccess,
  SubjectBundlePlan,
} from '../lib/subjectBundleTypes'
import { fetchSemesterBundleForSubject, getUserSemesterBundleEntitlement } from '../lib/semesterBundleService'
import type { SemesterBundle } from '../lib/semesterBundleTypes'
import {
  fetchResourceBundleBySubject,
  getUserResourceBundleEntitlement,
  submitResourceBundlePaymentProof,
} from '../lib/resourceBundleService'
import type {
  ResourceBundle,
  ResourceBundleAccess,
  ResourceBundlePlan,
} from '../lib/resourceBundleTypes'
import { fetchCheckoutPrice, toCheckoutPricing, formatPrice } from '../lib/pricingService'
import type { CheckoutPricing } from '../lib/pricingTypes'
import { getPaymentSettings, type PaymentSettings } from '../lib/videoEngagementService'
import { triggerResourceDownload } from '../lib/resourceService'
import { getBackblazeVideoUrl, isBackblazeRef } from '../lib/backblazeService'
import VideoPlayerModal from '../components/VideoPlayerModal'
import CourseRatingMenu from '../components/CourseRatingMenu'
import type { Course } from '../store/contentStore'

export default function SubjectBundleView() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'
  const isPremiumUser = Boolean(user?.isPremium)

  const numSubjectId = subjectId ? parseInt(subjectId, 10) : 0

  const isFromResources = useMemo(() => {
    const fromParam = searchParams.get('from')?.toLowerCase()
    const sourceParam = searchParams.get('source')?.toLowerCase()
    const contextParam = searchParams.get('context')?.toLowerCase()
    const checkoutParam = searchParams.get('checkout')?.toLowerCase()

    return (
      fromParam === 'resources' ||
      sourceParam === 'resources' ||
      contextParam === 'resources' ||
      checkoutParam === 'resource_bundle' ||
      location.pathname.startsWith('/resources') ||
      (location.state as any)?.from === 'resources'
    )
  }, [searchParams, location.pathname, location.state])

  const [loading, setLoading] = useState(true)
  const [bundle, setBundle] = useState<SubjectBundle | null>(null)
  const [resourceBundle, setResourceBundle] = useState<ResourceBundle | null>(null)
  const [parentSemesterBundle, setParentSemesterBundle] = useState<SemesterBundle | null>(null)
  const [curriculum, setCurriculum] = useState<{
    units: SubjectUnit[]
    videos: SubjectVideo[]
    resources: SubjectUnitResource[]
  }>({ units: [], videos: [], resources: [] })

  const [access, setAccess] = useState<SubjectBundleAccess>({ hasAccess: false })
  const [resourceAccess, setResourceAccess] = useState<ResourceBundleAccess>({ hasAccess: false })
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({})

  // Video playback modal state
  const [activeVideo, setActiveVideo] = useState<SubjectVideo | null>(null)

  // Unified Purchase modal state
  const [checkoutTarget, setCheckoutTarget] = useState<{
    bundleType: 'subject_bundle' | 'resource_bundle'
    planType: 'six_month' | 'lifetime'
    bundle: SubjectBundle | ResourceBundle
  } | null>(null)

  // Load subject bundle data, resource bundle data, curriculum, and access
  const loadData = async () => {
    if (!numSubjectId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [bundleData, resBundleData, currData, accessData, resAccessData, parentSemBundle] = await Promise.all([
        fetchSubjectBundle(numSubjectId),
        fetchResourceBundleBySubject(numSubjectId),
        fetchSubjectCurriculum(numSubjectId),
        user?.id ? getUserSubjectBundleEntitlement(user.id, numSubjectId) : Promise.resolve({ hasAccess: false } as SubjectBundleAccess),
        user?.id ? getUserResourceBundleEntitlement(user.id, numSubjectId) : Promise.resolve({ hasAccess: false } as ResourceBundleAccess),
        fetchSemesterBundleForSubject(numSubjectId),
      ])

      setBundle(bundleData)
      setResourceBundle(resBundleData)
      setCurriculum(currData)
      setParentSemesterBundle(parentSemBundle)

      let finalAccess = accessData
      let finalResAccess = resAccessData

      // Check if user owns parent semester bundle if direct subject access is not active
      if (!finalAccess.hasAccess && user?.id && parentSemBundle?.id) {
        try {
          const semEnt = await getUserSemesterBundleEntitlement(user.id, parentSemBundle.id)
          if (semEnt.hasAccess) {
            finalAccess = {
              hasAccess: true,
              planType: (semEnt.planType as any) || 'six_month',
              expiresAt: semEnt.expiresAt || undefined,
              startsAt: semEnt.startsAt || undefined,
              isLifetime: semEnt.isLifetime,
              paymentStatus: 'paid',
              status: 'active',
              viaSemesterBundle: true,
              semesterBundleTitle: parentSemBundle.title,
            }
            finalResAccess = {
              hasAccess: true,
              planType: (semEnt.planType as any) || 'six_month',
              expiresAt: semEnt.expiresAt || undefined,
              startsAt: semEnt.startsAt || undefined,
              isLifetime: semEnt.isLifetime,
            }
          }
        } catch (e) {
          console.warn('[SubjectBundleView] Error checking semester bundle access fallback:', e)
        }
      }

      // Admin or premium membership grants full access
      if (isAdmin || isPremiumUser) {
        setAccess({
          hasAccess: true,
          planType: 'lifetime',
          isPremiumPass: isPremiumUser,
        })
        setResourceAccess({
          hasAccess: true,
          planType: 'lifetime',
          isPremiumPass: isPremiumUser,
        })
      } else {
        setAccess(finalAccess)
        setResourceAccess(finalResAccess)
      }

      // Default first 2 units to open
      if (currData.units.length > 0) {
        const initialOpen: Record<string, boolean> = {}
        currData.units.slice(0, 2).forEach(u => {
          initialOpen[u.id] = true
        })
        setOpenUnits(initialOpen)
      }

      // Check if checkout was requested via query params
      const checkoutParam = searchParams.get('checkout')
      const planParam = (searchParams.get('plan') as 'six_month' | 'lifetime') || 'six_month'
      if (checkoutParam === 'resource_bundle' && resBundleData) {
        setCheckoutTarget({
          bundleType: 'resource_bundle',
          planType: planParam,
          bundle: resBundleData,
        })
      } else if (checkoutParam === 'subject_bundle' && bundleData) {
        setCheckoutTarget({
          bundleType: 'subject_bundle',
          planType: planParam,
          bundle: bundleData,
        })
      }
    } catch (err) {
      console.error('[SubjectBundleView] Error loading data:', err)
      toast.error('Failed to load subject bundle information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numSubjectId, user?.id, isAdmin, isPremiumUser])

  const toggleUnit = (unitId: string) => {
    setOpenUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }))
  }

  // Access rights
  const hasSubjectAccess = Boolean(access.hasAccess || isAdmin || isPremiumUser)
  const hasResourceAccess = Boolean(hasSubjectAccess || resourceAccess.hasAccess)

  // Video player logic — construct full Course shape for VideoPlayerModal
  const activeCourseVideo: Course | null = useMemo(() => {
    if (!activeVideo) return null
    return {
      id: String(activeVideo.courseId || activeVideo.id),
      title: activeVideo.title,
      description: activeVideo.description || '',
      group: 'College & Tech Courses',
      subcategory: (bundle?.academicCourseName || 'Engineering') as any,
      instructor: activeVideo.instructor || bundle?.instructor || 'Skills021 Faculty',
      duration: activeVideo.duration || '',
      lectures: curriculum.videos.length,
      level: (activeVideo.level as any) || 'All Levels',
      rating: activeVideo.rating ?? bundle?.rating ?? 4.8,
      reviews: activeVideo.reviews ?? bundle?.reviews ?? 0,
      price: 0,
      isFree: true,
      tags: [],
      thumbnail: activeVideo.thumbnailUrl || bundle?.thumbnailUrl,
      videoUrl: activeVideo.videoUrl,
      modules: [],
      gradientFrom: '#6C63FF',
      gradientTo: '#00BFA6',
      createdAt: activeVideo.createdAt || new Date().toISOString(),
      status: 'Published',
      enrolled: 120,
      academicCourse: bundle?.academicCourseName,
      subject: bundle?.subjectName,
      subjectId: numSubjectId,
    }
  }, [activeVideo, bundle, curriculum.videos.length, numSubjectId])

  const handlePlayVideo = (video: SubjectVideo) => {
    if (!video.isFreePreview && !hasSubjectAccess) {
      if (resourceAccess.hasAccess) {
        toast.error('Videos are not included in your Resource Bundle. Upgrade to the Complete Subject Bundle to watch video lectures.')
      } else {
        toast.error('This lecture is locked. Purchase the Complete Subject Bundle to unlock.')
      }
      return
    }

    setActiveVideo(video)
  }

  // Resource download logic
  const handleDownloadResource = async (resource: SubjectUnitResource) => {
    if (!hasResourceAccess) {
      toast.error('This note is locked. Purchase the Subject Bundle or Resource Bundle to unlock.')
      return
    }

    if (!resource.fileUrl) {
      toast.error('Resource file is not available')
      return
    }

    try {
      toast.loading('Preparing download...', { id: 'downloading' })
      await triggerResourceDownload(resource.fileUrl, resource.title)
      toast.success(`Downloaded: ${resource.title}`, { id: 'downloading' })
    } catch (err) {
      toast.error('Failed to download resource', { id: 'downloading' })
    }
  }

  const openCheckout = (
    bundleType: 'subject_bundle' | 'resource_bundle',
    planType: 'six_month' | 'lifetime',
    targetBundle: SubjectBundle | ResourceBundle
  ) => {
    if (!user) {
      toast.error('Please login to purchase this bundle')
      navigate('/login')
      return
    }
    setCheckoutTarget({
      bundleType,
      planType,
      bundle: targetBundle,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-24 pb-16 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 size={36} className="animate-spin text-primary-500 mx-auto" />
          <p className="text-sm font-semibold text-brand-muted dark:text-brand-dark-muted">Loading subject content and bundles...</p>
        </div>
      </div>
    )
  }

  if (!bundle && !resourceBundle) {
    return (
      <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-24 pb-16 px-4">
        <div className="max-w-xl mx-auto text-center card p-8 border border-brand-border dark:border-brand-dark-border">
          <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-2">Bundles Not Configured</h2>
          <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-6">
            A purchase bundle has not yet been set up for this subject by administrators.
          </p>
          <Link
            to={isFromResources ? '/resources' : '/courses'}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition-colors"
          >
            <ArrowLeft size={16} /> Back to {isFromResources ? 'Resources' : 'Courses'}
          </Link>
        </div>
      </div>
    )
  }

  const subjectTitle = bundle?.subjectName || resourceBundle?.subjectName || `Subject #${numSubjectId}`
  const subjectCode = bundle?.subjectCode || resourceBundle?.subjectCode
  const semesterNumber = bundle?.semesterNumber || resourceBundle?.semesterNumber
  const collegeName = bundle?.collegeName || resourceBundle?.collegeName
  const courseName = bundle?.academicCourseName || resourceBundle?.courseName
  const branchName = bundle?.branchName || resourceBundle?.branchName

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-20 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back Link */}
        <div className="mb-6">
          <button
            onClick={() => navigate(isFromResources ? '/resources' : '/courses')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-text dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to {isFromResources ? 'Resources' : 'Courses'}
          </button>
        </div>

        {/* Top Header Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 sm:p-8 mb-8 border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card shadow-xs relative overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row gap-6 relative z-10 items-start">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 border border-primary-100 dark:border-primary-900/40">
                  <Package size={12} /> Academic Subject
                </span>
                {subjectCode && (
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-gray-100 dark:bg-white/10 text-brand-muted">
                    {subjectCode}
                  </span>
                )}
                {semesterNumber && (
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 dark:bg-white/10 text-brand-text dark:text-brand-dark-text">
                    Semester {semesterNumber}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-brand-text dark:text-brand-dark-text tracking-tight">
                {subjectTitle}
              </h1>

              {/* Breadcrumb path */}
              {(collegeName || courseName || branchName) && (
                <p className="text-xs text-brand-muted dark:text-brand-dark-muted font-medium flex flex-wrap items-center gap-1.5">
                  {collegeName && <span>{collegeName}</span>}
                  {courseName && <span>› {courseName}</span>}
                  {branchName && <span>› {branchName}</span>}
                </p>
              )}

              <p className="text-sm text-brand-muted dark:text-brand-dark-muted leading-relaxed whitespace-pre-line">
                {bundle?.description ||
                  'Comprehensive subject curriculum including all syllabus units, in-depth video walkthroughs, chapter-wise handwritten notes, solved question papers, and downloadable PDFs.'}
              </p>

              {/* Access Status Banner */}
              <div className="pt-2">
                {hasSubjectAccess ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                      <CheckCircle2 size={18} />
                      <span>Complete Subject Unlocked</span>
                    </div>
                    {access.isPremiumPass ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Active via All-Access Premium Pass.
                      </p>
                    ) : access.planType === 'lifetime' ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        ✓ Lifetime Access · Never expires
                      </p>
                    ) : (
                      <div className="text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                        <p>✓ 6 Months Access</p>
                        {access.expiresAt && (
                          <p className="font-mono text-[11px] opacity-90">
                            Expires: {new Date(access.expiresAt).toLocaleDateString()} ({access.daysLeft ?? 0} days left)
                          </p>
                        )}
                      </div>
                    )}
                    {access.viaSemesterBundle && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-[11px] font-bold text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/50">
                        <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Included with your {access.semesterBundleTitle || parentSemesterBundle?.title || 'Semester'} Bundle</span>
                      </div>
                    )}
                    <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                      All units, lectures, and resources are unlocked.
                    </p>
                  </div>
                ) : resourceAccess.hasAccess ? (
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                      <FileText size={18} />
                      <span>Resource Bundle Purchased</span>
                    </div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400">
                      All chapter notes, formula sheets & PDFs unlocked.
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                      🔒 Videos remain locked. Upgrade to Subject Bundle to watch lectures.
                    </p>
                  </div>
                ) : (access.hasPending || resourceAccess.hasPending) ? (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm">
                      <Clock size={18} className="animate-spin" />
                      <span>Payment Pending Verification</span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Your UPI verification receipt has been submitted. Our administration will approve access shortly.
                    </p>
                  </div>
                ) : (access.isExpired && resourceAccess.isExpired) ? (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 space-y-2">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
                      <AlertTriangle size={18} />
                      <span>Access Expired</span>
                    </div>
                    <p className="text-xs text-rose-600 dark:text-rose-400">
                      Your previous access period has concluded. Renew to regain full access.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border space-y-2">
                    <div className="flex items-center gap-2 text-brand-text dark:text-brand-dark-text font-bold text-sm">
                      <Lock size={16} className="text-primary-500" />
                      <span>Content Locked</span>
                    </div>
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted">
                      Unlock all {curriculum.units.length} units, {curriculum.videos.length} videos, and notes below with a bundle purchase.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Subject Bundle Thumbnail Banner */}
            <div className="w-full lg:w-84 xl:w-96 flex-shrink-0">
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg border border-brand-border dark:border-white/10 bg-slate-900 group">
                {bundle?.thumbnailUrl ? (
                  <img
                    src={bundle.thumbnailUrl}
                    alt={subjectTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-black flex flex-col items-center justify-center p-4 text-center">
                    <Package size={38} className="text-white/20 mb-1" />
                    <span className="text-xs font-mono font-bold text-primary-300 uppercase">{subjectCode || 'SUBJECT BUNDLE'}</span>
                    <span className="text-xs font-bold text-white/80 line-clamp-1 mt-0.5">{subjectTitle}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-primary-500/90 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider shadow-xs">
                    Curriculum
                  </span>
                  {bundle?.academicCourseName && (
                    <span className="px-2 py-0.5 rounded bg-white/20 backdrop-blur-md text-[10px] font-medium text-white shadow-xs">
                      {bundle.academicCourseName}
                    </span>
                  )}
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white">
                  <span className="flex items-center gap-1 font-semibold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                    <Play size={10} className="text-primary-400" /> {curriculum.videos.length} Lectures · {curriculum.units.length} Units
                  </span>
                  <span className="flex items-center gap-1 font-bold text-amber-300 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                    <Star size={10} className="fill-amber-400 text-amber-400" /> {bundle?.rating ?? 4.8}
                    <span className="text-white/60 font-normal">({bundle?.reviews ?? 120})</span>
                  </span>
                </div>

                {curriculum.videos.length > 0 && (
                  <div
                    onClick={() => handlePlayVideo(curriculum.videos[0])}
                    className="absolute inset-0 flex items-center justify-center cursor-pointer group-hover:bg-black/20 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary-500/95 text-white flex items-center justify-center shadow-lg border border-white/30 transform group-hover:scale-110 transition-transform">
                      <Play size={18} className="translate-x-0.5" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Purchase Options Section (Shown when content is NOT fully unlocked) */}
        {!hasSubjectAccess && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            {/* Semester Bundle Upsell Banner */}
            {parentSemesterBundle && (
              <div className="max-w-3xl mx-auto mb-8 p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-brand-border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-white/10 text-brand-text dark:text-white flex items-center justify-center flex-shrink-0">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#0A0A0A] text-white dark:bg-white dark:text-black">
                        Full Semester Pack Available
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Best Value
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-brand-text dark:text-brand-dark-text mt-1">
                      {parentSemesterBundle.title}
                    </h4>
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted line-clamp-1">
                      Includes this subject plus {Math.max(0, (parentSemesterBundle.subjects?.length || 1) - 1)} more subjects for complete semester preparation!
                    </p>
                  </div>
                </div>
                <Link
                  to={`/courses/semester-bundles/${parentSemesterBundle.id}`}
                  className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-[#0A0A0A] hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  View Semester Bundle <ArrowRight size={14} />
                </Link>
              </div>
            )}

            <div className="text-center max-w-xl mx-auto mb-6">
              {isFromResources ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 mb-2">
                  <FileText size={12} /> Notes & Course Options
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 border border-primary-200 dark:border-primary-800/40 mb-2">
                  <Package size={12} /> Complete Academic Course
                </div>
              )}
              <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">
                Choose Your Learning Plan
              </h2>
              <p className="text-xs sm:text-sm text-brand-muted dark:text-brand-dark-muted mt-1">
                {isFromResources
                  ? 'Select either the complete package with video masterclasses or the standalone notes bundle.'
                  : 'Get instant access to full-length video lectures, unit-by-unit syllabus walkthroughs, and curated notes.'}
              </p>
            </div>

            {isFromResources ? (
              /* Resource flow: Show BOTH cards side by side so user can buy any of them */
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto items-stretch">
                  {/* Option 1: Complete Subject Bundle (Videos + Notes) */}
                  {bundle && (
                    bundle.isSemesterOnly ? (
                      <div className="card p-6 border-2 border-violet-500/40 bg-gradient-to-b from-violet-50/20 to-transparent dark:from-violet-950/20 shadow-lg relative flex flex-col justify-between text-center">
                        <div className="flex flex-col items-center justify-center p-2">
                          <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
                            <GraduationCap size={24} />
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 mb-2">
                            Exclusive to Semester Bundle
                          </span>
                          <h3 className="text-lg sm:text-xl font-bold text-brand-text dark:text-brand-dark-text mb-2">
                            {bundle.title || `${subjectTitle} Complete Bundle`}
                          </h3>
                          <p className="text-xs text-brand-muted leading-relaxed max-w-sm mb-4">
                            This subject is exclusively bundled inside the Semester Bundle package. Enroll in the full Semester Bundle to unlock all lectures and notes.
                          </p>
                          {parentSemesterBundle ? (
                            <Link
                              to={`/courses/semester-bundles/${parentSemesterBundle.id}`}
                              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-1.5"
                            >
                              Enroll via {parentSemesterBundle.title} <ArrowRight size={15} />
                            </Link>
                          ) : (
                            <Link
                              to="/courses"
                              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-1.5"
                            >
                              Browse Semester Bundles <ArrowRight size={15} />
                            </Link>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="card p-6 border-2 border-primary-500 dark:border-primary-500 bg-gradient-to-b from-primary-50/20 to-transparent dark:from-primary-950/20 shadow-lg relative flex flex-col justify-between">
                        <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-primary-500 text-white text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                          <Sparkles size={11} /> Complete Learning
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary-500 flex items-center gap-1">
                              <Package size={14} /> Subject Bundle
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                              Videos + Notes
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-1">
                            {bundle.title || `${subjectTitle} Complete Bundle`}
                          </h3>
                          <p className="text-xs text-brand-muted mb-4">
                            The full academic package. Includes all recorded lectures, exam problem walkthroughs, and notes.
                          </p>

                          <div className="grid grid-cols-2 gap-3 mb-6 p-3 rounded-xl bg-white/60 dark:bg-black/20 border border-brand-border dark:border-brand-dark-border">
                            {bundle.sixMonthEnabled && (
                              <div>
                                <p className="text-[10px] font-bold uppercase text-brand-muted">6 Months Access</p>
                                <p className="text-2xl font-black text-brand-text dark:text-brand-dark-text">₹{bundle.sixMonthPrice}</p>
                                <p className="text-[10px] text-brand-muted">Semester Prep</p>
                              </div>
                            )}
                            {bundle.lifetimeEnabled && (
                              <div>
                                <p className="text-[10px] font-bold uppercase text-primary-500">Lifetime Access</p>
                                <p className="text-2xl font-black text-primary-600 dark:text-primary-400">₹{bundle.lifetimePrice}</p>
                                <p className="text-[10px] text-brand-muted">Never expires</p>
                              </div>
                            )}
                          </div>

                          <ul className="space-y-2.5 text-xs text-brand-text dark:text-brand-dark-text mb-6">
                            <li className="flex items-center gap-2">
                              <Check size={14} className="text-emerald-500 flex-shrink-0" />
                              <span className="font-semibold">All {curriculum.units.length} Units Completely Unlocked</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <Check size={14} className="text-emerald-500 flex-shrink-0" />
                              <span>All {curriculum.videos.length} Full-Length Video Lectures</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <Check size={14} className="text-emerald-500 flex-shrink-0" />
                              <span>All Handwritten Notes, Formula Sheets & PDFs</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <Check size={14} className="text-emerald-500 flex-shrink-0" />
                              <span>Subject Quizzes & Learning Resources</span>
                            </li>
                          </ul>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 border-t border-brand-border dark:border-brand-dark-border">
                          {bundle.sixMonthEnabled && (
                            <button
                              onClick={() => openCheckout('subject_bundle', 'six_month', bundle)}
                              className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-brand-text dark:text-white font-bold text-xs transition-colors cursor-pointer"
                            >
                              Buy 6 Months (₹{bundle.sixMonthPrice})
                            </button>
                          )}
                          {bundle.lifetimeEnabled && (
                            <button
                              onClick={() => openCheckout('subject_bundle', 'lifetime', bundle)}
                              className="w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                            >
                              Buy Lifetime (₹{bundle.lifetimePrice})
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  )}

                  {/* Option 2: Resource Bundle (Notes Only) */}
                  {resourceBundle ? (
                    <div className="card p-6 border-2 border-brand-border dark:border-brand-dark-border hover:border-indigo-500/50 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <FileText size={14} /> Resource Bundle
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                            Notes & PDFs Only
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-1">
                          {resourceBundle.title || `${subjectTitle} Notes & Resources`}
                        </h3>
                        <p className="text-xs text-brand-muted mb-4">
                          {resourceBundle.description || 'All chapter notes, previous year question solutions, and study material.'}
                        </p>

                        <div className="grid grid-cols-2 gap-3 mb-6 p-3 rounded-xl bg-white/60 dark:bg-black/20 border border-brand-border dark:border-brand-dark-border">
                          {resourceBundle.sixMonthEnabled && (
                            <div>
                              <p className="text-[10px] font-bold uppercase text-brand-muted">6 Months Access</p>
                              <p className="text-2xl font-black text-brand-text dark:text-brand-dark-text">₹{resourceBundle.sixMonthPrice}</p>
                              <p className="text-[10px] text-brand-muted">Notes Download</p>
                            </div>
                          )}
                          {resourceBundle.lifetimeEnabled && (
                            <div>
                              <p className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">Lifetime Access</p>
                              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{resourceBundle.lifetimePrice}</p>
                              <p className="text-[10px] text-brand-muted">Unlimited Notes</p>
                            </div>
                          )}
                        </div>

                        <ul className="space-y-2.5 text-xs text-brand-text dark:text-brand-dark-text mb-6">
                          <li className="flex items-center gap-2">
                            <Check size={14} className="text-emerald-500 flex-shrink-0" />
                            <span>All Notes, Cheat Sheets & Question Papers</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check size={14} className="text-emerald-500 flex-shrink-0" />
                            <span>High-Resolution Downloadable PDFs</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check size={14} className="text-emerald-500 flex-shrink-0" />
                            <span>Fast Download Access via Backblaze B2</span>
                          </li>
                          <li className="flex items-center gap-2 text-rose-500 font-semibold">
                            <X size={14} className="text-rose-500 flex-shrink-0" />
                            <span>✕ Videos NOT included in this bundle</span>
                          </li>
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 border-t border-brand-border dark:border-brand-dark-border">
                        {resourceAccess.hasAccess ? (
                          <div className="col-span-2 py-2.5 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                            ✓ Resource Bundle Already Purchased
                          </div>
                        ) : (
                          <>
                            {resourceBundle.sixMonthEnabled && (
                              <button
                                onClick={() => openCheckout('resource_bundle', 'six_month', resourceBundle)}
                                className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-brand-text dark:text-white font-bold text-xs transition-colors cursor-pointer"
                              >
                                Buy 6M Notes (₹{resourceBundle.sixMonthPrice})
                              </button>
                            )}
                            {resourceBundle.lifetimeEnabled && (
                              <button
                                onClick={() => openCheckout('resource_bundle', 'lifetime', resourceBundle)}
                                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                              >
                                Buy Lifetime Notes (₹{resourceBundle.lifetimePrice})
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="card p-6 border border-brand-border dark:border-brand-dark-border flex flex-col items-center justify-center text-center text-brand-muted">
                      <FileText size={36} className="opacity-40 mb-3" />
                      <h4 className="text-sm font-bold text-brand-text dark:text-brand-dark-text mb-1">Standalone Notes Bundle</h4>
                      <p className="text-xs max-w-xs">
                        A standalone notes-only bundle is not configured for this subject yet. Purchase the Complete Subject Bundle above to unlock notes and videos.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams)
                      newParams.delete('from')
                      newParams.delete('source')
                      newParams.delete('context')
                      setSearchParams(newParams)
                    }}
                    className="text-xs text-brand-muted hover:text-primary-600 dark:hover:text-primary-400 font-medium hover:underline transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    View course bundle only ›
                  </button>
                </div>
              </div>
            ) : (
              /* Course flow: Show ONLY the course card (Subject Bundle) centered */
              <div className="max-w-xl mx-auto">
                {bundle && (
                  bundle.isSemesterOnly ? (
                    <div className="card p-6 sm:p-8 border-2 border-violet-500/40 bg-gradient-to-b from-violet-50/20 to-transparent dark:from-violet-950/20 shadow-xl relative text-center">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
                        <GraduationCap size={28} />
                      </div>
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 mb-3">
                        Exclusive to Semester Bundle
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold text-brand-text dark:text-brand-dark-text mb-2">
                        {bundle.title || `${subjectTitle} Complete Bundle`}
                      </h3>
                      <p className="text-xs sm:text-sm text-brand-muted leading-relaxed max-w-md mx-auto mb-6">
                        This subject is part of the curated Semester Bundle pack and cannot be purchased as a standalone single subject. Get complete access to all {curriculum.units.length} units, lectures, and resources by enrolling in the semester bundle.
                      </p>
                      {parentSemesterBundle ? (
                        <Link
                          to={`/courses/semester-bundles/${parentSemesterBundle.id}`}
                          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-all shadow-md inline-flex items-center justify-center gap-2"
                        >
                          Enroll via {parentSemesterBundle.title} <ArrowRight size={16} />
                        </Link>
                      ) : (
                        <Link
                          to="/courses"
                          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-all shadow-md inline-flex items-center justify-center gap-2"
                        >
                          Browse Semester Bundles <ArrowRight size={16} />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="card p-6 sm:p-7 border-2 border-primary-500 dark:border-primary-500 bg-gradient-to-b from-primary-50/20 to-transparent dark:from-primary-950/20 shadow-xl relative flex flex-col justify-between">
                      <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-primary-500 text-white text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                        <Sparkles size={11} /> Complete Learning
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary-500 flex items-center gap-1">
                            <Package size={14} /> Subject Bundle
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                            Videos + Notes
                          </span>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-bold text-brand-text dark:text-brand-dark-text mb-1">
                          {bundle.title || `${subjectTitle} Complete Bundle`}
                        </h3>
                        <p className="text-xs sm:text-sm text-brand-muted mb-4">
                          The full academic package. Includes all recorded lectures, exam problem walkthroughs, and notes.
                        </p>

                        <div className="grid grid-cols-2 gap-3 mb-6 p-3 sm:p-4 rounded-xl bg-white/60 dark:bg-black/20 border border-brand-border dark:border-brand-dark-border">
                          {bundle.sixMonthEnabled && (
                            <div>
                              <p className="text-[10px] font-bold uppercase text-brand-muted">6 Months Access</p>
                              <p className="text-2xl sm:text-3xl font-black text-brand-text dark:text-brand-dark-text">₹{bundle.sixMonthPrice}</p>
                              <p className="text-[10px] text-brand-muted">Semester Prep</p>
                            </div>
                          )}
                          {bundle.lifetimeEnabled && (
                            <div>
                              <p className="text-[10px] font-bold uppercase text-primary-500">Lifetime Access</p>
                              <p className="text-2xl sm:text-3xl font-black text-primary-600 dark:text-primary-400">₹{bundle.lifetimePrice}</p>
                              <p className="text-[10px] text-brand-muted">Never expires</p>
                            </div>
                          )}
                        </div>

                        <ul className="space-y-2.5 text-xs sm:text-sm text-brand-text dark:text-brand-dark-text mb-6">
                          <li className="flex items-center gap-2">
                            <Check size={15} className="text-emerald-500 flex-shrink-0" />
                            <span className="font-semibold">All {curriculum.units.length} Units Completely Unlocked</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check size={15} className="text-emerald-500 flex-shrink-0" />
                            <span>All {curriculum.videos.length} Full-Length Video Lectures</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check size={15} className="text-emerald-500 flex-shrink-0" />
                            <span>All Handwritten Notes, Formula Sheets & PDFs</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check size={15} className="text-emerald-500 flex-shrink-0" />
                            <span>Subject Quizzes & Learning Resources</span>
                          </li>
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-brand-border dark:border-brand-dark-border">
                        {bundle.sixMonthEnabled && (
                          <button
                            onClick={() => openCheckout('subject_bundle', 'six_month', bundle)}
                            className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-brand-text dark:text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                          >
                            Buy 6 Months (₹{bundle.sixMonthPrice})
                          </button>
                        )}
                        {bundle.lifetimeEnabled && (
                          <button
                            onClick={() => openCheckout('subject_bundle', 'lifetime', bundle)}
                            className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs sm:text-sm transition-colors shadow-sm cursor-pointer"
                          >
                            Buy Lifetime (₹{bundle.lifetimePrice})
                          </button>
                        )}
                      </div>
                    </div>
                  )
                )}

                {resourceBundle && (
                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams)
                        newParams.set('from', 'resources')
                        setSearchParams(newParams)
                      }}
                      className="text-xs text-brand-muted hover:text-primary-600 dark:hover:text-primary-400 font-medium hover:underline transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      Looking for notes only? View Notes & PDF Options in Resources ›
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Curriculum: Units, Lectures, & Notes */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-brand-border dark:border-brand-dark-border pb-4">
            <div>
              <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text">
                Curriculum & Learning Content
              </h2>
              <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-0.5">
                {curriculum.units.length} Units · {curriculum.videos.length} Lectures · {curriculum.resources.length} Notes & Documents
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => {
                  const all: Record<string, boolean> = {}
                  curriculum.units.forEach(u => { all[u.id] = true })
                  setOpenUnits(all)
                }}
                className="px-2.5 py-1 rounded-lg border border-brand-border text-brand-muted hover:text-brand-text text-[11px] font-semibold"
              >
                Expand All
              </button>
              <button
                onClick={() => setOpenUnits({})}
                className="px-2.5 py-1 rounded-lg border border-brand-border text-brand-muted hover:text-brand-text text-[11px] font-semibold"
              >
                Collapse All
              </button>
            </div>
          </div>

          {curriculum.units.length === 0 ? (
            <div className="card p-12 text-center border border-brand-border dark:border-brand-dark-border text-brand-muted">
              <Layers size={36} className="mx-auto mb-3 text-brand-muted opacity-40" />
              <p className="text-sm font-semibold">No units uploaded for this subject yet.</p>
              <p className="text-xs mt-1">Our academic team is currently preparing unit lectures and notes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {curriculum.units.map((unit) => {
                const isOpen = Boolean(openUnits[unit.id])
                const unitVideos = unit.videos || []
                const unitNotes = unit.resources || []
                const totalItems = unitVideos.length + unitNotes.length

                return (
                  <div
                    key={unit.id}
                    className="card overflow-hidden border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card transition-all"
                  >
                    {/* Unit Header Bar */}
                    <button
                      onClick={() => toggleUnit(unit.id)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center font-black text-xs">
                          U{unit.unitNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-brand-text dark:text-brand-dark-text">
                              Unit {unit.unitNumber} — {unit.title}
                            </h3>
                            {!hasSubjectAccess && (
                              <Lock size={12} className="text-brand-muted" />
                            )}
                          </div>
                          {unit.description && (
                            <p className="text-xs text-brand-muted line-clamp-1 mt-0.5">{unit.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-brand-muted">
                        <span className="hidden sm:inline-block">
                          {unitVideos.length} videos · {unitNotes.length} notes
                        </span>
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>

                    {/* Unit Items Accordion */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-brand-border dark:border-brand-dark-border divide-y divide-brand-border dark:divide-brand-dark-border bg-gray-50/50 dark:bg-white/[0.02]"
                        >
                          {totalItems === 0 ? (
                            <div className="p-4 text-center text-xs text-brand-muted">
                              Content for Unit {unit.unitNumber} is being processed.
                            </div>
                          ) : (
                            <>
                              {/* Video Lectures */}
                              {unitVideos.map((video, vIdx) => {
                                const canWatchVideo = hasSubjectAccess || video.isFreePreview

                                return (
                                  <div
                                    key={video.id}
                                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all group ${
                                      canWatchVideo
                                        ? 'hover:bg-primary-50/20 dark:hover:bg-primary-950/15'
                                        : 'hover:bg-gray-100/40 dark:hover:bg-white/[0.03] opacity-90'
                                    }`}
                                  >
                                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                                      {/* Lecture Video Thumbnail */}
                                      <div
                                        onClick={() => handlePlayVideo(video)}
                                        className="relative w-28 sm:w-36 md:w-40 aspect-video rounded-xl overflow-hidden bg-slate-900 border border-brand-border dark:border-white/10 flex-shrink-0 cursor-pointer shadow-xs group/thumb"
                                      >
                                        {video.thumbnailUrl ? (
                                          <img
                                            src={video.thumbnailUrl}
                                            alt={video.title}
                                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-black flex items-center justify-center">
                                            <Play size={22} className="text-white/30" />
                                          </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-black/10 transition-colors" />

                                        {/* Duration Badge */}
                                        {video.duration && (
                                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-mono font-semibold text-white flex items-center gap-1 shadow-xs">
                                            <Clock size={9} /> {video.duration}
                                          </span>
                                        )}

                                        {/* Free Preview Badge */}
                                        {video.isFreePreview && (
                                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500 text-[10px] font-bold text-white shadow-xs">
                                            Free Preview
                                          </span>
                                        )}

                                        {/* Play / Lock Hover Indicator */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-black/30">
                                          <div className="w-8 h-8 rounded-full bg-primary-500/90 text-white flex items-center justify-center shadow-md">
                                            {canWatchVideo ? <Play size={14} className="translate-x-0.5" /> : <Lock size={13} />}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Video Lecture Details */}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-brand-muted dark:text-brand-dark-muted">
                                            Lec #{vIdx + 1}
                                          </span>
                                          {video.level && (
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
                                              {video.level}
                                            </span>
                                          )}
                                        </div>

                                        <h4
                                          onClick={() => handlePlayVideo(video)}
                                          className="text-sm sm:text-base font-bold text-brand-text dark:text-brand-dark-text group-hover:text-primary-500 transition-colors line-clamp-1 cursor-pointer"
                                        >
                                          {video.title}
                                        </h4>

                                        {video.description && (
                                          <p className="text-xs text-brand-muted line-clamp-1 mt-0.5">
                                            {video.description}
                                          </p>
                                        )}

                                        {/* Instructor & Rating Row */}
                                        <div className="flex items-center gap-3 text-xs text-brand-muted dark:text-brand-dark-muted mt-2 flex-wrap">
                                          <span className="flex items-center gap-1">
                                            <Users size={12} className="text-brand-muted" />
                                            <span>{video.instructor || 'Skills021 Faculty'}</span>
                                          </span>

                                          <span className="flex items-center gap-1 font-semibold text-amber-500">
                                            <Star size={11} className="fill-amber-400 text-amber-400" />
                                            <span>{video.rating ?? 4.8}</span>
                                            <span className="text-brand-muted text-[11px] font-normal">
                                              ({video.reviews ?? 0} reviews)
                                            </span>
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action and Rating Menu Buttons */}
                                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0">
                                      <CourseRatingMenu
                                        courseId={String(video.courseId || video.id)}
                                        userId={user?.id ?? null}
                                        isEnrolled={canWatchVideo}
                                        onRated={(avg, count) => {
                                          video.rating = avg
                                          video.reviews = count
                                          setCurriculum(prev => ({ ...prev }))
                                        }}
                                      />

                                      {canWatchVideo ? (
                                        <button
                                          onClick={() => handlePlayVideo(video)}
                                          className="px-3.5 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                                        >
                                          <Play size={12} /> Watch Lecture
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handlePlayVideo(video)}
                                          className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-brand-muted text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                        >
                                          <Lock size={12} /> {resourceAccess.hasAccess ? 'Requires Subject Bundle' : 'Locked'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}

                              {/* Unit Notes / PDFs */}
                              {unitNotes.map((note) => {
                                const canDownload = hasResourceAccess

                                return (
                                  <div
                                    key={note.id}
                                    onClick={() => handleDownloadResource(note)}
                                    className={`p-3.5 sm:px-5 flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                                      canDownload
                                        ? 'hover:bg-primary-50/30 dark:hover:bg-primary-950/20'
                                        : 'hover:bg-gray-100/60 dark:hover:bg-white/5 opacity-85'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        canDownload
                                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                                          : 'bg-gray-200 dark:bg-white/10 text-brand-muted'
                                      }`}>
                                        <FileText size={14} />
                                      </div>

                                      <div className="min-w-0">
                                        <p className="text-xs sm:text-sm font-semibold text-brand-text dark:text-brand-dark-text truncate">
                                          {note.title}
                                        </p>
                                        <p className="text-[11px] text-brand-muted flex items-center gap-1 mt-0.5">
                                          <span>{note.typeName}</span>
                                          {note.downloads > 0 && <span>· {note.downloads} downloads</span>}
                                        </p>
                                      </div>
                                    </div>

                                    <div>
                                      {canDownload ? (
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                          <Download size={12} /> Download
                                        </span>
                                      ) : (
                                        <span className="text-[11px] font-semibold text-brand-muted flex items-center gap-1">
                                          <Lock size={12} /> Locked
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}

          {/* General Subject Resources */}
          {curriculum.resources.filter(r => !r.unitId).length > 0 && (
            <div className="mt-8 card p-5 border border-brand-border dark:border-brand-dark-border">
              <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text mb-3 flex items-center gap-2">
                <FileText size={16} className="text-primary-500" />
                Additional Subject Resources & Formula Sheets
              </h3>
              <div className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {curriculum.resources.filter(r => !r.unitId).map(res => {
                  const canDownload = hasResourceAccess
                  return (
                    <div
                      key={res.id}
                      onClick={() => handleDownloadResource(res)}
                      className="py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/5 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={15} className="text-brand-muted" />
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-brand-text dark:text-brand-dark-text">{res.title}</p>
                          <p className="text-[10px] text-brand-muted">{res.typeName}</p>
                        </div>
                      </div>
                      <div>
                        {canDownload ? (
                          <span className="text-xs font-bold text-primary-500 flex items-center gap-1">
                            <Download size={13} /> Download
                          </span>
                        ) : (
                          <span className="text-[11px] text-brand-muted flex items-center gap-1">
                            <Lock size={11} /> Locked
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Player Modal — Full Chapters, Discussion, Notes & Rating */}
      {activeCourseVideo && (
        <VideoPlayerModal
          course={activeCourseVideo}
          userId={user?.id ?? ''}
          userName={user?.name ?? 'Student'}
          isAdmin={isAdmin}
          canWatch={Boolean(hasSubjectAccess || activeVideo?.isFreePreview)}
          onClose={() => setActiveVideo(null)}
        />
      )}

      {/* Unified Bundle Checkout & UPI Proof Modal */}
      {checkoutTarget && (
        <BundleCheckoutModal
          bundleType={checkoutTarget.bundleType}
          planType={checkoutTarget.planType}
          bundle={checkoutTarget.bundle}
          userId={user?.id ?? ''}
          defaultName={user?.name}
          defaultEmail={user?.email}
          onClose={() => setCheckoutTarget(null)}
          onSuccess={() => {
            setCheckoutTarget(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}

// ─── Modal: Unified Bundle Checkout with Manual UPI & Coupon Integration ───

interface BundleCheckoutModalProps {
  bundleType: 'subject_bundle' | 'resource_bundle'
  planType: 'six_month' | 'lifetime'
  bundle: SubjectBundle | ResourceBundle
  userId: string
  defaultName?: string
  defaultEmail?: string
  onClose: () => void
  onSuccess: () => void
}

function BundleCheckoutModal({
  bundleType,
  planType,
  bundle,
  userId,
  defaultName,
  defaultEmail,
  onClose,
  onSuccess,
}: BundleCheckoutModalProps) {
  const [step, setStep] = useState<'details' | 'payment' | 'submitted'>('details')
  const [firstName, setFirstName] = useState(defaultName?.split(' ')[0] || '')
  const [lastName, setLastName] = useState(defaultName?.split(' ').slice(1).join(' ') || '')
  const [email, setEmail] = useState(defaultEmail || '')
  const [phone, setPhone] = useState('')

  // UPI payment fields
  const [utrNumber, setUtrNumber] = useState('')
  const [screenshotBase64, setScreenshotBase64] = useState('')
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    upiId: 'skills021@upi',
    upiName: 'Skills021',
    qrCodeUrl: '',
  })

  // Coupon state
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  const basePrice = planType === 'lifetime' ? bundle.lifetimePrice : bundle.sixMonthPrice
  const [pricing, setPricing] = useState<CheckoutPricing>({
    originalPrice: basePrice,
    productDiscountAmount: 0,
    couponDiscountAmount: 0,
    couponCode: null,
    finalAmount: basePrice,
    isFree: basePrice === 0,
    discountId: null,
    couponId: null,
    isLoading: true,
    error: null,
  })

  const pricingFetchRef = useRef(0)

  // Fetch authoritative pricing from calculate_checkout_price RPC
  const loadPricing = async (code?: string | null) => {
    const token = ++pricingFetchRef.current
    try {
      const breakdown = await fetchCheckoutPrice(
        bundleType,
        `${bundle.id}:${planType}`,
        code,
        userId || null
      )
      if (token !== pricingFetchRef.current) return

      const p = toCheckoutPricing(breakdown)
      if (code && p.couponError) {
        setCouponError(p.couponError)
        const fallback = await fetchCheckoutPrice(bundleType, `${bundle.id}:${planType}`, null, userId || null)
        if (token !== pricingFetchRef.current) return
        setPricing({ ...toCheckoutPricing(fallback), isLoading: false })
      } else {
        setCouponError(null)
        setPricing({ ...p, isLoading: false })
      }
    } catch {
      if (token !== pricingFetchRef.current) return
      setPricing(prev => ({ ...prev, isLoading: false }))
    }
  }

  useEffect(() => {
    getPaymentSettings().then((s) => { if (s) setPaymentSettings(s) })
    loadPricing(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle.id, planType, bundleType])

  const handleApplyCoupon = async () => {
    const code = couponInput.trim()
    if (!code) { setCouponError('Please enter a coupon code.'); return }
    setCouponLoading(true)
    setCouponError(null)
    try {
      await loadPricing(code)
      const res = await fetchCheckoutPrice(bundleType, `${bundle.id}:${planType}`, code, userId || null)
      const cp = toCheckoutPricing(res)
      if (cp.couponError) {
        setCouponError(cp.couponError)
        setAppliedCoupon(null)
      } else if (cp.couponCode) {
        setAppliedCoupon(cp.couponCode)
        setPricing({ ...cp, isLoading: false })
        toast.success(`Coupon "${cp.couponCode}" applied! 🎉`)
      }
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError(null)
    loadPricing(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, or WEBP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setScreenshotBase64(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleDetailsNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      toast.error('Please fill in all contact information')
      return
    }
    setStep('payment')
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUtr = utrNumber.trim()
    if (!trimmedUtr || trimmedUtr.length < 6) {
      toast.error('Please enter a valid 12-digit UTR or Reference Number')
      return
    }
    if (!screenshotBase64) {
      toast.error('Please upload your payment screenshot proof')
      return
    }

    setSubmitting(true)
    try {
      // Fetch latest server confirmed price
      const finalCalc = await fetchCheckoutPrice(bundleType, `${bundle.id}:${planType}`, appliedCoupon, userId || null)

      if (bundleType === 'subject_bundle') {
        await submitSubjectBundlePaymentProof({
          userId,
          bundleId: bundle.id,
          subjectId: bundle.subjectId,
          subjectTitle: bundle.subjectName || `Subject #${bundle.subjectId}`,
          planType,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          amount: finalCalc.finalAmount,
          utrNumber: trimmedUtr,
          screenshotUrl: screenshotBase64,
          originalAmount: finalCalc.originalPrice,
          productDiscountAmount: finalCalc.productDiscountAmount,
          couponCode: finalCalc.couponCode,
          couponDiscountAmount: finalCalc.couponDiscountAmount,
          appliedDiscountId: finalCalc.discountId,
          appliedCouponId: finalCalc.couponId,
        })
      } else {
        await submitResourceBundlePaymentProof({
          userId,
          bundleId: bundle.id,
          subjectId: bundle.subjectId,
          planType,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          utrNumber: trimmedUtr,
          screenshotUrl: screenshotBase64,
          originalAmount: finalCalc.originalPrice,
          productDiscountAmount: finalCalc.productDiscountAmount,
          couponCode: finalCalc.couponCode,
          couponDiscountAmount: finalCalc.couponDiscountAmount,
          finalAmount: finalCalc.finalAmount,
          discountId: finalCalc.discountId,
          couponId: finalCalc.couponId,
        })
      }

      toast.success('Payment proof submitted for verification! ⏳')
      setStep('submitted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit payment verification')
    } finally {
      setSubmitting(false)
    }
  }

  const activeUpiId = paymentSettings.upiId || 'skills021@upi'
  const activePayee = paymentSettings.upiName || 'Skills021'
  const payableAmount = pricing.isLoading ? basePrice : pricing.finalAmount
  const bundleTypeName = bundleType === 'subject_bundle' ? 'Subject Bundle' : 'Resource Bundle'
  const upiIntent = `upi://pay?pa=${activeUpiId}&pn=${encodeURIComponent(activePayee)}&am=${payableAmount}&cu=INR&tn=${encodeURIComponent(`Skills021 ${bundleTypeName} - ${bundle.subjectName || ''}`)}`
  const qrDisplay = paymentSettings.qrCodeUrl?.trim() || `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiIntent)}&size=240x240&margin=10`

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col overflow-hidden relative"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border dark:border-brand-dark-border flex-shrink-0 bg-white dark:bg-brand-dark-card z-10">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-500">
                {planType === 'lifetime' ? 'Lifetime Access' : '6 Months Access'}
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                bundleType === 'subject_bundle'
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400'
                  : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
              }`}>
                {bundleType === 'subject_bundle' ? 'Complete Bundle' : 'Notes Only'}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-brand-text dark:text-brand-dark-text line-clamp-1">
              {bundle.title || bundle.subjectName || `${bundleTypeName} Checkout`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1">
          {/* Step 1: Contact Details */}
          {step === 'details' && (
            <form onSubmit={handleDetailsNext} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-text dark:text-brand-dark-text mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-text dark:text-brand-dark-text mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-text dark:text-brand-dark-text mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-text dark:text-brand-dark-text mb-1">WhatsApp / Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Inclusions summary */}
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border text-xs space-y-1.5">
                <p className="font-semibold text-brand-text dark:text-brand-dark-text">Included in this plan:</p>
                <p className="text-brand-muted">
                  {bundleType === 'subject_bundle'
                    ? '✓ All syllabus units, full-length video lectures, downloadable PDFs & learning resources.'
                    : '✓ All chapter notes, cheat sheets & solved question PDFs. (Videos not included).'
                  }
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm transition-colors shadow-xs cursor-pointer"
              >
                Continue to Payment (₹{basePrice})
              </button>
            </form>
          )}

          {/* Step 2: Payment and UPI Verification */}
          {step === 'payment' && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              {/* Price breakdown */}
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border space-y-1.5">
                <div className="flex justify-between text-xs text-brand-muted">
                  <span>Base Bundle Price</span>
                  <span>₹{pricing.originalPrice}</span>
                </div>
                {pricing.productDiscountAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                    <span>Bundle Discount</span>
                    <span>-₹{pricing.productDiscountAmount}</span>
                  </div>
                )}
                {pricing.couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                    <span>Coupon ({appliedCoupon})</span>
                    <span>-₹{pricing.couponDiscountAmount}</span>
                  </div>
                )}
                <div className="border-t border-brand-border/60 dark:border-brand-dark-border/60 pt-1.5 flex justify-between text-sm font-bold text-brand-text dark:text-brand-dark-text">
                  <span>Total Payable</span>
                  <span className="text-primary-600 dark:text-primary-400 font-black text-base">₹{pricing.finalAmount}</span>
                </div>
              </div>

              {/* Coupon input */}
              <div>
                <label className="block text-xs font-semibold text-brand-text dark:text-brand-dark-text mb-1">
                  Have a Coupon Code?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. SKILLS150"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    disabled={Boolean(appliedCoupon)}
                    className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg focus:ring-1 focus:ring-primary-500"
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-rose-500 border border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                      className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      {couponLoading ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
                    </button>
                  )}
                </div>
                {couponError && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">{couponError}</p>
                )}
              </div>

              {/* Compact UPI QR and Pay Details Box */}
              <div className="p-4 rounded-2xl border border-primary-100 dark:border-primary-900/40 bg-gradient-to-br from-primary-50/20 via-white to-amber-50/15 dark:from-primary-950/20 dark:via-brand-dark-card dark:to-brand-dark-card">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* QR Code */}
                  <div className="relative p-2 bg-white rounded-xl shadow-xs border border-gray-200 dark:border-white/10 flex-shrink-0">
                    <img
                      src={qrDisplay}
                      alt="UPI QR Code"
                      className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                    />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary-600 text-[9px] font-black text-white uppercase tracking-wider shadow-xs whitespace-nowrap">
                      Scan to Pay
                    </div>
                  </div>

                  {/* UPI Details */}
                  <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                        Pay with Any UPI App
                      </span>
                      <p className="text-xs text-brand-muted dark:text-brand-dark-muted">
                        Google Pay, PhonePe, Paytm, or BHIM
                      </p>
                    </div>

                    {/* UPI ID Copy Pill */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-black/30 border border-brand-border dark:border-brand-dark-border max-w-full">
                      <span className="font-mono text-xs font-bold text-brand-text dark:text-brand-dark-text truncate">
                        {activeUpiId}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(activeUpiId)
                          setCopiedUpi(true)
                          toast.success('UPI ID copied!')
                          setTimeout(() => setCopiedUpi(false), 2000)
                        }}
                        className="p-1 rounded text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer flex-shrink-0"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>

                    {/* Amount to pay reminder & Direct app link */}
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-0.5">
                      <span className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">
                        Amount: <span className="text-primary-600 dark:text-primary-400 font-bold">₹{payableAmount}</span>
                      </span>
                      <a
                        href={upiIntent}
                        className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-0.5 ml-1"
                      >
                        Open App <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Inputs */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-brand-text dark:text-brand-dark-text">
                      12-Digit UTR / Transaction Reference Number *
                    </label>
                    <span className="text-[10px] text-brand-muted font-mono">From UPI receipt</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="e.g. 425109283741"
                    value={utrNumber}
                    onChange={e => setUtrNumber(e.target.value.replace(/\s+/g, ''))}
                    className="w-full px-3.5 py-2.5 text-sm font-mono tracking-wider rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-text dark:text-brand-dark-text mb-1">
                    Upload Payment Screenshot *
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-brand-border dark:border-brand-dark-border hover:border-primary-500 dark:hover:border-primary-500 bg-gray-50/50 dark:bg-white/5 cursor-pointer transition-colors text-xs font-medium text-brand-muted hover:text-brand-text dark:hover:text-white">
                      <Upload size={15} className="text-primary-500" />
                      <span>{screenshotBase64 ? 'Change Screenshot' : 'Upload Receipt Screenshot (PNG, JPG)'}</span>
                      <input
                        type="file"
                        required={!screenshotBase64}
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    {screenshotBase64 && (
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-brand-border flex-shrink-0 shadow-xs group">
                        <img src={screenshotBase64} alt="Proof preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setScreenshotBase64('')}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove screenshot"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="w-1/3 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-semibold text-brand-muted transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  Submit Verification Proof
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Submitted Confirmation */}
          {step === 'submitted' && (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">
                Payment Submitted for Verification!
              </h3>
              <p className="text-xs text-brand-muted dark:text-brand-dark-muted leading-relaxed max-w-sm mx-auto">
                Your transaction details (UTR: <span className="font-mono font-bold text-brand-text dark:text-white">{utrNumber}</span>) have been sent to our administrator team.
                Your {bundleTypeName.toLowerCase()} will unlock automatically upon verification.
              </p>
              <button
                type="button"
                onClick={onSuccess}
                className="px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Done & Return to Subject
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
