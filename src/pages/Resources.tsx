import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import {
  FileText, Download, Bookmark, Share2, Lock, Search,
  Clock, BookOpen, ChevronDown, Eye, Loader2, Archive
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
import toast from 'react-hot-toast'
import ConfirmDownloadDialog from '../components/ConfirmDownloadDialog'
import PageShell from '../components/PageShell'

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

function ResourceCard({ resource, onDownload }: { resource: Resource; onDownload: (resource: Resource) => void }) {
  const [bookmarked, setBookmarked] = useState(false)

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
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -3 }}
      className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-5 relative overflow-hidden group hover:shadow-card-hover transition-all duration-200"
    >
      {resource.isPremium && (
        <div className="absolute top-0 right-0 bg-[#0A0A0A] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
          PREMIUM
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${iconBg}`}>
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
        {resource.isPremium ? (
          <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#0A0A0A] text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors">
            <Lock size={13} /> Unlock for ₹{resource.price}
          </button>
        ) : (
          <button
            onClick={() => onDownload(resource)}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#0A0A0A] dark:bg-white text-white dark:text-black rounded-xl text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <Download size={13} /> Download Free
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
    </motion.div>
  )
}

export default function Resources() {
  const [searchParams] = useSearchParams()
  const initType = searchParams.get('type')

  const [resources, setResources] = useState<Resource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeType, setActiveType] = useState<string | null>(initType)
  const [search, setSearch] = useState('')
  const [showPremium, setShowPremium] = useState<'all' | 'free' | 'premium'>('all')

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

  // ─── Open confirmation dialog ───────────────────────────────────────────
  const handleDownload = useCallback((resource: Resource) => {
    if (resource.isPremium) {
      toast.error('This is a premium resource. Please purchase to download.')
      return
    }
    setDialogResource(resource)
  }, [])

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
    <PageShell
      eyebrow="Resources"
      title="The ultimate learning library"
      description={`${resources.length}+ resources across notes, PYQs, roadmaps, cheat sheets and more — curated for every student.`}
      action={
        <div className="relative w-full max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="input h-11 w-full pl-12"
          />
        </div>
      }
      compact
    >
      {/* Resource Type Tabs */}
      <div className="sticky top-16 z-30 mb-8 rounded-2xl border border-gray-100 bg-white/90 backdrop-blur dark:border-brand-dark-border dark:bg-brand-dark-card/80">
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

      <div className="flex gap-6">
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text">
                {activeType || (activeLevelName ? activeLevelName + ' Resources' : 'All Resources')}
              </h2>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">{filtered.length} resource{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={40} className="animate-spin text-brand-muted dark:text-brand-dark-muted mb-4" />
              <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Loading resources...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <FileText size={48} className="mx-auto text-gray-200 dark:text-brand-dark-muted mb-4" />
              <h3 className="text-lg font-semibold text-brand-text dark:text-brand-dark-text mb-2">No resources found</h3>
              <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Try changing filters or search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {filtered.map(r => <ResourceCard key={r.id} resource={r} onDownload={handleDownload} />)}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* Download Confirmation Dialog */}
      <ConfirmDownloadDialog
        isOpen={!!dialogResource}
        resourceTitle={dialogResource?.title ?? ''}
        isLoading={isDownloading}
        onCancel={handleCancelDialog}
        onConfirm={handleConfirmDownload}
      />
    </PageShell>
  )
}
