import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import {
  FileText, Download, Bookmark, Share2, Lock, Search,
  Clock, BookOpen, ChevronDown, Eye, Loader2, Archive, Compass,
  Sparkles, ArrowRight, SlidersHorizontal, X, CheckCircle2, Package,
  ExternalLink, ShieldCheck
} from 'lucide-react'
import type { Resource } from '../store/contentStore'
import {
  fetchPublishedResources,
  incrementDownloadCount,
  triggerResourceDownload,
  fetchColleges,
  fetchCourses,
  fetchBranches,
  fetchSemesters,
  fetchSubjects,
  type College,
  type Course as DBCourse,
  type Branch,
  type Semester,
  type Subject
} from '../lib/resourceService'
import {
  fetchPublishedResourceBundles,
  fetchResourceBundleItems
} from '../lib/resourceBundleService'
import type {
  ResourceBundle,
  ResourceBundleItem
} from '../lib/resourceBundleTypes'
import toast from 'react-hot-toast'
import ConfirmDownloadDialog from '../components/ConfirmDownloadDialog'
import EnrollModal from '../components/EnrollModal'
import { useAuthStore } from '../store/authStore'
import PanelSpotlightCard from '../components/PanelSpotlightCard'
import { supabase } from '../lib/supabase'
import { fetchUserEntitlements } from '../lib/bundleAuthorizationService'

interface ResourceBundleCardProps {
  bundle: ResourceBundle
  isUnlocked: boolean
  onOpen: (bundle: ResourceBundle) => void
}

function ResourceBundleCard({ bundle, isUnlocked, onOpen }: ResourceBundleCardProps) {
  return (
    <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-5 sm:p-6 relative group hover:shadow-card-hover transition-all flex flex-col justify-between">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="px-2.5 py-1 text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-100 dark:border-amber-900/40">
            {bundle.subjectCode ? bundle.subjectCode : 'Notes Bundle'}
          </span>
          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${isUnlocked ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20'}`}>
            {isUnlocked ? '✓ Unlocked' : 'Resource Bundle'}
          </span>
        </div>

        <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-2 group-hover:text-primary-500 transition-colors">
          {bundle.title || `${bundle.subjectName} Notes Bundle`}
        </h3>

        <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-4 line-clamp-2">
          {bundle.description || 'Access all lecture notes, handwritten summaries, and previous papers in one package.'}
        </p>

        {/* Academic Meta */}
        {(bundle.courseName || bundle.branchName || bundle.semesterNumber) && (
          <div className="text-[11px] text-brand-muted dark:text-brand-dark-muted mb-4 flex flex-wrap gap-2">
            {[bundle.courseName, bundle.branchName, bundle.semesterNumber ? `Semester ${bundle.semesterNumber}` : null].filter(Boolean).map((t, idx) => (
              <span key={idx} className="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-brand-dark-border">
        {/* Pricing tag */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-brand-muted dark:text-brand-dark-muted">Bundle Options</span>
          <div className="text-right">
            <span className="text-sm font-black text-brand-text dark:text-brand-dark-text">
              ₹{bundle.sixMonthPrice}
            </span>
            <span className="text-[10px] text-brand-muted dark:text-brand-dark-muted ml-1 font-normal">/ 6 mo</span>
            <span className="mx-1.5 text-gray-300 dark:text-gray-700">·</span>
            <span className="text-sm font-black text-amber-500">
              ₹{bundle.lifetimePrice}
            </span>
            <span className="text-[10px] text-amber-500/80 ml-1 font-normal">/ life</span>
          </div>
        </div>

        <button
          onClick={() => onOpen(bundle)}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isUnlocked
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-[#0A0A0A] dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100'
          }`}
        >
          <Package size={14} /> {isUnlocked ? 'Browse Notes Bundle' : 'View Bundle Notes'}
        </button>

        {!isUnlocked && (
          <Link
            to={`/courses/bundles/${bundle.subjectId}?from=resources`}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-center border border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles size={12} /> View Learning Plans & Bundles
          </Link>
        )}
      </div>
    </div>
  )
}

const RESOURCE_TYPES: { label: string; icon: typeof FileText }[] = [
  { label: 'Notes', icon: FileText },
  { label: 'Roadmaps', icon: BookOpen },
  { label: 'Previous Year Papers', icon: FileText },
  { label: 'E-Books', icon: BookOpen },
  { label: 'Cheat Sheets', icon: FileText },
  { label: 'Interview Questions', icon: FileText },
  { label: 'Practice Sheets', icon: FileText },
  { label: 'Formula Sheets', icon: FileText },
  { label: 'Coding Resources', icon: BookOpen },
  { label: 'Career Resources', icon: BookOpen },
]

function ResourceCard({
  resource,
  onDownload,
  onUnlock,
  isSubjectUnlocked,
  isResourceBundleUnlocked,
  isEnrolled,
  isPendingVerification,
}: {
  resource: Resource
  onDownload: (resource: Resource) => void
  onUnlock?: (resource: Resource) => void
  isSubjectUnlocked?: boolean
  isResourceBundleUnlocked?: boolean
  isEnrolled?: boolean
  isPendingVerification?: boolean
}) {
  const [bookmarked, setBookmarked] = useState(false)
  const { user } = useAuthStore()
  const isBundle = Boolean(resource.isBundleOnly)
  const isFree = !resource.isPremium || !resource.price || resource.price === 0
  const isSubjectBundleUnlocked = Boolean(isBundle && isSubjectUnlocked)
  const hasAccess =
    (!isBundle && isFree) ||
    Boolean(user?.isPremium) ||
    user?.role === 'admin' ||
    Boolean(isEnrolled) ||
    isSubjectBundleUnlocked ||
    Boolean(isResourceBundleUnlocked)

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => toast.success('Link copied to clipboard!'))
  }

  const getFileStyle = (downloadUrl?: string) => {
    const ext = downloadUrl?.split('.').pop()?.toLowerCase() || ''
    if (ext === 'pdf') {
      return {
        icon: FileText,
        color: 'text-red-500 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30'
      }
    }
    if (ext === 'doc' || ext === 'docx') {
      return {
        icon: FileText,
        color: 'text-blue-500 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30'
      }
    }
    if (ext === 'ppt' || ext === 'pptx') {
      return {
        icon: FileText,
        color: 'text-orange-500 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30'
      }
    }
    if (ext === 'zip' || ext === 'rar') {
      return {
        icon: Archive,
        color: 'text-amber-500 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30'
      }
    }
    return {
      icon: FileText,
      color: 'text-brand-muted dark:text-brand-dark-muted',
      bg: 'bg-gray-100 dark:bg-white/10 border-gray-200 dark:border-white/5'
    }
  }

  const { icon: FileIcon, color: iconColor, bg: iconBg } = getFileStyle(resource.downloadUrl)

  return (
    <div
      className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-5 relative group"
    >
      {(resource.isPremium || isBundle) && (
        <div className="absolute top-0 right-0 bg-[#0A0A0A] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
          {user?.isPremium
            ? 'PREMIUM UNLOCKED'
            : isSubjectBundleUnlocked
              ? 'SUBJECT UNLOCKED'
              : isResourceBundleUnlocked
                ? 'BUNDLE UNLOCKED'
                : isEnrolled
                  ? 'ENROLLED'
                  : isPendingVerification
                    ? 'PENDING REVIEW'
                    : isBundle
                      ? 'BUNDLE ONLY'
                      : `₹${resource.price || 0}`}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`fx-resource-icon flex w-12 h-12 rounded-xl items-center justify-center flex-shrink-0 border ${iconBg}`}>
          <FileIcon size={22} className={iconColor} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold text-brand-muted dark:text-brand-dark-muted bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
            {resource.type}
          </span>
          <h3 className="text-[14px] font-bold text-brand-text dark:text-brand-dark-text mt-1 leading-snug line-clamp-2 group-hover:text-primary-500 transition-colors">
            {resource.title}
          </h3>
        </div>
      </div>

      <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-3 line-clamp-2 leading-relaxed">
        {resource.description}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-3 text-[11px] text-brand-muted dark:text-brand-dark-muted mb-4 flex-wrap">
        <span className="flex items-center gap-1"><BookOpen size={11} />{resource.author}</span>
        <span className="flex items-center gap-1"><Clock size={11} />Updated {resource.lastUpdated}</span>
        <span className="flex items-center gap-1"><Download size={11} />{(resource.downloads ?? 0).toLocaleString()}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {hasAccess ? (
          <button
            onClick={() => onDownload(resource)}
            className="dynamic-button flex-1 flex items-center justify-center gap-2 py-2 bg-[#0A0A0A] dark:bg-white text-white dark:text-black rounded-xl text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100"
          >
            <Download size={13} />{' '}
            {resource.isPremium || isBundle
              ? isSubjectBundleUnlocked
                ? 'Download (Subject Bundle)'
                : isResourceBundleUnlocked
                  ? 'Download (Resource Bundle)'
                  : isEnrolled
                    ? 'Download (Purchased)'
                    : 'Download'
              : 'Download Free'}
          </button>
        ) : isPendingVerification ? (
          <button
            disabled
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold cursor-not-allowed"
          >
            <Clock size={13} /> Verification Pending
          </button>
        ) : isBundle ? (
          <Link
            to={resource.subjectId ? `/courses/bundles/${resource.subjectId}?from=resources` : '/courses'}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#0A0A0A] text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors"
          >
            <Lock size={13} /> Unlock via Bundle
          </Link>
        ) : (
          <button
            onClick={() => onUnlock?.(resource)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary-500 text-white rounded-xl text-xs font-semibold hover:bg-primary-600 transition-colors shadow-sm shadow-primary-500/20"
          >
            <Lock size={13} /> Unlock Resource · ₹{resource.price || 0}
          </button>
        )}
        <button
          onClick={() => setBookmarked(!bookmarked)}
          className={`w-9 h-9 rounded-xl border transition-colors flex items-center justify-center ${bookmarked ? 'bg-[#0A0A0A] border-[#0A0A0A] text-white' : 'border-gray-200 dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted hover:border-gray-400'}`}
        >
          <Bookmark size={14} className={bookmarked ? 'fill-current' : ''} />
        </button>
        <button
          onClick={handleShare}
          className="w-9 h-9 rounded-xl border border-gray-200 dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted hover:border-gray-400 transition-colors flex items-center justify-center"
        >
          <Share2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function Resources() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initType = searchParams.get('type')

  const { user } = useAuthStore()
  const [resourceSection, setResourceSection] = useState<'bundles' | 'resources'>('bundles')
  const [resourceBundles, setResourceBundles] = useState<ResourceBundle[]>([])
  const [loadingBundles, setLoadingBundles] = useState(true)
  const [selectedBundle, setSelectedBundle] = useState<ResourceBundle | null>(null)
  const [bundleItems, setBundleItems] = useState<ResourceBundleItem[]>([])
  const [loadingBundleItems, setLoadingBundleItems] = useState(false)

  const [unlockedSubjectIds, setUnlockedSubjectIds] = useState<Set<number>>(new Set())
  const [unlockedResourceSubjectIds, setUnlockedResourceSubjectIds] = useState<Set<number>>(new Set())
  const [unlockedResourceItemIds, setUnlockedResourceItemIds] = useState<Set<number>>(new Set())
  const [enrolledResourceIds, setEnrolledResourceIds] = useState<Set<number>>(new Set())
  const [pendingResourceIds, setPendingResourceIds] = useState<Set<number>>(new Set())
  const [enrollResource, setEnrollResource] = useState<Resource | null>(null)

  useEffect(() => {
    if (!user?.id) {
      setUnlockedSubjectIds(new Set())
      setUnlockedResourceSubjectIds(new Set())
      setUnlockedResourceItemIds(new Set())
      setEnrolledResourceIds(new Set())
      setPendingResourceIds(new Set())
      return
    }
    fetchUserEntitlements(user.id).then((ent) => {
      setUnlockedSubjectIds(ent.subjectBundleSubjectIds)
      setUnlockedResourceSubjectIds(ent.resourceBundleSubjectIds)
      setUnlockedResourceItemIds(ent.resourceBundleItemIds)
      setEnrolledResourceIds(ent.enrolledResourceIds)
      setPendingResourceIds(ent.pendingResourceIds)
    })
  }, [user?.id])

  const handleUnlockResource = (r: Resource) => {
    if (!user) {
      toast.error('Please log in to unlock this resource')
      navigate('/login')
      return
    }
    setEnrollResource(r)
  }

  useEffect(() => {
    const loadBundles = async () => {
      try {
        setLoadingBundles(true)
        const data = await fetchPublishedResourceBundles()
        setResourceBundles(data)
      } catch (err) {
        console.error('Failed to load resource bundles:', err)
      } finally {
        setLoadingBundles(false)
      }
    }
    loadBundles()
  }, [])

  const isBundleUnlocked = useCallback((b: ResourceBundle) => {
    return (
      Boolean(user?.isPremium) ||
      user?.role === 'admin' ||
      unlockedSubjectIds.has(b.subjectId) ||
      unlockedResourceSubjectIds.has(b.subjectId)
    )
  }, [user?.isPremium, user?.role, unlockedSubjectIds, unlockedResourceSubjectIds])

  const handleOpenBundle = async (b: ResourceBundle) => {
    setSelectedBundle(b)
    setLoadingBundleItems(true)
    try {
      const items = await fetchResourceBundleItems(b.id)
      setBundleItems(items)
    } catch (err) {
      console.error('Error fetching bundle items:', err)
      toast.error('Could not load bundle materials')
    } finally {
      setLoadingBundleItems(false)
    }
  }

  const [resources, setResources] = useState<Resource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeType, setActiveType] = useState<string | null>(initType)
  const [search, setSearch] = useState('')
  const [showPremium, setShowPremium] = useState<'all' | 'free' | 'premium'>('all')
  const [showMobileFilter, setShowMobileFilter] = useState(false)

  // ─── Academic Hierarchy States ──────────────────────────────────────────
  const [colleges, setColleges] = useState<College[]>([])
  const [courses, setCourses] = useState<DBCourse[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [subjects, setSubjectOptions] = useState<Subject[]>([])

  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)

  const [activeDropdown, setActiveDropdown] = useState<'college' | 'course' | 'branch' | 'semester' | 'subject' | null>(null)
  const [loadingLevels, setLoadingLevels] = useState<Record<string, boolean>>({})

  // ─── Download dialog state ──────────────────────────────────────────────
  const [dialogResource, setDialogResource] = useState<Resource | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  // ─── Fetch resources from Supabase on mount ─────────────────────────────
  useEffect(() => {
    const loadResources = async () => {
      try {
        setIsLoading(true)
        const data = await fetchPublishedResources()
        setResources(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load resources'
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadResources()
  }, [])

  // ─── Fetch colleges on mount ────────────────────────────────────────────
  useEffect(() => {
    const loadColleges = async () => {
      try {
        setLoadingLevels(prev => ({ ...prev, college: true }))
        const data = await fetchColleges()
        setColleges(data)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load colleges')
      } finally {
        setLoadingLevels(prev => ({ ...prev, college: false }))
      }
    }
    loadColleges()
  }, [])

  // ─── Hierarchy selection handlers ─────────────────────────────────────────
  const handleCollegeSelect = async (collegeId: number) => {
    setSelectedCollegeId(collegeId)
    setSelectedCourseId(null)
    setSelectedBranchId(null)
    setSelectedSemesterId(null)
    setSelectedSubjectId(null)
    setCourses([])
    setBranches([])
    setSemesters([])
    setSubjectOptions([])

    try {
      setLoadingLevels(prev => ({ ...prev, course: true }))
      const data = await fetchCourses(collegeId)
      setCourses(data)
      setActiveDropdown('course')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load courses')
    } finally {
      setLoadingLevels(prev => ({ ...prev, course: false }))
    }
  }

  const handleCourseSelect = async (courseId: number) => {
    setSelectedCourseId(courseId)
    setSelectedBranchId(null)
    setSelectedSemesterId(null)
    setSelectedSubjectId(null)
    setBranches([])
    setSemesters([])
    setSubjectOptions([])

    try {
      setLoadingLevels(prev => ({ ...prev, branch: true }))
      const data = await fetchBranches(courseId)
      setBranches(data)
      setActiveDropdown('branch')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load branches')
    } finally {
      setLoadingLevels(prev => ({ ...prev, branch: false }))
    }
  }

  const handleBranchSelect = async (branchId: number) => {
    setSelectedBranchId(branchId)
    setSelectedSemesterId(null)
    setSelectedSubjectId(null)
    setSemesters([])
    setSubjectOptions([])

    try {
      setLoadingLevels(prev => ({ ...prev, semester: true }))
      const data = await fetchSemesters(branchId)
      setSemesters(data)
      setActiveDropdown('semester')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load semesters')
    } finally {
      setLoadingLevels(prev => ({ ...prev, semester: false }))
    }
  }

  const handleSemesterSelect = async (semesterId: number) => {
    setSelectedSemesterId(semesterId)
    setSelectedSubjectId(null)
    setSubjectOptions([])

    try {
      setLoadingLevels(prev => ({ ...prev, subject: true }))
      const data = await fetchSubjects(semesterId)
      setSubjectOptions(data)
      setActiveDropdown('subject')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load subjects')
    } finally {
      setLoadingLevels(prev => ({ ...prev, subject: false }))
    }
  }

  const handleSubjectSelect = (subjectId: number) => {
    setSelectedSubjectId(subjectId)
    setActiveDropdown(null)
  }

  const handleResetHierarchy = () => {
    setSelectedCollegeId(null)
    setSelectedCourseId(null)
    setSelectedBranchId(null)
    setSelectedSemesterId(null)
    setSelectedSubjectId(null)
    setCourses([])
    setBranches([])
    setSemesters([])
    setSubjectOptions([])
    setActiveDropdown(null)
  }

  const handleDownload = useCallback((resource: Resource) => {
    const isBundleItem = Boolean(resource.isBundleOnly)
    const isFree = !resource.isPremium || !resource.price || resource.price === 0
    if (resource.isPremium || isBundleItem) {
      const isSubjectUnlocked = isBundleItem && resource.subjectId ? unlockedSubjectIds.has(resource.subjectId) : false
      const isResourceBundleUnlocked = unlockedResourceItemIds.has(Number(resource.id))
      const isEnrolled = enrolledResourceIds.has(Number(resource.id))
      const canAccess =
        (!isBundleItem && isFree) ||
        Boolean(user?.isPremium) ||
        user?.role === 'admin' ||
        isEnrolled ||
        isSubjectUnlocked ||
        isResourceBundleUnlocked
      if (!canAccess) {
        if (isBundleItem) {
          toast.error('This resource belongs to a Subject Bundle. Please purchase the bundle to access.')
        } else {
          toast.error('This is a paid resource. Please unlock it to download.')
        }
        return
      }
    }
    setDialogResource(resource)
  }, [unlockedSubjectIds, unlockedResourceItemIds, enrolledResourceIds, user?.isPremium, user?.role])

  // ─── Cancel dialog ──────────────────────────────────────────────────────
  const handleCancelDialog = useCallback(() => {
    if (isDownloading) return
    setDialogResource(null)
  }, [isDownloading])

  // ─── Confirmed download ─────────────────────────────────────────────────
  const handleConfirmDownload = useCallback(async () => {
    if (!dialogResource || isDownloading) return

    if (!dialogResource.downloadUrl) {
      toast.error('Download file is not available.')
      console.error('[Download] file_url is empty or null for resource:', dialogResource.id)
      setDialogResource(null)
      return
    }

    setIsDownloading(true)
    const { id, title, downloadUrl, downloads: currentCount } = dialogResource
    console.log(`[Download] Starting download for "${title}" (${id})`)

    try {
      await triggerResourceDownload(downloadUrl, title)
      setDialogResource(null)
      setResources((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, downloads: r.downloads + 1 } : r
        )
      )
      toast.success(`Downloading: ${title}`)

      try {
        await incrementDownloadCount(id, currentCount)
        console.log(`[Download] Download count updated for "${title}"`)
      } catch (dbErr) {
        console.error('[Download] Failed to update download count:', dbErr)
        setResources((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, downloads: r.downloads - 1 } : r
          )
        )
        const message = dbErr instanceof Error ? dbErr.message : 'Failed to update download count'
        toast.error(message)
      }
    } catch (err) {
      console.error('[Download] Download failed:', err)
      const message = err instanceof Error ? err.message : 'Download failed. Please try again.'
      toast.error(message)
      setDialogResource(null)
    } finally {
      setIsDownloading(false)
    }
  }, [dialogResource, isDownloading])

  // ─── Filtering ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return resources.filter(r => {
      // Only individual resources are displayed in 'All Individual Materials' —
      // materials uploaded 'Under Bundle' are curriculum notes found inside bundles
      if (r.isBundleOnly) return false

      if (activeType && r.type !== activeType) return false
      
      // Normalized schema filters using joins
      if (selectedSubjectId && r.subjectId !== selectedSubjectId) return false
      if (selectedSemesterId && r.semesterId !== selectedSemesterId) return false
      if (selectedBranchId && r.branchId !== selectedBranchId) return false
      if (selectedCourseId && r.courseId !== selectedCourseId) return false
      if (selectedCollegeId && r.collegeId !== selectedCollegeId) return false

      if (showPremium === 'free' && r.isPremium) return false
      if (showPremium === 'premium' && !r.isPremium) return false
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [resources, activeType, selectedCollegeId, selectedCourseId, selectedBranchId, selectedSemesterId, selectedSubjectId, search, showPremium])

  const individualResourcesCount = useMemo(() => {
    return resources.filter(r => !r.isBundleOnly).length
  }, [resources])

  const filteredResourceBundles = useMemo(() => {
    return resourceBundles.filter(b => {
      if (selectedSubjectId && b.subjectId !== selectedSubjectId) return false
      if (selectedSemesterId && b.semesterNumber !== undefined) {
        const semObj = semesters.find(s => s.id === selectedSemesterId)
        if (semObj && b.semesterNumber !== semObj.semester_number) return false
      }
      if (search) {
        const q = search.toLowerCase()
        const title = (b.title || '').toLowerCase()
        const subjName = (b.subjectName || '').toLowerCase()
        const subjCode = (b.subjectCode || '').toLowerCase()
        const course = (b.courseName || '').toLowerCase()
        const branch = (b.branchName || '').toLowerCase()
        if (!title.includes(q) && !subjName.includes(q) && !subjCode.includes(q) && !course.includes(q) && !branch.includes(q)) return false
      }
      return true
    })
  }, [resourceBundles, selectedSubjectId, selectedSemesterId, semesters, search])

  const activeLevelName = useMemo(() => {
    if (selectedSubjectId) {
      return subjects.find(s => s.id === selectedSubjectId)?.name
    }
    if (selectedSemesterId) {
      return `Semester ${semesters.find(s => s.id === selectedSemesterId)?.semester_number}`
    }
    if (selectedBranchId) {
      return branches.find(b => b.id === selectedBranchId)?.name
    }
    if (selectedCourseId) {
      return courses.find(c => c.id === selectedCourseId)?.name
    }
    if (selectedCollegeId) {
      return colleges.find(c => c.id === selectedCollegeId)?.name
    }
    return null
  }, [colleges, courses, branches, semesters, subjects, selectedCollegeId, selectedCourseId, selectedBranchId, selectedSemesterId, selectedSubjectId])

  const renderHierarchyDropdown = (
    label: string,
    placeholder: string,
    options: { id: number; name: string }[],
    selectedValue: number | null,
    onSelect: (id: number) => void,
    levelName: 'college' | 'course' | 'branch' | 'semester' | 'subject',
    disabled: boolean
  ) => {
    const isOpen = activeDropdown === levelName
    const isLoading = loadingLevels[levelName]
    const selectedObj = options.find(o => o.id === selectedValue)
    const displayName = selectedObj ? selectedObj.name : placeholder

    return (
      <div className="mb-3">
        <label className="block text-[10px] font-bold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider mb-1 px-1">
          {label}
        </label>
        <button
          disabled={disabled}
          onClick={() => setActiveDropdown(isOpen ? null : levelName)}
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

  const totalDownloads = resources.reduce((acc, r) => acc + (r.downloads ?? 0), 0)

  return (
    <div className="min-h-screen bg-white dark:bg-brand-dark-bg pt-16">
      {/* Hero — shared split layout */}
      <div className="bg-gradient-to-b from-gray-50/80 to-white dark:from-brand-dark-card/50 dark:to-brand-dark-bg border-b border-gray-100 dark:border-brand-dark-border py-10 px-4 sm:py-14">
        <div className="max-w-7xl mx-auto flex flex-col items-center lg:flex-row lg:gap-12">
          <motion.div className="flex-1 w-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-4 uppercase tracking-widest">
              <Sparkles size={12} /> Digital Study Vault
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-brand-text dark:text-brand-dark-text mb-5 tracking-tight">
              The Ultimate <span className="gradient-text">Learning Library</span>
            </h1>
            <p className="text-brand-muted dark:text-brand-dark-muted text-base md:text-lg max-w-xl leading-relaxed mb-6">
              {resources.length}+ resources across handwritten notes, PYQs, roadmaps, cheat sheets and university books — curated for high semester scores.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-brand-muted dark:text-brand-dark-muted mb-7">
              <span className="flex items-center gap-2"><Download size={14} />{totalDownloads > 0 ? `${(totalDownloads / 1000).toFixed(0)}K+` : '45K+'} downloads</span>
              <span className="flex items-center gap-2"><Eye size={14} />Expert verified</span>
              <span className="flex items-center gap-2"><FileText size={14} />Free & Premium</span>
            </div>
            <div className="relative max-w-lg">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notes, subjects, branch, college or year..."
                className="input pl-12"
              />
            </div>
          </motion.div>
          <aside className="hidden lg:block w-full max-w-md xl:max-w-lg flex-shrink-0 mt-8 lg:mt-0">
            <PanelSpotlightCard
              variant="resource"
              stat={{ value: `${resources.length}+`, label: 'Study Resources' }}
              secondaryStat={{ value: totalDownloads > 0 ? `${(totalDownloads / 1000).toFixed(0)}K+` : '45K+', label: 'Downloads' }}
            />
          </aside>
        </div>
      </div>

      {/* Bundles vs Individual Resources Switcher */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="inline-flex rounded-2xl border border-gray-100 dark:border-brand-dark-border bg-white dark:bg-brand-dark-card p-1 shadow-sm flex-wrap gap-1">
          <button
            onClick={() => setResourceSection('bundles')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              resourceSection === 'bundles'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                : 'text-brand-muted dark:text-brand-dark-muted hover:text-brand-text dark:hover:text-brand-dark-text'
            }`}
          >
            <Package size={15} /> Resource Bundles (Notes Packages)
            {resourceBundles.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${resourceSection === 'bundles' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/10'}`}>
                {resourceBundles.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setResourceSection('resources')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              resourceSection === 'resources'
                ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black shadow-md'
                : 'text-brand-muted dark:text-brand-dark-muted hover:text-brand-text dark:hover:text-brand-dark-text'
            }`}
          >
            <FileText size={15} /> All Individual Materials
            {individualResourcesCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${resourceSection === 'resources' ? 'bg-white/20 text-white dark:bg-black/20' : 'bg-gray-100 dark:bg-white/10'}`}>
                {individualResourcesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Resource Type Tabs (Shown for individual materials) */}
      {resourceSection === 'resources' && (
        <div className="sticky top-16 z-30 bg-white dark:bg-brand-dark-bg border-b border-gray-100 dark:border-brand-dark-border mt-4">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
              <button
                onClick={() => setActiveType(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${!activeType ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-100 dark:hover:bg-white/5'}`}
              >
                All ({resources.length})
              </button>
              {RESOURCE_TYPES.map(t => {
                const cnt = resources.filter(r => r.type === t.label).length
                return (
                  <button
                    key={t.label}
                    onClick={() => setActiveType(t.label)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeType === t.label ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-100 dark:hover:bg-white/5'}`}
                  >
                    <t.icon size={13} />
                    {t.label}
                    {cnt > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeType === t.label ? 'bg-white/20 dark:bg-black/20' : 'bg-gray-100 dark:bg-white/10'}`}>{cnt}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
        {/* Sidebar */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <div className="sticky top-32 space-y-3">
            {/* Free/Premium filter */}
            <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-3">Access</h3>
              {(['all', 'free', 'premium'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setShowPremium(p)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm capitalize mb-0.5 transition-colors ${showPremium === p ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}
                >
                  {p === 'all' ? 'All Resources' : p === 'free' ? 'Free Only' : 'Premium Only'}
                </button>
              ))}
            </div>

            {/* Academic Hierarchy */}
            <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-4">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-brand-dark-border pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text dark:text-brand-dark-text">Academic Filter</h3>
                {(selectedCollegeId || selectedCourseId || selectedBranchId || selectedSemesterId || selectedSubjectId) && (
                  <button
                    onClick={handleResetHierarchy}
                    className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider"
                  >
                    Reset
                  </button>
                )}
              </div>

              {renderHierarchyDropdown(
                'College',
                'Select College...',
                colleges,
                selectedCollegeId,
                handleCollegeSelect,
                'college',
                false
              )}

              {renderHierarchyDropdown(
                'Course',
                selectedCollegeId ? 'Select Course...' : 'Select College first',
                courses,
                selectedCourseId,
                handleCourseSelect,
                'course',
                !selectedCollegeId
              )}

              {renderHierarchyDropdown(
                'Branch',
                selectedCourseId ? 'Select Branch...' : 'Select Course first',
                branches,
                selectedBranchId,
                handleBranchSelect,
                'branch',
                !selectedCourseId
              )}

              {renderHierarchyDropdown(
                'Semester',
                selectedBranchId ? 'Select Semester...' : 'Select Branch first',
                semesters.map(s => ({ id: s.id, name: `Semester ${s.semester_number}` })),
                selectedSemesterId,
                handleSemesterSelect,
                'semester',
                !selectedBranchId
              )}

              {renderHierarchyDropdown(
                'Subject',
                selectedSemesterId ? 'Select Subject...' : 'Select Semester first',
                subjects,
                selectedSubjectId,
                handleSubjectSelect,
                'subject',
                !selectedSemesterId
              )}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {resourceSection === 'bundles' ? (
            <>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-brand-text dark:text-brand-dark-text">
                    {activeLevelName ? `${activeLevelName} Resource Bundles` : 'All Resource Bundles'}
                  </h2>
                  <p className="text-xs sm:text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
                    {filteredResourceBundles.length} bundle{filteredResourceBundles.length !== 1 ? 's' : ''} available (curated subject notes & PDFs)
                  </p>
                </div>

                {/* Mobile Filter Button */}
                <button
                  onClick={() => setShowMobileFilter(true)}
                  className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-brand-text dark:text-brand-dark-text text-xs font-semibold hover:bg-gray-200 dark:hover:bg-white/15 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <SlidersHorizontal size={14} className="text-primary-500" />
                  <span>Filters</span>
                  {(selectedCollegeId || selectedCourseId || selectedBranchId || selectedSemesterId || selectedSubjectId) && (
                    <span className="w-2 h-2 rounded-full bg-primary-500" />
                  )}
                </button>
              </div>

              {/* Active Filter Chips */}
              {activeLevelName && (
                <div className="flex flex-wrap items-center gap-1.5 mb-5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs font-medium border border-amber-500/20">
                    {activeLevelName}
                    <button onClick={handleResetHierarchy} className="hover:text-amber-800 dark:hover:text-amber-200">
                      <X size={12} />
                    </button>
                  </span>
                </div>
              )}

              {loadingBundles ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={36} className="animate-spin text-amber-500 mb-3" />
                  <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Loading resource bundles…</p>
                </div>
              ) : filteredResourceBundles.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10">
                  <Package size={44} className="mx-auto text-brand-muted dark:text-brand-dark-muted mb-3 opacity-40" />
                  <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text mb-1">No resource bundles found</h3>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted max-w-sm mx-auto mb-4">
                    Try selecting a different subject or reset filters to see all available bundles, or browse all individual study materials.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        handleResetHierarchy()
                        setSearch('')
                      }}
                      className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                    <button
                      onClick={() => setResourceSection('resources')}
                      className="px-4 py-2 bg-gray-200 dark:bg-white/10 text-brand-text dark:text-brand-dark-text rounded-xl text-xs font-semibold hover:bg-gray-300 dark:hover:bg-white/15 transition-colors cursor-pointer"
                    >
                      Browse Individual Materials
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  {filteredResourceBundles.map((bundle) => (
                    <ResourceBundleCard
                      key={bundle.id}
                      bundle={bundle}
                      isUnlocked={isBundleUnlocked(bundle)}
                      onOpen={handleOpenBundle}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-brand-text dark:text-brand-dark-text">
                    {activeType || (activeLevelName ? activeLevelName + ' Resources' : 'All Resources')}
                  </h2>
                  <p className="text-xs sm:text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
                    {filtered.length} resource{filtered.length !== 1 ? 's' : ''} available
                  </p>
                </div>

                {/* Mobile Filter Button */}
                <button
                  onClick={() => setShowMobileFilter(true)}
                  className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-brand-text dark:text-brand-dark-text text-xs font-semibold hover:bg-gray-200 dark:hover:bg-white/15 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <SlidersHorizontal size={14} className="text-primary-500" />
                  <span>Filters</span>
                  {(selectedCollegeId || selectedCourseId || selectedBranchId || selectedSemesterId || selectedSubjectId || showPremium !== 'all') && (
                    <span className="w-2 h-2 rounded-full bg-primary-500" />
                  )}
                </button>
              </div>

              {/* Active Filter Chips */}
              {(activeLevelName || showPremium !== 'all' || activeType) && (
                <div className="flex flex-wrap items-center gap-1.5 mb-5">
                  {activeType && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 text-xs font-medium border border-primary-500/20">
                      Type: {activeType}
                      <button onClick={() => setActiveType(null)} className="hover:text-primary-800 dark:hover:text-primary-200">
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {activeLevelName && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 text-xs font-medium border border-primary-500/20">
                      {activeLevelName}
                      <button onClick={handleResetHierarchy} className="hover:text-primary-800 dark:hover:text-primary-200">
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {showPremium !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs font-medium border border-amber-500/20">
                      {showPremium === 'free' ? 'Free Only' : 'Premium Only'}
                      <button onClick={() => setShowPremium('all')} className="hover:text-amber-800 dark:hover:text-amber-200">
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={36} className="animate-spin text-primary-500 mb-3" />
                  <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Loading study resources…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10">
                  <FileText size={44} className="mx-auto text-brand-muted dark:text-brand-dark-muted mb-3 opacity-40" />
                  <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text mb-1">No notes or resources found</h3>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted max-w-sm mx-auto mb-4">
                    Try selecting a different subject or reset filters to see all available learning materials.
                  </p>
                  <button
                    onClick={() => {
                      setActiveType(null)
                      handleResetHierarchy()
                      setShowPremium('all')
                      setSearch('')
                    }}
                    className="px-4 py-2 bg-primary-500 text-white rounded-xl text-xs font-semibold hover:bg-primary-600 transition-colors cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  <AnimatePresence mode="popLayout">
                    {filtered.map((r) => (
                      <ResourceCard
                        key={r.id}
                        resource={r}
                        onDownload={handleDownload}
                        onUnlock={handleUnlockResource}
                        isSubjectUnlocked={Boolean(r.isBundleOnly && r.subjectId && unlockedSubjectIds.has(r.subjectId))}
                        isResourceBundleUnlocked={unlockedResourceItemIds.has(Number(r.id))}
                        isEnrolled={enrolledResourceIds.has(Number(r.id))}
                        isPendingVerification={pendingResourceIds.has(Number(r.id))}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Filter Sheet / Modal */}
      <AnimatePresence>
        {showMobileFilter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileFilter(false)}
            className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-brand-dark-card rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 border-t border-gray-200 dark:border-brand-dark-border shadow-2xl safe-bottom"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-brand-dark-border mb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-primary-500" />
                  <h3 className="font-bold text-base text-brand-text dark:text-brand-dark-text">Academic Filters</h3>
                </div>
                <button
                  onClick={() => setShowMobileFilter(false)}
                  className="p-1.5 rounded-full bg-gray-100 dark:bg-white/10 text-brand-muted hover:text-brand-text"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Free / Premium Switcher */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider mb-2">
                  Access Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['all', 'free', 'premium'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setShowPremium(p)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize text-center transition-all ${
                        showPremium === p
                          ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black shadow-xs'
                          : 'bg-gray-100 dark:bg-white/5 text-brand-muted dark:text-brand-dark-muted'
                      }`}
                    >
                      {p === 'all' ? 'All' : p === 'free' ? 'Free' : 'Premium'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Academic Hierarchy Dropdowns */}
              <div className="space-y-1 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider">
                    University & Subject
                  </label>
                  {(selectedCollegeId || selectedCourseId || selectedBranchId || selectedSemesterId || selectedSubjectId) && (
                    <button
                      onClick={handleResetHierarchy}
                      className="text-[11px] font-bold text-red-500 uppercase tracking-wider"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {renderHierarchyDropdown('College', 'Select College...', colleges, selectedCollegeId, handleCollegeSelect, 'college', false)}
                {renderHierarchyDropdown('Course', selectedCollegeId ? 'Select Course...' : 'Select College first', courses, selectedCourseId, handleCourseSelect, 'course', !selectedCollegeId)}
                {renderHierarchyDropdown('Branch', selectedCourseId ? 'Select Branch...' : 'Select Course first', branches, selectedBranchId, handleBranchSelect, 'branch', !selectedCourseId)}
                {renderHierarchyDropdown('Semester', selectedBranchId ? 'Select Semester...' : 'Select Branch first', semesters.map((s) => ({ id: s.id, name: `Semester ${s.semester_number}` })), selectedSemesterId, handleSemesterSelect, 'semester', !selectedBranchId)}
                {renderHierarchyDropdown('Subject', selectedSemesterId ? 'Select Subject...' : 'Select Semester first', subjects, selectedSubjectId, handleSubjectSelect, 'subject', !selectedSemesterId)}
              </div>

              {/* Apply / Close Button */}
              <button
                onClick={() => setShowMobileFilter(false)}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-xl transition-colors shadow-md active:scale-98"
              >
                Apply & View ({filtered.length} Resources)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Confirmation Dialog */}
      <ConfirmDownloadDialog
        isOpen={!!dialogResource}
        resourceTitle={dialogResource?.title ?? ''}
        isLoading={isDownloading}
        onCancel={handleCancelDialog}
        onConfirm={handleConfirmDownload}
      />

      {/* Individual Resource Unlock Modal */}
      {enrollResource && user && (
        <EnrollModal
          resource={enrollResource}
          userId={user.id}
          defaultEmail={user.email}
          defaultName={user.name}
          onClose={() => setEnrollResource(null)}
          onEnrolled={(itemId) => {
            setPendingResourceIds((prev) => new Set([...prev, Number(itemId)]))
          }}
        />
      )}

      {/* Selected Resource Bundle Details Modal */}
      <AnimatePresence>
        {selectedBundle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBundle(null)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-brand-dark-card rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-brand-dark-border overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-brand-dark-border bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-500/30">
                        {selectedBundle.subjectCode || 'Resource Bundle'}
                      </span>
                      {isBundleUnlocked(selectedBundle) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold bg-green-500/15 text-green-700 dark:text-green-300 rounded-lg border border-green-500/30">
                          <CheckCircle2 size={13} /> Unlocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-gray-200 dark:bg-white/10 text-brand-muted dark:text-brand-dark-muted rounded-lg">
                          <Lock size={12} /> Notes Bundle
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-brand-text dark:text-brand-dark-text">
                      {selectedBundle.title || `${selectedBundle.subjectName} Notes`}
                    </h2>
                    {(selectedBundle.courseName || selectedBundle.branchName || selectedBundle.semesterNumber) && (
                      <p className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mt-1 uppercase tracking-wider">
                        {[selectedBundle.courseName, selectedBundle.branchName, selectedBundle.semesterNumber ? `Semester ${selectedBundle.semesterNumber}` : null].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedBundle(null)}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-brand-muted hover:text-brand-text transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {selectedBundle.description && (
                  <p className="text-xs sm:text-sm text-brand-muted dark:text-brand-dark-muted mt-3 leading-relaxed">
                    {selectedBundle.description}
                  </p>
                )}

                {/* Upsell / Unlock Banner */}
                {!isBundleUnlocked(selectedBundle) && (
                  <div className="mt-4 p-4 rounded-2xl bg-white/80 dark:bg-brand-dark-bg/80 border border-amber-200 dark:border-amber-900/40 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <div>
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                          Unlock All Notes & PDFs In This Bundle
                        </span>
                        <p className="text-xs text-brand-muted dark:text-brand-dark-muted">
                          Get instant access to all {bundleItems.length} curated notes and materials.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedBundle(null)
                            navigate(`/courses/bundles/${selectedBundle.subjectId}?from=resources&checkout=resource_bundle&plan=six_month`)
                          }}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                          6-Month · ₹{selectedBundle.sixMonthPrice}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBundle(null)
                            navigate(`/courses/bundles/${selectedBundle.subjectId}?from=resources&checkout=resource_bundle&plan=lifetime`)
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#0A0A0A] hover:bg-amber-600 text-white dark:bg-white dark:text-black dark:hover:bg-amber-500 dark:hover:text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                          Lifetime · ₹{selectedBundle.lifetimePrice}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-amber-100 dark:border-amber-900/30 flex items-center justify-between text-[11px] text-brand-muted dark:text-brand-dark-muted">
                      <span>Looking for video lectures + notes?</span>
                      <Link
                        to={`/courses/bundles/${selectedBundle.subjectId}?from=resources`}
                        onClick={() => setSelectedBundle(null)}
                        className="font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        View Full Subject Bundle <ExternalLink size={11} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Materials List */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} className="text-amber-500" />
                    Included Notes & Documents ({bundleItems.length})
                  </h3>
                  {isBundleUnlocked(selectedBundle) && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                      <ShieldCheck size={13} /> Full Download Access
                    </span>
                  )}
                </div>

                {loadingBundleItems ? (
                  <div className="py-12 text-center text-brand-muted">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-amber-500" />
                    <p className="text-xs">Loading included documents...</p>
                  </div>
                ) : bundleItems.length === 0 ? (
                  <div className="py-10 text-center rounded-2xl bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 p-4">
                    <FileText size={32} className="mx-auto text-brand-muted dark:text-brand-dark-muted mb-2 opacity-40" />
                    <p className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">No documents listed yet</p>
                    <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted mt-1">Study materials will be added soon by the faculty.</p>
                  </div>
                ) : (
                  bundleItems.map((item, index) => {
                    const canDownload = isBundleUnlocked(selectedBundle)
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between gap-3 hover:border-amber-200 dark:hover:border-amber-900/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-brand-text dark:text-brand-dark-text truncate">
                              {item.title || `Study Material #${index + 1}`}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-brand-muted dark:text-brand-dark-muted">
                              {(item.resourceType || item.typeName) && <span>{item.resourceType || item.typeName}</span>}
                              {item.downloads !== undefined && (
                                <>
                                  <span>•</span>
                                  <span>{item.downloads} downloads</span>
                                </>
                              )}
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">• Included in Bundle</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {canDownload ? (
                            <button
                              onClick={async () => {
                                if (item.fileUrl) {
                                  await triggerResourceDownload(item.fileUrl, item.title || 'resource.pdf')
                                  incrementDownloadCount(String(item.resourceId), item.downloads ?? 0).catch(() => {})
                                  toast.success(`Downloading: ${item.title}`)
                                } else {
                                  toast.error('Download link not available for this item.')
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
                            >
                              <Download size={13} /> Download
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedBundle(null)
                                navigate(`/courses/bundles/${selectedBundle.subjectId}?from=resources&checkout=resource_bundle&plan=six_month`)
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 text-brand-muted dark:text-brand-dark-muted font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Lock size={12} /> Unlock
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-brand-dark-border bg-gray-50/60 dark:bg-white/5 flex items-center justify-between">
                <span className="text-xs text-brand-muted dark:text-brand-dark-muted">
                  Skills021 Verified Curriculum
                </span>
                <button
                  onClick={() => setSelectedBundle(null)}
                  className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-white/10 text-brand-text dark:text-brand-dark-text text-xs font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
