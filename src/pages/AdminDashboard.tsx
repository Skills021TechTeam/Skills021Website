import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, FileText, HelpCircle, Map,
  Users, Settings, Plus, Edit2, Trash2, Search,
  X, Shield, TrendingUp, Eye, Download, EyeOff,
  CheckCircle, Zap, Video, Loader2, RotateCw, Compass
} from 'lucide-react'
import { useContentStore, Course, Resource, Quiz, Roadmap } from '../store/contentStore'
import { useMentorStore } from '../store/mentorStore'
import { useVideoStore, YouTubeVideo } from '../store/videoStore'
import {
  fetchAllResources,
  createResource as createResourceApi,
  updateResource as updateResourceApi,
  deleteResource as deleteResourceApi,
  toggleResourceStatus as toggleResourceStatusApi,
  fetchColleges,
  fetchCourses,
  fetchBranches,
  fetchSemesters,
  fetchSubjects,
  fetchResourceTypes,
  type College,
  type Course as DBCourse,
  type Branch,
  type Semester,
  type Subject,
  type ResourceTypeRow,
  type CreateResourceInput,
  fetchAllCoursesWithDetails,
  fetchAllBranchesWithDetails,
  fetchAllSemestersWithDetails,
  fetchAllSubjectsWithDetails,
  createCollege,
  updateCollege,
  deleteCollege,
  createCourse,
  updateCourse,
  deleteCourse,
  createBranch,
  updateBranch,
  deleteBranch,
  createSemester,
  updateSemester,
  deleteSemester,
  createSubject,
  updateSubject,
  deleteSubject,
  uploadResourceFile,
  deleteResourceFile,
} from '../lib/resourceService'
import {
  getCareerPaths,
  createCareerPath,
  updateCareerPath,
  deleteCareerPath,
} from '../lib/careerService'
import {
  getExams,
  createExam,
  updateExam,
  deleteExam,
} from '../lib/examService'
import {
  getCareerMappings,
  getMappingsForCareer,
  createCareerMapping,
  updateCareerMapping,
  deleteCareerMapping,
} from '../lib/mappingService'
import type {
  CareerMappingRow,
  CareerPathInput,
  CareerPathRow,
  ExamInput,
  ExamRow,
  PathFinderExamStatus,
  PathFinderExamType,
} from '../lib/pathfinderTypes'
import toast from 'react-hot-toast'

type AdminTab =
  | 'overview' | 'courses' | 'resources' | 'quizzes' | 'roadmaps'
  | 'mentorship' | 'youtube-videos' | 'users' | 'settings' | 'hierarchy'
  | 'pathfinder-careers' | 'pathfinder-exams' | 'pathfinder-mappings'

const sidebarItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'courses', label: 'Courses', icon: BookOpen, group: 'Content' },
  { id: 'resources', label: 'Resources', icon: FileText, group: 'Content' },
  { id: 'quizzes', label: 'Quizzes', icon: HelpCircle, group: 'Content' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, group: 'Content' },
  { id: 'youtube-videos', label: 'YouTube Videos', icon: Video, group: 'Content' },
  { id: 'mentorship', label: 'Mentorship', icon: Users, group: 'Services' },
  { id: 'hierarchy', label: 'Academic Hierarchy', icon: BookOpen, group: 'Content' },
  { id: 'pathfinder-careers', label: 'Career Paths', icon: Compass, group: '🧭 Skills021 PathFinder' },
  { id: 'pathfinder-exams', label: 'Exams', icon: FileText, group: '🧭 Skills021 PathFinder' },
  { id: 'pathfinder-mappings', label: 'Career Mapping', icon: Map, group: '🧭 Skills021 PathFinder' },
  { id: 'users', label: 'Users', icon: Users, group: 'Admin' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'Admin' },
]

// ─── Shared Components ───────────────────────────────────────────────────────
function SectionHeader({ title, count, onAdd, addLabel = 'Add New' }: { title: string; count?: number; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">{title}</h2>
        {count !== undefined && <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">{count} items</p>}
      </div>
      {onAdd && (
        <button onClick={onAdd} className="flex items-center gap-2 btn-primary text-sm py-2.5 px-4">
          <Plus size={15} /> {addLabel}
        </button>
      )}
    </div>
  )
}

function SearchBar({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full max-w-xs mb-5">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  )
}

function DeleteModal({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text text-center mb-2">Delete "{title}"?</h3>
        <p className="text-sm text-brand-muted dark:text-brand-dark-muted text-center mb-6">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600">Delete</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    Published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    Upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Ongoing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Confirmed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    Inactive: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    Open: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Closing Soon': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
  return <span className={`badge text-xs ${cfg[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

// ─── Modal helpers ────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"

const pathfinderExamTypes: PathFinderExamType[] = ['Government', 'Private', 'National', 'State']
const pathfinderExamStatuses: PathFinderExamStatus[] = ['Open', 'Closing Soon', 'Upcoming', 'Closed']

const emptyCareerForm: CareerPathInput = {
  icon: 'Compass',
  title: '',
  short_description: '',
  full_description: '',
  average_salary: '',
  career_growth: '',
  education_required: '',
  required_skills: [],
  industries: [],
  future_scope: '',
}

const emptyExamForm: ExamInput = {
  title: '',
  conducting_body: '',
  description: '',
  exam_type: 'National',
  official_website: '',
  registration_start: '',
  registration_end: '',
  exam_date: '',
  result_date: '',
  application_fee: 0,
  selection_process: '',
  eligibility: '',
  course: '',
  branch: '',
  minimum_semester: 1,
  maximum_age: null,
  minimum_percentage: null,
  average_salary: '',
  status: 'Upcoming',
}

const splitList = (value: string | string[] | null | undefined) => {
  if (Array.isArray(value)) return value
  if (!value) return []
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

const joinList = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
};

const formatAdminDate = (date?: string | null) => {
  if (!date) return '—'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString()
}

const isValidUrl = (value?: string | null) => {
  if (!value) return true
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<{ id: string; title: string; type: string } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)

  // Stores
  const content = useContentStore()
  const mentors = useMentorStore()

  // ─── Supabase Resources State ──────────────────────────────────────────────
  const [dbResources, setDbResources] = useState<Resource[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(false)

  // Hierarchy dropdown state for resource form
  const [colleges, setColleges] = useState<College[]>([])
  const [courses, setCourses] = useState<DBCourse[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [resourceTypes, setResourceTypes] = useState<ResourceTypeRow[]>([])

  const [selectedCollegeId, setSelectedCollegeId] = useState<number | ''>('')
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('')
  const [selectedBranchId, setSelectedBranchId] = useState<number | ''>('')
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | ''>('')
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('')
  const [selectedResourceTypeId, setSelectedResourceTypeId] = useState<number | ''>('')
  const [resourceSaving, setResourceSaving] = useState(false)

  // Resource form fields
  const [resTitle, setResTitle] = useState('')
  const [resDescription, setResDescription] = useState('')
  const [resAuthor, setResAuthor] = useState('')
  // File upload states
  const [resUploadFile, setResUploadFile] = useState<File | null>(null)
  const [resUploadProgress, setResUploadProgress] = useState(0)
  const [resUploadStatus, setResUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [resExistingFileUrl, setResExistingFileUrl] = useState('')
  const [resIsPremium, setResIsPremium] = useState(false)
  const [resPrice, setResPrice] = useState<number>(0)
  const [resStatus, setResStatus] = useState<'Published' | 'Draft'>('Draft')

  // ─── Academic Hierarchy States ──────────────────────────────────────────
  const [hColleges, setHColleges] = useState<College[]>([])
  const [hCourses, setHCourses] = useState<any[]>([])
  const [hBranches, setHBranches] = useState<any[]>([])
  const [hSemesters, setHSemesters] = useState<any[]>([])
  const [hSubjects, setHSubjects] = useState<any[]>([])
  const [hierarchyLoading, setHierarchyLoading] = useState(false)
  const [hierarchyTab, setHierarchyTab] = useState<'colleges' | 'courses' | 'branches' | 'semesters' | 'subjects'>('colleges')
  const [hierarchyDeleteId, setHierarchyDeleteId] = useState<number | null>(null)

  // Hierarchy Form/Modal States
  const [showHierarchyModal, setShowHierarchyModal] = useState(false)
  const [hierarchyEditItem, setHierarchyEditItem] = useState<any>(null) // null for Add, object for Edit

  const [hFormCollegeId, setHFormCollegeId] = useState<number | ''>('')
  const [hFormCourseId, setHFormCourseId] = useState<number | ''>('')
  const [hFormBranchId, setHFormBranchId] = useState<number | ''>('')
  const [hFormSemesterId, setHFormSemesterId] = useState<number | ''>('')

  const [hFormName, setHFormName] = useState('')
  const [hFormShortName, setHFormShortName] = useState('')
  const [hFormCity, setHFormCity] = useState('')
  const [hFormState, setHFormState] = useState('')
  const [hFormDuration, setHFormDuration] = useState('')
  const [hFormCode, setHFormCode] = useState('')
  const [hFormSemesterNumber, setHFormSemesterNumber] = useState<number | ''>('')
  const [hierarchySaving, setHierarchySaving] = useState(false)

  // Dropdown lists in hierarchy modal
  const [modalColleges, setModalColleges] = useState<College[]>([])
  const [modalCourses, setModalCourses] = useState<DBCourse[]>([])
  const [modalBranches, setModalBranches] = useState<Branch[]>([])
  const [modalSemesters, setModalSemesters] = useState<Semester[]>([])

  const isPrefillingRef = useRef(false)

  // ─── PathFinder Admin State ───────────────────────────────────────────────
  const [careerPaths, setCareerPaths] = useState<CareerPathRow[]>([])
  const [pathfinderExams, setPathfinderExams] = useState<ExamRow[]>([])
  const [careerMappings, setCareerMappings] = useState<CareerMappingRow[]>([])
  const [pathfinderLoading, setPathfinderLoading] = useState(false)
  const [pathfinderSaving, setPathfinderSaving] = useState(false)
  const [pathfinderErrors, setPathfinderErrors] = useState<Record<string, string>>({})
  const [examPage, setExamPage] = useState(1)
  const [examSort, setExamSort] = useState<'title' | 'registration_end' | 'exam_date' | 'status'>('registration_end')
  const [examSortDir, setExamSortDir] = useState<'asc' | 'desc'>('asc')

  // ─── Load resources from Supabase ──────────────────────────────────────────
  const loadDbResources = useCallback(async () => {
    setResourcesLoading(true)
    try {
      const data = await fetchAllResources()
      setDbResources(data)
      // Use getState() to avoid the content ref changing and causing an infinite loop
      useContentStore.getState().setResources(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load resources'
      toast.error(msg)
    } finally {
      setResourcesLoading(false)
    }
  }, [])

  // Load resources when switching to resources/overview tab
  useEffect(() => {
    if (activeTab === 'resources' || activeTab === 'overview') {
      loadDbResources()
    }
  }, [activeTab, loadDbResources])

  const loadPathfinderCareers = useCallback(async () => {
    setPathfinderLoading(true)
    try {
      setCareerPaths(await getCareerPaths())
    } catch (err) {
      console.error('Failed to load career paths from Supabase:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to load career paths')
    } finally {
      setPathfinderLoading(false)
    }
  }, [])

  const loadPathfinderExams = useCallback(async () => {
    setPathfinderLoading(true)
    try {
      setPathfinderExams(await getExams())
    } catch (err) {
      console.error('Failed to load exams from Supabase:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to load exams')
    } finally {
      setPathfinderLoading(false)
    }
  }, [])

  const loadPathfinderMappings = useCallback(async () => {
    setPathfinderLoading(true)
    try {
      const [careerData, examData, mappingData] = await Promise.all([
        getCareerPaths(),
        getExams(),
        getCareerMappings(),
      ])
      setCareerPaths(careerData)
      setPathfinderExams(examData)
      setCareerMappings(mappingData)
    } catch (err) {
      console.error('Failed to load mappings from Supabase:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to load career mappings')
    } finally {
      setPathfinderLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'pathfinder-careers') loadPathfinderCareers()
    if (activeTab === 'pathfinder-exams') loadPathfinderExams()
    if (activeTab === 'pathfinder-mappings') loadPathfinderMappings()
  }, [activeTab, loadPathfinderCareers, loadPathfinderExams, loadPathfinderMappings])

  // ─── Load hierarchy dropdowns ──────────────────────────────────────────────
  useEffect(() => {
    if (showModal && editItem?._type === 'resource') {
      fetchColleges().then(setColleges).catch(() => toast.error('Failed to load colleges'))
      fetchResourceTypes().then(setResourceTypes).catch(() => toast.error('Failed to load resource types'))
    }
  }, [showModal, editItem?._type])

  useEffect(() => {
    if (selectedCollegeId) {
      fetchCourses(selectedCollegeId as number).then(setCourses).catch(() => toast.error('Failed to load courses'))
      setSelectedCourseId(''); setSelectedBranchId(''); setSelectedSemesterId(''); setSelectedSubjectId('')
      setBranches([]); setSemesters([]); setSubjects([])
    }
  }, [selectedCollegeId])

  useEffect(() => {
    if (selectedCourseId) {
      fetchBranches(selectedCourseId as number).then(setBranches).catch(() => toast.error('Failed to load branches'))
      setSelectedBranchId(''); setSelectedSemesterId(''); setSelectedSubjectId('')
      setSemesters([]); setSubjects([])
    }
  }, [selectedCourseId])

  useEffect(() => {
    if (selectedBranchId) {
      fetchSemesters(selectedBranchId as number).then(setSemesters).catch(() => toast.error('Failed to load semesters'))
      setSelectedSemesterId(''); setSelectedSubjectId('')
      setSubjects([])
    }
  }, [selectedBranchId])

  useEffect(() => {
    if (selectedSemesterId) {
      fetchSubjects(selectedSemesterId as number).then(setSubjects).catch(() => toast.error('Failed to load subjects'))
      setSelectedSubjectId('')
    }
  }, [selectedSemesterId])

  // ─── Hierarchy Loader Callback ─────────────────────────────────────────────
  const loadHierarchyData = useCallback(async (tabName: string) => {
    setHierarchyLoading(true)
    try {
      if (tabName === 'colleges') {
        const data = await fetchColleges()
        setHColleges(data)
      } else if (tabName === 'courses') {
        const data = await fetchAllCoursesWithDetails()
        setHCourses(data)
      } else if (tabName === 'branches') {
        const data = await fetchAllBranchesWithDetails()
        setHBranches(data)
      } else if (tabName === 'semesters') {
        const data = await fetchAllSemestersWithDetails()
        setHSemesters(data)
      } else if (tabName === 'subjects') {
        const data = await fetchAllSubjectsWithDetails()
        setHSubjects(data)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to load ${tabName}`)
    } finally {
      setHierarchyLoading(false)
    }
  }, [])

  // Fetch active tab data
  useEffect(() => {
    if (activeTab === 'hierarchy') {
      loadHierarchyData(hierarchyTab)
    }
  }, [activeTab, hierarchyTab, loadHierarchyData])

  // ─── Hierarchy Modal Prefill & Cascading Effects ──────────────────────────
  useEffect(() => {
    if (showHierarchyModal) {
      fetchColleges().then(setModalColleges).catch(() => toast.error('Failed to load colleges'))
    }
  }, [showHierarchyModal])

  useEffect(() => {
    if (hFormCollegeId) {
      fetchCourses(hFormCollegeId as number).then(setModalCourses).catch(() => toast.error('Failed to load courses'))
      if (!isPrefillingRef.current) {
        setHFormCourseId(''); setHFormBranchId(''); setHFormSemesterId('')
        setModalBranches([]); setModalSemesters([])
      }
    } else {
      setModalCourses([])
      setHFormCourseId(''); setHFormBranchId(''); setHFormSemesterId('')
      setModalBranches([]); setModalSemesters([])
    }
  }, [hFormCollegeId])

  useEffect(() => {
    if (hFormCourseId) {
      fetchBranches(hFormCourseId as number).then(setModalBranches).catch(() => toast.error('Failed to load branches'))
      if (!isPrefillingRef.current) {
        setHFormBranchId(''); setHFormSemesterId('')
        setModalSemesters([])
      }
    } else {
      setModalBranches([])
      setHFormBranchId(''); setHFormSemesterId('')
      setModalSemesters([])
    }
  }, [hFormCourseId])

  useEffect(() => {
    if (hFormBranchId) {
      fetchSemesters(hFormBranchId as number).then(setModalSemesters).catch(() => toast.error('Failed to load semesters'))
      if (!isPrefillingRef.current) {
        setHFormSemesterId('')
      }
    } else {
      setModalSemesters([])
      setHFormSemesterId('')
    }
  }, [hFormBranchId])

  // Open hierarchy modal helpers
  const openAddHierarchy = () => {
    setHierarchyEditItem(null)
    setHFormCollegeId(''); setHFormCourseId(''); setHFormBranchId(''); setHFormSemesterId('')
    setHFormName(''); setHFormShortName(''); setHFormCity(''); setHFormState('')
    setHFormDuration(''); setHFormCode(''); setHFormSemesterNumber('')
    setModalCourses([]); setModalBranches([]); setModalSemesters([])
    setShowHierarchyModal(true)
  }

  const openEditHierarchy = async (tab: string, item: any) => {
    isPrefillingRef.current = true
    setHierarchyEditItem({ ...item, _tab: tab })

    setHFormName(item.name || '')
    setHFormShortName(item.short_name || '')
    setHFormCity(item.city || '')
    setHFormState(item.state || '')
    setHFormDuration(item.duration || '')
    setHFormCode(item.code || '')
    setHFormSemesterNumber(item.semester_number || '')

    try {
      if (tab === 'courses') {
        const colId = item.college_id || item.colleges?.id || ''
        setHFormCollegeId(colId)
      } else if (tab === 'branches') {
        const colId = item.courses?.colleges?.id
        const crsId = item.course_id || item.courses?.id

        if (colId) {
          const crsList = await fetchCourses(colId)
          setModalCourses(crsList)
        }
        setHFormCollegeId(colId || '')
        setHFormCourseId(crsId || '')
      } else if (tab === 'semesters') {
        const colId = item.branches?.courses?.colleges?.id
        const crsId = item.branches?.courses?.id
        const brId = item.branch_id || item.branches?.id

        if (colId) {
          const crsList = await fetchCourses(colId)
          setModalCourses(crsList)
        }
        if (crsId) {
          const brList = await fetchBranches(crsId)
          setModalBranches(brList)
        }
        setHFormCollegeId(colId || '')
        setHFormCourseId(crsId || '')
        setHFormBranchId(brId || '')
      } else if (tab === 'subjects') {
        const colId = item.semesters?.branches?.courses?.colleges?.id
        const crsId = item.semesters?.branches?.courses?.id
        const brId = item.semesters?.branches?.id
        const semId = item.semester_id || item.semesters?.id

        if (colId) {
          const crsList = await fetchCourses(colId)
          setModalCourses(crsList)
        }
        if (crsId) {
          const brList = await fetchBranches(crsId)
          setModalBranches(brList)
        }
        if (brId) {
          const semList = await fetchSemesters(brId)
          setModalSemesters(semList)
        }
        setHFormCollegeId(colId || '')
        setHFormCourseId(crsId || '')
        setHFormBranchId(brId || '')
        setHFormSemesterId(semId || '')
      }
    } catch (err) {
      console.error('Failed to pre-fill hierarchy modal:', err)
    } finally {
      isPrefillingRef.current = false
      setShowHierarchyModal(true)
    }
  }

  const closeHierarchyModal = () => {
    setShowHierarchyModal(false)
    setHierarchyEditItem(null)
  }

  // Save changes
  const handleHierarchySave = async () => {
    setHierarchySaving(true)
    try {
      const isEdit = !!hierarchyEditItem
      const activeLvl = isEdit ? hierarchyEditItem._tab : hierarchyTab

      if (activeLvl === 'colleges') {
        if (!hFormName) throw new Error('College Name is required')
        const payload = {
          name: hFormName,
          short_name: hFormShortName || null,
          city: hFormCity || null,
          state: hFormState || null,
        }
        if (isEdit) {
          await updateCollege(hierarchyEditItem.id, payload)
          toast.success('College updated!')
        } else {
          await createCollege(payload)
          toast.success('College added!')
        }
      } else if (activeLvl === 'courses') {
        if (!hFormCollegeId) throw new Error('College is required')
        if (!hFormName) throw new Error('Course Name is required')
        const payload = {
          college_id: hFormCollegeId as number,
          name: hFormName,
          duration: hFormDuration || null,
        }
        if (isEdit) {
          await updateCourse(hierarchyEditItem.id, payload)
          toast.success('Course updated!')
        } else {
          await createCourse(payload)
          toast.success('Course added!')
        }
      } else if (activeLvl === 'branches') {
        if (!hFormCourseId) throw new Error('Course is required')
        if (!hFormName) throw new Error('Branch Name is required')
        const payload = {
          course_id: hFormCourseId as number,
          name: hFormName,
          code: hFormCode || null,
        }
        if (isEdit) {
          await updateBranch(hierarchyEditItem.id, payload)
          toast.success('Branch updated!')
        } else {
          await createBranch(payload)
          toast.success('Branch added!')
        }
      } else if (activeLvl === 'semesters') {
        if (!hFormBranchId) throw new Error('Branch is required')
        if (hFormSemesterNumber === '') throw new Error('Semester Number is required')
        const payload = {
          branch_id: hFormBranchId as number,
          semester_number: Number(hFormSemesterNumber),
        }
        if (isEdit) {
          await updateSemester(hierarchyEditItem.id, payload)
          toast.success('Semester updated!')
        } else {
          await createSemester(payload)
          toast.success('Semester added!')
        }
      } else if (activeLvl === 'subjects') {
        if (!hFormSemesterId) throw new Error('Semester is required')
        if (!hFormName) throw new Error('Subject Name is required')
        const payload = {
          semester_id: hFormSemesterId as number,
          name: hFormName,
          code: hFormCode || null,
        }
        if (isEdit) {
          await updateSubject(hierarchyEditItem.id, payload)
          toast.success('Subject updated!')
        } else {
          await createSubject(payload)
          toast.success('Subject added!')
        }
      }

      closeHierarchyModal()
      loadHierarchyData(activeLvl)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save record')
    } finally {
      setHierarchySaving(false)
    }
  }

  // Deletion
  const handleHierarchyDelete = async (tab: string, id: number) => {
    try {
      if (tab === 'colleges') {
        await deleteCollege(id)
      } else if (tab === 'courses') {
        await deleteCourse(id)
      } else if (tab === 'branches') {
        await deleteBranch(id)
      } else if (tab === 'semesters') {
        await deleteSemester(id)
      } else if (tab === 'subjects') {
        await deleteSubject(id)
      }
      toast.success('Record deleted successfully!')
      loadHierarchyData(tab)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete record')
    }
  }

  // Users from localStorage
  const users = JSON.parse(localStorage.getItem('skills021_users') || '[]')

  const openAdd = (type?: string) => {
    if (type === 'resource') {
      // Reset resource form
      setResTitle(''); setResDescription(''); setResAuthor('Skills021 Team')
      setResUploadFile(null); setResUploadProgress(0); setResUploadStatus('idle'); setResExistingFileUrl('')
      setResIsPremium(false); setResPrice(0); setResStatus('Draft')
      setSelectedCollegeId(''); setSelectedCourseId(''); setSelectedBranchId('')
      setSelectedSemesterId(''); setSelectedSubjectId(''); setSelectedResourceTypeId('')
      setCourses([]); setBranches([]); setSemesters([]); setSubjects([])
    }
    setPathfinderErrors({})
    if (type === 'pathfinder-career') {
      setEditItem({ ...emptyCareerForm, _type: type })
    } else if (type === 'pathfinder-exam') {
      setEditItem({ ...emptyExamForm, _type: type })
    } else if (type === 'pathfinder-mapping') {
      setEditItem({ _type: type, career_path_id: '', exam_ids: [] })
    } else {
      setEditItem({ _type: type })
    }
    setShowModal(true)
  }
  const openEdit = async (item: any) => {
    if (item._type === 'resource') {
      // Pre-fill resource form fields for editing
      setResTitle(item.title || ''); setResDescription(item.description || '')
      setResAuthor(item.author || '')
      setResUploadFile(null); setResUploadProgress(0); setResUploadStatus('idle'); setResExistingFileUrl(item.downloadUrl || '')
      setResIsPremium(item.isPremium || false)
      setResPrice(item.price || 0); setResStatus(item.status || 'Draft')
      // Note: hierarchy dropdowns won't be pre-selected on edit since we don't store IDs in Resource
      // The admin can change them if needed, otherwise they remain unchanged
      setSelectedCollegeId(''); setSelectedCourseId(''); setSelectedBranchId('')
      setSelectedSemesterId(''); setSelectedSubjectId(''); setSelectedResourceTypeId('')
      setCourses([]); setBranches([]); setSemesters([]); setSubjects([])
    }
    setPathfinderErrors({})
    if (item._type === 'pathfinder-career') {
      setEditItem({
        ...emptyCareerForm,
        ...item,
        required_skills_text: joinList(item.required_skills),
        industries_text: joinList(item.industries),
      })
      setShowModal(true)
    } else if (item._type === 'pathfinder-mapping') {
      setPathfinderLoading(true)
      try {
        const freshMapping = await getMappingsForCareer(item.career_path_id)
        if (freshMapping) {
          setEditItem({
            ...freshMapping,
            _type: 'pathfinder-mapping',
            id: String(freshMapping.career_path_id),
            career_path_id: String(freshMapping.career_path_id),
            exam_ids: freshMapping.exam_ids || []
          })
        } else {
          setEditItem({
            ...item,
            exam_ids: []
          })
        }
        setShowModal(true)
      } catch (err) {
        console.error('Failed to load mapping for edit:', err)
        toast.error('Failed to load mapping details')
      } finally {
        setPathfinderLoading(false)
      }
    } else {
      setEditItem(item)
      setShowModal(true)
    }
  }
  const closeModal = () => { setShowModal(false); setEditItem(null); setPathfinderErrors({}) }

  // ─── Overview ───────────────────────────────────────────────────────────────
  const renderOverview = () => {
    const statsCards = [
      { label: 'Total Courses', val: content.courses.length, icon: BookOpen, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
      { label: 'Resources', val: dbResources.length, icon: FileText, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
      { label: 'Quizzes', val: content.quizzes.length, icon: HelpCircle, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
      { label: 'Roadmaps', val: content.roadmaps.length, icon: Map, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
      { label: 'Active Mentors', val: mentors.mentors.filter(m => m.status === 'Active').length, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
      { label: 'Total Users', val: users.length, icon: Users, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    ]

    const totalDownloads = dbResources.reduce((a, r) => a + (r.downloads ?? 0), 0)
    const totalEnrolled = content.courses.reduce((a, c) => a + (c.enrolled ?? 0), 0)
    const totalQuizParticipants = content.quizzes.reduce((a, q) => a + (q.participants ?? 0), 0)
    const totalSessions = mentors.sessions.length

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Admin Overview</h2>
          <p className="text-brand-muted dark:text-brand-dark-muted mt-1">Skill021 Super Admin Panel — Full Control</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statsCards.map(s => (
            <div key={s.label} className="card p-5">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div className="text-3xl font-bold text-brand-text dark:text-brand-dark-text">{s.val}</div>
              <div className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { val: (totalDownloads ?? 0).toLocaleString(), label: 'Resource Downloads', icon: Download, color: 'text-teal-500' },
            { val: (totalEnrolled ?? 0).toLocaleString(), label: 'Course Enrollments', icon: BookOpen, color: 'text-primary-500' },
            { val: (totalQuizParticipants ?? 0).toLocaleString(), label: 'Quiz Participants', icon: HelpCircle, color: 'text-purple-500' },
            { val: totalSessions.toString(), label: 'Mentor Sessions', icon: CheckCircle, color: 'text-green-500' },
          ].map(m => (
            <div key={m.label} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                <m.icon size={18} className={m.color} />
              </div>
              <div>
                <div className="text-xl font-bold text-brand-text dark:text-brand-dark-text">{m.val}</div>
                <div className="text-[11px] text-brand-muted dark:text-brand-dark-muted">{m.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="card p-5">
          <h3 className="font-bold text-brand-text dark:text-brand-dark-text mb-4 flex items-center gap-2">
            <Zap size={16} className="text-primary-500" /> Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Add Course', tab: 'courses', color: 'bg-primary-500' },
              { label: 'Add Resource', tab: 'resources', color: 'bg-teal-500' },
              { label: 'Create Quiz', tab: 'quizzes', color: 'bg-purple-500' },
              { label: 'Add Mentor', tab: 'mentorship', color: 'bg-indigo-500' },
            ].map(a => (
              <button
                key={a.label}
                onClick={() => setActiveTab(a.tab as AdminTab)}
                className={`${a.color} text-white py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity`}
              >
                <Plus size={13} /> {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Courses */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-brand-border dark:border-brand-dark-border">
            <h3 className="font-bold text-brand-text dark:text-brand-dark-text text-sm flex items-center gap-2">
              <BookOpen size={15} className="text-primary-500" /> Recent Courses
            </h3>
          </div>
          <div className="divide-y divide-brand-border dark:divide-brand-dark-border">
            {content.courses.slice(0, 5).map(c => (
              <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-text dark:text-brand-dark-text truncate">{c.title}</p>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted">{(c.enrolled ?? 0).toLocaleString()} enrolled</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Courses ────────────────────────────────────────────────────────────────
  const renderCourses = () => {
    const filtered = content.courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    return (
      <div>
        <SectionHeader title="Manage Courses" count={content.courses.length} onAdd={() => openAdd('course')} addLabel="Add Course" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search courses..." />
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Title', 'Group', 'Subcategory', 'Price', 'Enrolled', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text max-w-[180px] truncate">{c.title}</td>
                    <td className="px-4 py-3 text-xs text-brand-muted dark:text-brand-dark-muted whitespace-nowrap">{c.group}</td>
                    <td className="px-4 py-3"><span className="badge bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs">{c.subcategory}</span></td>
                    <td className="px-4 py-3 font-medium">{c.price === 'FREE' ? <span className="text-green-500">FREE</span> : `₹${c.price}`}</td>
                    <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted">{(c.enrolled ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => content.toggleCourseStatus(c.id)} title={c.status === 'Published' ? 'Unpublish' : 'Publish'} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted dark:text-brand-dark-muted transition-colors">{c.status === 'Published' ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                        <button onClick={() => openEdit({ ...c, _type: 'course' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteId({ id: c.id, title: c.title, type: 'course' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ─── Resources ──────────────────────────────────────────────────────────────
  const renderResources = () => {
    const filtered = dbResources.filter(r => r.title.toLowerCase().includes(search.toLowerCase()))
    return (
      <div>
        <SectionHeader title="Manage Resources" count={dbResources.length} onAdd={() => openAdd('resource')} addLabel="Add Resource" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search resources..." />

        {resourcesLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-brand-muted dark:text-brand-dark-muted mb-3" />
            <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Loading resources...</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>{['Title', 'Type', 'College', 'Subject', 'Author', 'Downloads', 'Premium', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text max-w-[180px] truncate">{r.title}</td>
                      <td className="px-4 py-3"><span className="badge bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-xs">{r.type}</span></td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{r.college || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{r.subject || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{r.author}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted">{(r.downloads ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3">{r.isPremium ? <span className="badge bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-xs">₹{r.price ?? 0}</span> : <span className="badge bg-green-50 dark:bg-green-900/20 text-green-600 text-xs">Free</span>}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={async () => {
                            try {
                              const updated = await toggleResourceStatusApi(r.id, r.status)
                              setDbResources(prev => prev.map(res => res.id === r.id ? updated : res))
                              toast.success(`Resource ${updated.status === 'Published' ? 'published' : 'unpublished'}`)
                            } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to toggle status') }
                          }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><EyeOff size={14} /></button>
                          <button onClick={() => openEdit({ ...r, _type: 'resource' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteId({ id: r.id, title: r.title, type: 'resource' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !resourcesLoading && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-brand-muted text-sm">No resources found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Quizzes ─────────────────────────────────────────────────────────────
  const renderQuizzes = () => {
    const filtered = content.quizzes.filter(q => q.title.toLowerCase().includes(search.toLowerCase()))
    return (
      <div>
        <SectionHeader title="Manage Quizzes" count={content.quizzes.length} onAdd={() => openAdd('quiz')} addLabel="Add Quiz" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search quizzes..." />
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Title', 'Category', 'Difficulty', 'Questions', 'Time', 'Participants', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {filtered.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text max-w-[180px] truncate">{q.title}</td>
                    <td className="px-4 py-3"><span className="badge bg-primary-50 dark:bg-primary-900/20 text-primary-600 text-xs">{q.category}</span></td>
                    <td className="px-4 py-3"><span className={`badge text-xs ${q.difficulty === 'Easy' ? 'bg-green-50 text-green-600' : q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{q.difficulty}</span></td>
                    <td className="px-4 py-3 text-center text-brand-muted">{q.questions.length}</td>
                    <td className="px-4 py-3 text-brand-muted">{q.timeLimit}m</td>
                    <td className="px-4 py-3 text-brand-muted">{(q.participants ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => content.toggleQuizStatus(q.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><EyeOff size={14} /></button>
                        <button onClick={() => openEdit({ ...q, _type: 'quiz' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteId({ id: q.id, title: q.title, type: 'quiz' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ─── Roadmaps ─────────────────────────────────────────────────────────────
  const renderRoadmaps = () => {
    const filtered = content.roadmaps.filter(r => r.title.toLowerCase().includes(search.toLowerCase()))
    return (
      <div>
        <SectionHeader title="Manage Roadmaps" count={content.roadmaps.length} onAdd={() => openAdd('roadmap')} addLabel="Add Roadmap" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search roadmaps..." />
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Title', 'Category', 'Steps', 'Duration', 'Views', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text max-w-[180px] truncate">{r.title}</td>
                    <td className="px-4 py-3"><span className="badge bg-green-50 dark:bg-green-900/20 text-green-600 text-xs">{r.category}</span></td>
                    <td className="px-4 py-3 text-center text-brand-muted">{r.steps.length}</td>
                    <td className="px-4 py-3 text-brand-muted text-xs">{r.totalDuration}</td>
                    <td className="px-4 py-3 text-brand-muted">{(r.views ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => content.toggleRoadmapStatus(r.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><EyeOff size={14} /></button>
                        <button onClick={() => openEdit({ ...r, _type: 'roadmap' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteId({ id: r.id, title: r.title, type: 'roadmap' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ─── Mentorship ─────────────────────────────────────────────────────────────
  const renderMentorship = () => (
    <div className="space-y-6">
      <SectionHeader title="Manage Mentors" count={mentors.mentors.length} onAdd={() => openAdd('mentor')} addLabel="Add Mentor" />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>{['Mentor', 'Company', 'Services', 'Sessions', 'Rating', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
              {mentors.mentors.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-brand-text dark:text-brand-dark-text">{m.name}</p>
                      <p className="text-xs text-brand-muted">{m.designation}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-muted text-xs">{m.company}</td>
                  <td className="px-4 py-3 text-brand-muted text-xs">{m.services.length} services</td>
                  <td className="px-4 py-3 text-brand-muted">{(m.sessions ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-amber-500 font-semibold">⭐ {m.rating}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => mentors.toggleMentorStatus(m.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><EyeOff size={14} /></button>
                      <button onClick={() => openEdit({ ...m, _type: 'mentor' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteId({ id: m.id, title: m.name, type: 'mentor' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sessions */}
      <div>
        <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-4">Sessions ({mentors.sessions.length})</h3>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Student', 'Mentor', 'Service', 'Date', 'Fee', 'Status', 'Update'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {mentors.sessions.map(s => {
                  const mentor = mentors.mentors.find(m => m.id === s.mentorId)
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text">{s.studentName}</td>
                      <td className="px-4 py-3 text-brand-muted text-xs">{mentor?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-brand-muted text-xs">{s.serviceType}</td>
                      <td className="px-4 py-3 text-brand-muted text-xs">{s.date} {s.time}</td>
                      <td className="px-4 py-3 font-semibold text-green-600">₹{s.fee}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3">
                        <select
                          value={s.status}
                          onChange={e => mentors.updateSessionStatus(s.id, e.target.value as any)}
                          className="text-xs px-2 py-1 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text focus:outline-none"
                        >
                          {['Pending', 'Confirmed', 'Completed', 'Cancelled'].map(st => <option key={st}>{st}</option>)}
                        </select>
                      </td>
                    </tr>
                  )
                })}
                {mentors.sessions.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-brand-muted text-sm">No sessions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── YouTube Videos ──────────────────────────────────────────────────────────
  const renderYoutubeVideos = () => {
    const videoStore = useVideoStore()
    const videos = videoStore.videos
    const [editingVideo, setEditingVideo] = useState<YouTubeVideo | null>(null)
    const [formData, setFormData] = useState<Partial<YouTubeVideo>>({
      youtubeUrl: '',
      title: '',
      description: '',
      category: 'DSA',
      featured: false,
      status: 'Draft',
    })
    const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null)

    const categories: Array<import('../store/videoStore').VideoCategory> = [
      'DSA', 'JEE', 'NEET', 'AI/ML', 'Counseling', 'Career Guidance', 'Interview Prep', 'Web Development', 'Python', 'Aptitude', 'Study Tips'
    ]

    const handleAdd = () => {
      setEditingVideo(null)
      setFormData({ youtubeUrl: '', title: '', description: '', category: 'DSA', featured: false, status: 'Draft' })
    }

    const handleEdit = (video: YouTubeVideo) => {
      setEditingVideo(video)
      setFormData(video)
    }

    const handleSave = () => {
      if (!formData.youtubeUrl || !formData.title) {
        toast.error('Please fill in required fields')
        return
      }
      if (editingVideo) {
        videoStore.updateVideo(editingVideo.id, formData as Partial<YouTubeVideo>)
        toast.success('Video updated successfully')
      } else {
        videoStore.addVideo(formData as Omit<YouTubeVideo, 'id' | 'createdAt' | 'videoId' | 'thumbnail'>)
        toast.success('Video added successfully')
      }
      setEditingVideo(null)
      setFormData({ youtubeUrl: '', title: '', description: '', category: 'DSA', featured: false, status: 'Draft' })
    }

    const handleDelete = (id: string) => {
      videoStore.deleteVideo(id)
      toast.success('Video deleted successfully')
      setDeleteVideoId(null)
    }

    const filtered = videos.filter(v => v.title.toLowerCase().includes(search.toLowerCase()))

    return (
      <div>
        <SectionHeader title="YouTube Videos" count={videos.length} onAdd={handleAdd} addLabel="Add Video" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search videos..." />

        {/* Edit Form */}
        {editingVideo !== null && (
          <div className="card p-6 mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-4">{editingVideo ? 'Edit Video' : 'Add New Video'}</h3>
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-semibold text-brand-text dark:text-brand-dark-text mb-2 block">YouTube URL *</label>
                <input type="url" value={formData.youtubeUrl || ''} onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="w-full px-3 py-2 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text text-sm" />
              </div>
              <div>
                <label className="text-sm font-semibold text-brand-text dark:text-brand-dark-text mb-2 block">Video Title *</label>
                <input type="text" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Enter video title" className="w-full px-3 py-2 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text text-sm" />
              </div>
              <div>
                <label className="text-sm font-semibold text-brand-text dark:text-brand-dark-text mb-2 block">Description</label>
                <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Enter video description" rows={3} className="w-full px-3 py-2 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-brand-text dark:text-brand-dark-text mb-2 block">Category</label>
                  <select value={formData.category || 'DSA'} onChange={(e) => setFormData({ ...formData, category: e.target.value as any })} className="w-full px-3 py-2 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text text-sm">
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-brand-text dark:text-brand-dark-text mb-2 block">Status</label>
                  <select value={formData.status || 'Draft'} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Published' | 'Draft' })} className="w-full px-3 py-2 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text text-sm">
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="featured" checked={formData.featured || false} onChange={(e) => setFormData({ ...formData, featured: e.target.checked })} className="rounded" />
                <label htmlFor="featured" className="text-sm font-semibold text-brand-text dark:text-brand-dark-text">Featured Video</label>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} className="flex-1 py-2.5 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600">Save Video</button>
                <button onClick={() => { setEditingVideo(null); setFormData({ youtubeUrl: '', title: '', description: '', category: 'DSA', featured: false, status: 'Draft' }) }} className="flex-1 py-2.5 border border-brand-border dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-white/5">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Videos List */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Thumbnail', 'Title', 'Category', 'Status', 'Featured', 'Order', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {filtered.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <img src={video.thumbnail} alt={video.title} className="w-16 h-9 rounded object-cover" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/64x36?text=Thumbnail' }} />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-brand-text dark:text-brand-dark-text line-clamp-1">{video.title}</div>
                        <div className="text-xs text-brand-muted dark:text-brand-dark-muted">{video.uploadDate}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{video.category}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={video.status} /></td>
                    <td className="px-4 py-3">{video.featured ? '⭐ Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-center">{video.order}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => videoStore.toggleFeatured(video.id)} className="p-1.5 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/20 text-yellow-600" title="Toggle featured">⭐</button>
                        <button onClick={() => videoStore.toggleVideoStatus(video.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><EyeOff size={14} /></button>
                        <button onClick={() => handleEdit(video)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteVideoId(video.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-brand-muted text-sm">No videos found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete Modal */}
        <AnimatePresence>
          {deleteVideoId && (
            <DeleteModal
              title={videos.find(v => v.id === deleteVideoId)?.title || ''}
              onConfirm={() => handleDelete(deleteVideoId)}
              onCancel={() => setDeleteVideoId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ─── Users ──────────────────────────────────────────────────────────────────
  const renderUsers = () => {
    const filtered = users.filter((u: any) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    return (
      <div>
        <SectionHeader title="Manage Users" count={users.length} />
        <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Name', 'Email', 'College', 'Role', 'Joined', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text">{u.name}</td>
                    <td className="px-4 py-3 text-brand-muted text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-brand-muted text-xs">{u.college}</td>
                    <td className="px-4 py-3"><span className={`badge text-xs ${u.role === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                    <td className="px-4 py-3 text-brand-muted text-xs">{u.joinedDate}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.disabled ? 'Inactive' : 'Active'} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-muted text-sm">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ─── Settings ────────────────────────────────────────────────────────────────
  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Platform Settings</h2>
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <Shield size={24} className="text-primary-500" />
          </div>
          <div>
            <h3 className="font-bold text-brand-text dark:text-brand-dark-text">Admin Panel</h3>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted">Manage platform configurations</p>
          </div>
        </div>
        {[
          { label: 'Platform Name', val: 'Skill021' },
          { label: 'YouTube Channel', val: 'youtube.com/@skills021' },
          { label: 'Total Courses', val: content.courses.length.toString() },
          { label: 'Total Resources', val: dbResources.length.toString() },
          { label: 'Active Mentors', val: mentors.mentors.filter(m => m.status === 'Active').length.toString() },
          { label: 'Total Active Users', val: users.filter((u: any) => !u.disabled).length.toString() },
          { label: 'Total Mentor Sessions', val: mentors.sessions.length.toString() },
        ].map(s => (
          <div key={s.label} className="flex items-center justify-between py-3 border-b border-brand-border dark:border-brand-dark-border">
            <span className="text-sm font-medium text-brand-text dark:text-brand-dark-text">{s.label}</span>
            <span className="text-sm text-brand-muted dark:text-brand-dark-muted font-mono">{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // ─── Academic Hierarchy Tab ──────────────────────────────────────────────────
  const renderHierarchy = () => {
    const searchLower = search.toLowerCase()

    let filteredItems: any[] = []
    if (hierarchyTab === 'colleges') {
      filteredItems = hColleges.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        (c.short_name ?? '').toLowerCase().includes(searchLower) ||
        (c.city ?? '').toLowerCase().includes(searchLower) ||
        (c.state ?? '').toLowerCase().includes(searchLower)
      )
    } else if (hierarchyTab === 'courses') {
      filteredItems = hCourses.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        (c.colleges?.name ?? '').toLowerCase().includes(searchLower)
      )
    } else if (hierarchyTab === 'branches') {
      filteredItems = hBranches.filter(b =>
        b.name.toLowerCase().includes(searchLower) ||
        (b.code ?? '').toLowerCase().includes(searchLower) ||
        (b.courses?.name ?? '').toLowerCase().includes(searchLower) ||
        (b.courses?.colleges?.name ?? '').toLowerCase().includes(searchLower)
      )
    } else if (hierarchyTab === 'semesters') {
      filteredItems = hSemesters.filter(s =>
        String(s.semester_number).includes(searchLower) ||
        (s.branches?.name ?? '').toLowerCase().includes(searchLower) ||
        (s.branches?.courses?.name ?? '').toLowerCase().includes(searchLower) ||
        (s.branches?.courses?.colleges?.name ?? '').toLowerCase().includes(searchLower)
      )
    } else if (hierarchyTab === 'subjects') {
      filteredItems = hSubjects.filter(s =>
        s.name.toLowerCase().includes(searchLower) ||
        (s.code ?? '').toLowerCase().includes(searchLower) ||
        (s.semesters?.branches?.name ?? '').toLowerCase().includes(searchLower) ||
        (s.semesters?.branches?.courses?.name ?? '').toLowerCase().includes(searchLower) ||
        (s.semesters?.branches?.courses?.colleges?.name ?? '').toLowerCase().includes(searchLower)
      )
    }

    const subTabs = [
      { id: 'colleges', label: 'Colleges' },
      { id: 'courses', label: 'Courses' },
      { id: 'branches', label: 'Branches' },
      { id: 'semesters', label: 'Semesters' },
      { id: 'subjects', label: 'Subjects' },
    ] as const

    const getAddLabel = () => {
      switch (hierarchyTab) {
        case 'colleges': return 'Add College'
        case 'courses': return 'Add Course'
        case 'branches': return 'Add Branch'
        case 'semesters': return 'Add Semester'
        case 'subjects': return 'Add Subject'
      }
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">🎓 Academic Hierarchy</h2>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5 font-medium">Manage colleges, courses, branches, semesters, and subjects</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadHierarchyData(hierarchyTab)}
              disabled={hierarchyLoading}
              title="Refresh records"
              className="p-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center disabled:opacity-55"
            >
              <RotateCw size={15} className={hierarchyLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={openAddHierarchy} className="flex items-center gap-2 btn-primary text-sm py-2.5 px-4">
              <Plus size={15} /> {getAddLabel()}
            </button>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-1 border-b border-brand-border dark:border-brand-dark-border">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setHierarchyTab(tab.id); setSearch('') }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${hierarchyTab === tab.id
                ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black shadow-sm'
                : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <SearchBar value={search} onChange={setSearch} placeholder={`Search ${hierarchyTab}...`} />

        {hierarchyLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-brand-muted dark:text-brand-dark-muted mb-3" />
            <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Loading hierarchy records...</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  {hierarchyTab === 'colleges' && (
                    <tr>
                      {['College Name', 'Short Name', 'City', 'State', 'Created At', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  )}
                  {hierarchyTab === 'courses' && (
                    <tr>
                      {['College', 'Course Name', 'Duration', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  )}
                  {hierarchyTab === 'branches' && (
                    <tr>
                      {['College', 'Course', 'Branch Name', 'Code', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  )}
                  {hierarchyTab === 'semesters' && (
                    <tr>
                      {['College', 'Course', 'Branch', 'Semester Number', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  )}
                  {hierarchyTab === 'subjects' && (
                    <tr>
                      {['College', 'Course', 'Branch', 'Semester', 'Subject Name', 'Code', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                  {/* Colleges Table Body */}
                  {hierarchyTab === 'colleges' && filteredItems.map((item: College) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-semibold text-brand-text dark:text-brand-dark-text">{item.name}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{item.short_name || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{item.city || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{item.state || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{(item as any).created_at ? new Date((item as any).created_at).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditHierarchy('colleges', item)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => setHierarchyDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Courses Table Body */}
                  {hierarchyTab === 'courses' && filteredItems.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs font-semibold">{item.colleges?.name || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-brand-text dark:text-brand-dark-text">{item.name}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{item.duration || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditHierarchy('courses', item)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => setHierarchyDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Branches Table Body */}
                  {hierarchyTab === 'branches' && filteredItems.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{item.courses?.colleges?.name || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs font-semibold">{item.courses?.name || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-brand-text dark:text-brand-dark-text">{item.name}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{item.code || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditHierarchy('branches', item)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => setHierarchyDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Semesters Table Body */}
                  {hierarchyTab === 'semesters' && filteredItems.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{item.branches?.courses?.colleges?.name || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{item.branches?.courses?.name || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs font-semibold">{item.branches?.name || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-brand-text dark:text-brand-dark-text">Semester {item.semester_number}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditHierarchy('semesters', item)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => setHierarchyDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Subjects Table Body */}
                  {hierarchyTab === 'subjects' && filteredItems.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{item.semesters?.branches?.courses?.colleges?.name || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{item.semesters?.branches?.courses?.name || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{item.semesters?.branches?.name || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">Sem {item.semesters?.semester_number}</td>
                      <td className="px-4 py-3 font-semibold text-brand-text dark:text-brand-dark-text">{item.name}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{item.code || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditHierarchy('subjects', item)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => setHierarchyDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-brand-muted text-sm">
                        No hierarchy records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── PathFinder Career Paths ──────────────────────────────────────────────
  const renderPathfinderCareers = () => {
    const filtered = careerPaths.filter(c =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.short_description.toLowerCase().includes(search.toLowerCase())
    )

    return (
      <div>
        <SectionHeader title="Career Paths" count={careerPaths.length} onAdd={() => openAdd('pathfinder-career')} addLabel="Add Career Path" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search career paths..." />

        {pathfinderLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-brand-muted dark:text-brand-dark-muted mb-3" />
            <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Loading career paths...</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>{['Icon', 'Career Name', 'Short Description', 'Average Salary', 'Education Required', 'Created Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                  {filtered.map(career => (
                    <tr key={career.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-500 flex items-center justify-center">
                          <Compass size={16} />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-brand-text dark:text-brand-dark-text whitespace-nowrap">{career.title}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs max-w-[260px] truncate">{career.short_description}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs whitespace-nowrap">{career.average_salary || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs max-w-[220px] truncate">{career.education_required || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs whitespace-nowrap">{formatAdminDate(career.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit({ ...career, _type: 'pathfinder-career' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteId({ id: career.id, title: career.title, type: 'pathfinder-career' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-brand-muted text-sm">No career paths found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── PathFinder Exams ─────────────────────────────────────────────────────
  const renderPathfinderExams = () => {
    const pageSize = 8
    const filtered = pathfinderExams
      .filter(exam =>
        exam.title.toLowerCase().includes(search.toLowerCase()) ||
        exam.conducting_body.toLowerCase().includes(search.toLowerCase()) ||
        (exam.course || '').toLowerCase().includes(search.toLowerCase()) ||
        (exam.branch || '').toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const aVal = a[examSort] || ''
        const bVal = b[examSort] || ''
        const result = String(aVal).localeCompare(String(bVal))
        return examSortDir === 'asc' ? result : -result
      })
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const currentPage = Math.min(examPage, totalPages)
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const toggleSort = (key: typeof examSort) => {
      if (examSort === key) setExamSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
      else {
        setExamSort(key)
        setExamSortDir('asc')
      }
    }

    return (
      <div>
        <SectionHeader title="PathFinder Exams" count={pathfinderExams.length} onAdd={() => openAdd('pathfinder-exam')} addLabel="Add Exam" />
        <SearchBar value={search} onChange={(value) => { setSearch(value); setExamPage(1) }} placeholder="Search exams..." />

        {pathfinderLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-brand-muted dark:text-brand-dark-muted mb-3" />
            <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Loading exams...</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    {[
                      ['Exam Name', 'title'],
                      ['Conducting Body', null],
                      ['Exam Type', null],
                      ['Registration End', 'registration_end'],
                      ['Exam Date', 'exam_date'],
                      ['Course', null],
                      ['Branch', null],
                      ['Status', 'status'],
                      ['Actions', null],
                    ].map(([label, key]) => (
                      <th key={label} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">
                        {key ? (
                          <button onClick={() => toggleSort(key as typeof examSort)} className="font-semibold hover:text-primary-500 transition-colors">
                            {label} {examSort === key ? (examSortDir === 'asc' ? '↑' : '↓') : ''}
                          </button>
                        ) : label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                  {paginated.map(exam => (
                    <tr key={exam.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-semibold text-brand-text dark:text-brand-dark-text max-w-[220px] truncate">{exam.title}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{exam.conducting_body}</td>
                      <td className="px-4 py-3"><span className="badge bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs">{exam.exam_type}</span></td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs whitespace-nowrap">{formatAdminDate(exam.registration_end)}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs whitespace-nowrap">{formatAdminDate(exam.exam_date)}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{exam.course || '—'}</td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{exam.branch || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={exam.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit({ ...exam, _type: 'pathfinder-exam' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteId({ id: exam.id, title: exam.title, type: 'pathfinder-exam' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-brand-muted text-sm">No exams found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-brand-border dark:border-brand-dark-border">
              <p className="text-xs text-brand-muted dark:text-brand-dark-muted">Page {currentPage} of {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setExamPage(page => Math.max(1, page - 1))} disabled={currentPage === 1} className="px-3 py-2 rounded-lg border border-brand-border dark:border-brand-dark-border text-xs font-semibold disabled:opacity-40">Previous</button>
                <button onClick={() => setExamPage(page => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="px-3 py-2 rounded-lg border border-brand-border dark:border-brand-dark-border text-xs font-semibold disabled:opacity-40">Next</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── PathFinder Career Mapping ────────────────────────────────────────────
  const renderPathfinderMappings = () => {
    const filtered = careerMappings.filter(mapping => {
      const careerName = careerPaths.find(career => career.id === mapping.career_path_id)?.title || mapping.career_paths?.title || ''
      return careerName.toLowerCase().includes(search.toLowerCase())
    })

    const getExamNames = (mapping: CareerMappingRow) =>
      mapping.exams?.map(exam => exam.title).filter(Boolean).join(', ') || '—'

    return (
      <div>
        <SectionHeader title="Career Mapping" count={careerMappings.length} onAdd={() => openAdd('pathfinder-mapping')} addLabel="Add Mapping" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search mappings..." />

        {pathfinderLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-brand-muted dark:text-brand-dark-muted mb-3" />
            <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Loading mappings...</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>{['Career', 'Related Exams', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                  {filtered.map(mapping => {
                    const career = careerPaths.find(item => item.id === mapping.career_path_id)
                    return (
                      <tr key={mapping.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-3 font-semibold text-brand-text dark:text-brand-dark-text">{career?.title || mapping.career_paths?.title || '—'}</td>
                        <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs max-w-[520px]">{getExamNames(mapping)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit({ ...mapping, _type: 'pathfinder-mapping' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                            <button onClick={() => setDeleteId({ id: mapping.career_path_id, title: career?.title || 'Career Mapping', type: 'pathfinder-mapping' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-brand-muted text-sm">No mappings found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Delete handler ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return
    const { id, type, title } = deleteId

    if (type === 'resource') {
      // Delete from Supabase
      try {
        await deleteResourceApi(id)
        setDbResources(prev => prev.filter(r => r.id !== id))
        toast.success(`${title} deleted successfully`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete resource')
      }
    } else if (type === 'pathfinder-career') {
      try {
        await deleteCareerPath(id)
        await loadPathfinderCareers()
        toast.success(`${title} deleted successfully`)
      } catch (err) {
        console.error('Failed to delete career path:', err)
        toast.error(err instanceof Error ? err.message : 'Failed to delete career path')
      }
    } else if (type === 'pathfinder-exam') {
      try {
        await deleteExam(id)
        await loadPathfinderExams()
        toast.success(`${title} deleted successfully`)
      } catch (err) {
        console.error('Failed to delete exam:', err)
        toast.error(err instanceof Error ? err.message : 'Failed to delete exam')
      }
    } else if (type === 'pathfinder-mapping') {
      try {
        await deleteCareerMapping(id)
        await loadPathfinderMappings()
        toast.success(`${title} deleted successfully`)
      } catch (err) {
        console.error('Failed to delete mapping:', err)
        toast.error(err instanceof Error ? err.message : 'Failed to delete mapping')
      }
    } else {
      switch (type) {
        case 'course': content.deleteCourse(id); break
        case 'quiz': content.deleteQuiz(id); break
        case 'roadmap': content.deleteRoadmap(id); break
        case 'mentor': mentors.deleteMentor(id); break
      }
      toast.success(`${title} deleted successfully`)
    }
    setDeleteId(null)
  }

  // ─── Quick Add Modal ─────────────────────────────────────────────────────────
  const renderModal = () => {
    if (!editItem) return null
    const type = editItem._type

    if (type === 'pathfinder-career') {
      const isEditing = !!editItem.id
      const errors = pathfinderErrors

      const handleCareerSave = async () => {
        const nextErrors: Record<string, string> = {}
        if (!editItem.title?.trim()) nextErrors.title = 'Title is required'
        if (!editItem.short_description?.trim()) nextErrors.short_description = 'Short description is required'
        const duplicate = careerPaths.some(career =>
          career.title.toLowerCase() === editItem.title?.trim().toLowerCase() &&
          career.id !== editItem.id
        )
        if (duplicate) nextErrors.title = 'A career path with this title already exists'

        setPathfinderErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) return

        const payload: CareerPathInput = {
          icon: editItem.icon || 'Compass',
          title: editItem.title.trim(),
          short_description: editItem.short_description.trim(),
          full_description: editItem.full_description || '',
          average_salary: editItem.average_salary || '',
          career_growth: editItem.career_growth || '',
          education_required: editItem.education_required || '',
          required_skills: splitList(editItem.required_skills_text ?? editItem.required_skills),
          industries: splitList(editItem.industries_text ?? editItem.industries),
          future_scope: editItem.future_scope || '',
        }

        setPathfinderSaving(true)
        try {
          if (isEditing) {
            await updateCareerPath(editItem.id, payload)
            toast.success('Career path updated!')
          } else {
            await createCareerPath(payload)
            toast.success('Career path added!')
          }
          await loadPathfinderCareers()
          closeModal()
        } catch (err) {
          console.error('Failed to save career path:', err)
          toast.error(err instanceof Error ? err.message : 'Failed to save career path')
        } finally {
          setPathfinderSaving(false)
        }
      }

      return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-2xl w-full shadow-xl my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{isEditing ? 'Edit Career Path' : 'Add Career Path'}</h3>
              <button onClick={closeModal}><X size={18} className="text-brand-muted" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Career Name *">
                  <input value={editItem.title || ''} onChange={e => setEditItem((p: any) => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Fighter Pilot" />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                </Field>
                <Field label="Icon">
                  <input value={editItem.icon || ''} onChange={e => setEditItem((p: any) => ({ ...p, icon: e.target.value }))} className={inputCls} placeholder="Compass" />
                </Field>
              </div>
              <Field label="Short Description *">
                <input value={editItem.short_description || ''} onChange={e => setEditItem((p: any) => ({ ...p, short_description: e.target.value }))} className={inputCls} placeholder="Short card description" />
                {errors.short_description && <p className="text-xs text-red-500 mt-1">{errors.short_description}</p>}
              </Field>
              <Field label="Full Description">
                <textarea value={editItem.full_description || ''} onChange={e => setEditItem((p: any) => ({ ...p, full_description: e.target.value }))} rows={4} className={inputCls + ' resize-none'} placeholder="Complete career overview" />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Average Salary"><input value={editItem.average_salary || ''} onChange={e => setEditItem((p: any) => ({ ...p, average_salary: e.target.value }))} className={inputCls} placeholder="₹8-25 LPA" /></Field>
                <Field label="Career Growth"><input value={editItem.career_growth || ''} onChange={e => setEditItem((p: any) => ({ ...p, career_growth: e.target.value }))} className={inputCls} placeholder="Junior to leadership track" /></Field>
              </div>
              <Field label="Education Required"><input value={editItem.education_required || ''} onChange={e => setEditItem((p: any) => ({ ...p, education_required: e.target.value }))} className={inputCls} placeholder="10+2 PCM, B.Tech, Graduation..." /></Field>
              <Field label="Required Skills">
                <input value={editItem.required_skills_text ?? joinList(editItem.required_skills)} onChange={e => setEditItem((p: any) => ({ ...p, required_skills_text: e.target.value }))} className={inputCls} placeholder="Leadership, Physics, Problem solving" />
                <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted mt-1">Separate values with commas.</p>
              </Field>
              <Field label="Industries">
                <input value={editItem.industries_text ?? joinList(editItem.industries)} onChange={e => setEditItem((p: any) => ({ ...p, industries_text: e.target.value }))} className={inputCls} placeholder="Defense, Aerospace, Research" />
              </Field>
              <Field label="Future Scope"><textarea value={editItem.future_scope || ''} onChange={e => setEditItem((p: any) => ({ ...p, future_scope: e.target.value }))} rows={3} className={inputCls + ' resize-none'} placeholder="Future opportunities and growth scope" /></Field>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} disabled={pathfinderSaving} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text">Cancel</button>
              <button onClick={handleCareerSave} disabled={pathfinderSaving} className="flex-1 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-60 flex items-center justify-center gap-2">
                {pathfinderSaving && <Loader2 size={14} className="animate-spin" />}
                {isEditing ? 'Update' : 'Add'} Career
              </button>
            </div>
          </motion.div>
        </div>
      )
    }

    if (type === 'pathfinder-exam') {
      const isEditing = !!editItem.id
      const errors = pathfinderErrors

      const handleExamSave = async () => {
        const nextErrors: Record<string, string> = {}
        if (!editItem.title?.trim()) nextErrors.title = 'Exam name is required'
        if (!editItem.conducting_body?.trim()) nextErrors.conducting_body = 'Conducting body is required'
        if (!editItem.exam_type) nextErrors.exam_type = 'Exam type is required'
        if (!editItem.status) nextErrors.status = 'Status is required'
        if (editItem.official_website && !isValidUrl(editItem.official_website)) nextErrors.official_website = 'Enter a valid URL'
        if (editItem.registration_start && editItem.registration_end && new Date(editItem.registration_end) < new Date(editItem.registration_start)) {
          nextErrors.registration_end = 'Registration end must be after registration start'
        }
        if (editItem.registration_end && editItem.exam_date && new Date(editItem.exam_date) < new Date(editItem.registration_end)) {
          nextErrors.exam_date = 'Exam date must be after registration end'
        }
        if (Number(editItem.application_fee ?? 0) < 0) nextErrors.application_fee = 'Application fee cannot be negative'
        if (editItem.minimum_semester !== null && editItem.minimum_semester !== '' && Number(editItem.minimum_semester) < 1) nextErrors.minimum_semester = 'Minimum semester must be at least 1'
        if (editItem.minimum_percentage !== null && editItem.minimum_percentage !== '' && (Number(editItem.minimum_percentage) < 0 || Number(editItem.minimum_percentage) > 100)) {
          nextErrors.minimum_percentage = 'Minimum percentage must be between 0 and 100'
        }

        setPathfinderErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) return

        const payload: ExamInput = {
          title: editItem.title.trim(),
          conducting_body: editItem.conducting_body.trim(),
          description: editItem.description || '',
          exam_type: editItem.exam_type,
          official_website: editItem.official_website || '',
          registration_start: editItem.registration_start || null,
          registration_end: editItem.registration_end || null,
          exam_date: editItem.exam_date || null,
          result_date: editItem.result_date || null,
          application_fee: editItem.application_fee === '' ? 0 : Number(editItem.application_fee ?? 0),
          selection_process: editItem.selection_process || '',
          eligibility: editItem.eligibility || '',
          course: editItem.course || '',
          branch: editItem.branch || '',
          minimum_semester: editItem.minimum_semester === '' ? null : Number(editItem.minimum_semester ?? 1),
          maximum_age: editItem.maximum_age === '' ? null : Number(editItem.maximum_age ?? 0) || null,
          minimum_percentage: editItem.minimum_percentage === '' ? null : Number(editItem.minimum_percentage ?? 0),
          average_salary: editItem.average_salary || '',
          status: editItem.status,
        }

        setPathfinderSaving(true)
        try {
          if (isEditing) {
            await updateExam(editItem.id, payload)
            toast.success('Exam updated!')
          } else {
            await createExam(payload)
            toast.success('Exam added!')
          }
          await loadPathfinderExams()
          closeModal()
        } catch (err) {
          console.error('Failed to save exam:', err)
          toast.error(err instanceof Error ? err.message : 'Failed to save exam')
        } finally {
          setPathfinderSaving(false)
        }
      }

      const textInput = (key: string, label: string, placeholder = '') => (
        <Field label={label}>
          <input value={editItem[key] || ''} onChange={e => setEditItem((p: any) => ({ ...p, [key]: e.target.value }))} className={inputCls} placeholder={placeholder} />
          {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
        </Field>
      )

      return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-3xl w-full shadow-xl my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{isEditing ? 'Edit Exam' : 'Add Exam'}</h3>
              <button onClick={closeModal}><X size={18} className="text-brand-muted" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {textInput('title', 'Exam Name *', 'AFCAT')}
                {textInput('conducting_body', 'Conducting Body *', 'Indian Air Force')}
              </div>
              <Field label="Description"><textarea value={editItem.description || ''} onChange={e => setEditItem((p: any) => ({ ...p, description: e.target.value }))} rows={3} className={inputCls + ' resize-none'} placeholder="Exam description" /></Field>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Exam Type *">
                  <select value={editItem.exam_type || 'National'} onChange={e => setEditItem((p: any) => ({ ...p, exam_type: e.target.value }))} className={inputCls}>
                    {pathfinderExamTypes.map(item => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Status *">
                  <select value={editItem.status || 'Upcoming'} onChange={e => setEditItem((p: any) => ({ ...p, status: e.target.value }))} className={inputCls}>
                    {pathfinderExamStatuses.map(item => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                {textInput('official_website', 'Official Website', 'https://example.com')}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {textInput('registration_start', 'Registration Start')}
                {textInput('registration_end', 'Registration End')}
                {textInput('exam_date', 'Exam Date')}
                {textInput('result_date', 'Result Date')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {textInput('application_fee', 'Application Fee', '250')}
                {textInput('average_salary', 'Average Salary', '₹8-25 LPA')}
              </div>
              <Field label="Selection Process"><textarea value={editItem.selection_process || ''} onChange={e => setEditItem((p: any) => ({ ...p, selection_process: e.target.value }))} rows={2} className={inputCls + ' resize-none'} placeholder="Written exam, interview, medical..." /></Field>
              <Field label="Eligibility"><textarea value={editItem.eligibility || ''} onChange={e => setEditItem((p: any) => ({ ...p, eligibility: e.target.value }))} rows={2} className={inputCls + ' resize-none'} placeholder="Eligibility summary" /></Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {textInput('course', 'Course', 'B.Tech')}
                {textInput('branch', 'Branch', 'CSE / ECE / Mechanical')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {textInput('minimum_semester', 'Minimum Semester', '1')}
                {textInput('maximum_age', 'Maximum Age', '24')}
                {textInput('minimum_percentage', 'Minimum Percentage', '60')}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} disabled={pathfinderSaving} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text">Cancel</button>
              <button onClick={handleExamSave} disabled={pathfinderSaving} className="flex-1 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-60 flex items-center justify-center gap-2">
                {pathfinderSaving && <Loader2 size={14} className="animate-spin" />}
                {isEditing ? 'Update' : 'Add'} Exam
              </button>
            </div>
          </motion.div>
        </div>
      )
    }

    if (type === 'pathfinder-mapping') {
      const isEditing = !!editItem.id
      const errors = pathfinderErrors
      const selectedExamIds: string[] = editItem.exam_ids || []

      const handleMappingSave = async () => {
        const nextErrors: Record<string, string> = {}
        if (!editItem.career_path_id) nextErrors.career_path_id = 'Career is required'
        if (selectedExamIds.length === 0) nextErrors.exam_ids = 'Select at least one exam'
        const duplicate = careerMappings.some(mapping =>
          mapping.career_path_id === editItem.career_path_id &&
          mapping.career_path_id !== editItem.id
        )
        if (!isEditing && duplicate) nextErrors.career_path_id = 'This career already has a mapping. Edit the existing one instead.'

        setPathfinderErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) return

        setPathfinderSaving(true)
        try {
          if (isEditing) {
            await updateCareerMapping(editItem.career_path_id, { career_path_id: editItem.career_path_id, exam_ids: selectedExamIds })
            toast.success('Mapping updated!')
          } else {
            await createCareerMapping({ career_path_id: editItem.career_path_id, exam_ids: selectedExamIds })
            toast.success('Mapping added!')
          }
          await loadPathfinderMappings()
          closeModal()
        } catch (err) {
          console.error('Failed to save mapping:', err)
          toast.error(err instanceof Error ? err.message : 'Failed to save mapping')
        } finally {
          setPathfinderSaving(false)
        }
      }

      const toggleExam = (examId: any) => {
        const examIdStr = String(examId)
        setEditItem((prev: any) => ({
          ...prev,
          exam_ids: selectedExamIds.includes(examIdStr)
            ? selectedExamIds.filter(id => id !== examIdStr)
            : [...selectedExamIds, examIdStr],
        }))
      }

      return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-xl w-full shadow-xl my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{isEditing ? 'Edit Career Mapping' : 'Add Career Mapping'}</h3>
              <button onClick={closeModal}><X size={18} className="text-brand-muted" /></button>
            </div>
            <div className="space-y-5">
              <Field label="Career *">
                <select value={editItem.career_path_id || ''} onChange={e => setEditItem((p: any) => ({ ...p, career_path_id: e.target.value, id: e.target.value || p.id }))} className={inputCls} disabled={isEditing}>
                  <option value="">Select Career...</option>
                  {careerPaths.map(career => <option key={career.id} value={career.id}>{career.title}</option>)}
                </select>
                {errors.career_path_id && <p className="text-xs text-red-500 mt-1">{errors.career_path_id}</p>}
              </Field>

              <div>
                <p className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-2">Related Exams *</p>
                <div className="border border-brand-border dark:border-brand-dark-border rounded-2xl divide-y divide-brand-border dark:divide-brand-dark-border max-h-72 overflow-y-auto">
                  {pathfinderExams.map(exam => {
                    const isChecked = selectedExamIds.includes(String(exam.id))
                    return (
                      <label key={exam.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleExam(exam.id)} className="mt-0.5 w-4 h-4 accent-primary-500" />
                        <span>
                          <span className="block text-sm font-semibold text-brand-text dark:text-brand-dark-text">{exam.title}</span>
                          <span className="block text-xs text-brand-muted dark:text-brand-dark-muted">{exam.conducting_body} · {exam.status}</span>
                        </span>
                      </label>
                    )
                  })}
                  {pathfinderExams.length === 0 && <p className="px-4 py-6 text-center text-sm text-brand-muted">No exams available.</p>}
                </div>
                {errors.exam_ids && <p className="text-xs text-red-500 mt-1">{errors.exam_ids}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} disabled={pathfinderSaving} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text">Cancel</button>
              <button onClick={handleMappingSave} disabled={pathfinderSaving} className="flex-1 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-60 flex items-center justify-center gap-2">
                {pathfinderSaving && <Loader2 size={14} className="animate-spin" />}
                Save Mapping
              </button>
            </div>
          </motion.div>
        </div>
      )
    }

    // ─── Resource Modal with cascading dropdowns ────────────────────────────
    if (type === 'resource') {
      const isEditing = !!editItem.id

      const handleResourceSave = async () => {
        if (!resTitle) { toast.error('Title is required'); return }

        // Determine if we need file upload
        if (!isEditing && !resUploadFile) {
          toast.error('Please upload a resource file');
          return
        }

        setResourceSaving(true)

        let uploadInterval: any = undefined
        try {
          let fileUrl = resExistingFileUrl

          if (resUploadFile) {
            // Validate hierarchy IDs are loaded for the path if creating
            const finalSubjectId = isEditing ? editItem.subjectId : selectedSubjectId
            if (!finalSubjectId) {
              toast.error('Please select the full academic hierarchy first')
              setResourceSaving(false)
              return
            }

            // Generate clean path
            const cleanPathSegment = (str: string) => {
              return str
                .replace(/[^a-zA-Z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '_')
            }

            const resolvePathSegment = (level: 'college' | 'course' | 'branch' | 'semester' | 'subject') => {
              if (level === 'college') {
                const colId = isEditing ? editItem.collegeId : selectedCollegeId
                const found = colleges.find(c => c.id === colId)
                return cleanPathSegment(found?.short_name || found?.name || editItem.college || 'unknown_college')
              }
              if (level === 'course') {
                const crsId = isEditing ? editItem.courseId : selectedCourseId
                const found = courses.find(c => c.id === crsId)
                return cleanPathSegment(found?.name || editItem.course || 'unknown_course')
              }
              if (level === 'branch') {
                const brId = isEditing ? editItem.branchId : selectedBranchId
                const found = branches.find(b => b.id === brId)
                return cleanPathSegment(found?.code || found?.name || editItem.branch || 'unknown_branch')
              }
              if (level === 'semester') {
                const semId = isEditing ? editItem.semesterId : selectedSemesterId
                const found = semesters.find(s => s.id === semId)
                const num = found?.semester_number || editItem.semester || 'unknown'
                return `Sem${num}`
              }
              if (level === 'subject') {
                const subId = isEditing ? editItem.subjectId : selectedSubjectId
                const found = subjects.find(s => s.id === subId)
                return cleanPathSegment(found?.code || found?.name || editItem.subject || 'unknown_subject')
              }
              return 'unknown'
            }

            const col = resolvePathSegment('college')
            const crs = resolvePathSegment('course')
            const br = resolvePathSegment('branch')
            const sem = resolvePathSegment('semester')
            const sub = resolvePathSegment('subject')
            const timestamp = Math.floor(Date.now() / 1000)
            const sanitizedFilename = cleanPathSegment(resUploadFile.name.split('.').slice(0, -1).join('.')) + '.' + resUploadFile.name.split('.').pop()
            const storagePath = `${col}/${crs}/${br}/${sem}/${sub}/${timestamp}_${sanitizedFilename}`

            // Start simulated progress indicator
            setResUploadStatus('uploading')
            setResUploadProgress(10)
            uploadInterval = setInterval(() => {
              setResUploadProgress(p => {
                if (p >= 90) {
                  clearInterval(uploadInterval)
                  return 90
                }
                return p + 10
              })
            }, 150)

            // Perform storage upload
            fileUrl = await uploadResourceFile(resUploadFile, storagePath)

            clearInterval(uploadInterval)
            setResUploadProgress(100)
            setResUploadStatus('success')

            // Cleanup old file on update
            if (isEditing && resExistingFileUrl) {
              await deleteResourceFile(resExistingFileUrl).catch(err => console.error('Failed to remove old resource file:', err))
            }
          }

          if (isEditing) {
            // Update existing resource
            const updatePayload: any = {
              title: resTitle,
              description: resDescription,
              author: resAuthor,
              fileUrl: fileUrl,
              isPremium: resIsPremium,
              price: resIsPremium ? resPrice : undefined,
              status: resStatus,
            }
            if (selectedSubjectId) updatePayload.subjectId = selectedSubjectId
            if (selectedResourceTypeId) updatePayload.resourceTypeId = selectedResourceTypeId

            const updated = await updateResourceApi(editItem.id, updatePayload)
            setDbResources(prev => prev.map(r => r.id === editItem.id ? updated : r))
            toast.success('Resource updated!')
          } else {
            // Create new resource
            if (!selectedSubjectId) { toast.error('Please select the full hierarchy'); return }
            if (!selectedResourceTypeId) { toast.error('Please select a resource type'); return }

            const input: CreateResourceInput = {
              subjectId: selectedSubjectId as number,
              resourceTypeId: selectedResourceTypeId as number,
              title: resTitle,
              description: resDescription,
              fileUrl: fileUrl,
              author: resAuthor || 'Skills021 Team',
              isPremium: resIsPremium,
              price: resIsPremium ? resPrice : undefined,
              status: resStatus,
            }
            const created = await createResourceApi(input)
            setDbResources(prev => [created, ...prev])
            toast.success('Resource added!')
          }
          closeModal()
        } catch (err) {
          if (uploadInterval) clearInterval(uploadInterval)
          setResUploadStatus('error')
          setResUploadProgress(0)
          toast.error(err instanceof Error ? err.message : 'Failed to save resource')
        } finally {
          setResourceSaving(false)
        }
      }

      return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-lg w-full shadow-xl my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{isEditing ? 'Edit Resource' : 'Add Resource'}</h3>
              <button onClick={closeModal}><X size={18} className="text-brand-muted" /></button>
            </div>
            <div className="space-y-4">
              <Field label="Title *"><input value={resTitle} onChange={e => setResTitle(e.target.value)} className={inputCls} placeholder="Resource title" /></Field>
              <Field label="Description"><textarea value={resDescription} onChange={e => setResDescription(e.target.value)} rows={3} className={inputCls + ' resize-none'} placeholder="Resource description" /></Field>

              {/* Cascading hierarchy dropdowns */}
              {!isEditing && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Hierarchy (Required for new resources)</p>
                  <Field label="College *">
                    <select value={selectedCollegeId} onChange={e => setSelectedCollegeId(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                      <option value="">Select College...</option>
                      {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Course *">
                    <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value ? Number(e.target.value) : '')} className={inputCls} disabled={!selectedCollegeId}>
                      <option value="">Select Course...</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Branch *">
                    <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value ? Number(e.target.value) : '')} className={inputCls} disabled={!selectedCourseId}>
                      <option value="">Select Branch...</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Semester *">
                    <select value={selectedSemesterId} onChange={e => setSelectedSemesterId(e.target.value ? Number(e.target.value) : '')} className={inputCls} disabled={!selectedBranchId}>
                      <option value="">Select Semester...</option>
                      {semesters.map(s => <option key={s.id} value={s.id}>Semester {s.semester_number}</option>)}
                    </select>
                  </Field>
                  <Field label="Subject *">
                    <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value ? Number(e.target.value) : '')} className={inputCls} disabled={!selectedSemesterId}>
                      <option value="">Select Subject...</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                </div>
              )}

              {isEditing && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>Current:</strong> {editItem.college} → {editItem.course} → {editItem.branch} → Sem {editItem.semester} → {editItem.subject}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Hierarchy cannot be changed during edit. To reassign, delete and re-create.</p>
                </div>
              )}

              <Field label="Resource Type *">
                <select value={selectedResourceTypeId} onChange={e => setSelectedResourceTypeId(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                  <option value="">{isEditing ? `Current: ${editItem.type || 'N/A'}` : 'Select Type...'}</option>
                  {resourceTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Author"><input value={resAuthor} onChange={e => setResAuthor(e.target.value)} className={inputCls} placeholder="Skills021 Team" /></Field>
                <Field label="Status">
                  <select value={resStatus} onChange={e => setResStatus(e.target.value as 'Published' | 'Draft')} className={inputCls}>
                    <option>Published</option><option>Draft</option>
                  </select>
                </Field>
              </div>
              {/* File Upload Section */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-brand-text dark:text-brand-dark-text">
                  Upload Resource File *
                </label>
                <div className="border-2 border-dashed border-brand-border dark:border-brand-dark-border rounded-xl p-5 text-center bg-gray-50 dark:bg-brand-dark-bg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors relative group">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'zip']
                        const ext = file.name.split('.').pop()?.toLowerCase() || ''
                        if (!allowed.includes(ext)) {
                          toast.error('Only PDF, DOC, DOCX, PPT, PPTX, and ZIP files are allowed')
                          return
                        }
                        setResUploadFile(file)
                        setResUploadStatus('idle')
                        setResUploadProgress(0)
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FileText className="text-brand-muted dark:text-brand-dark-muted group-hover:scale-105 transition-transform" size={24} />
                    <p className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">
                      {resUploadFile ? 'Change Selected File' : 'Choose File'}
                    </p>
                    <p className="text-[10px] text-brand-muted">
                      Accepts PDF, DOC, DOCX, PPT, PPTX, ZIP (Max 50MB)
                    </p>
                  </div>
                </div>

                {/* File Metadata Info */}
                {(resUploadFile || resExistingFileUrl) && (
                  <div className="p-3 bg-gray-50 dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border rounded-xl flex items-center justify-between text-xs text-brand-text dark:text-brand-dark-text">
                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                      <span className="text-green-500 font-bold">✔</span>
                      <div className="truncate text-left">
                        <p className="font-semibold truncate">{resUploadFile ? resUploadFile.name : 'Current Stored File'}</p>
                        <p className="text-[10px] text-brand-muted">
                          {resUploadFile ? `${(resUploadFile.size / 1024 / 1024).toFixed(2)} MB` : 'Exists in Storage'}
                        </p>
                      </div>
                    </div>
                    {resExistingFileUrl && !resUploadFile && (
                      <span className="text-[10px] bg-primary-50 dark:bg-primary-950/20 text-primary-600 font-semibold px-2 py-0.5 rounded-md truncate max-w-[30%]">
                        Active
                      </span>
                    )}
                  </div>
                )}

                {/* Progress Indicators */}
                {resUploadStatus === 'uploading' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-brand-muted uppercase">
                      <span>Uploading File...</span>
                      <span>{resUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${resUploadProgress}%` }}
                        transition={{ duration: 0.1 }}
                        className="bg-primary-500 h-full rounded-full"
                      />
                    </div>
                  </div>
                )}

                {/* Success/Error Prompts */}
                {resUploadStatus === 'success' && (
                  <p className="text-xs text-green-600 font-semibold flex items-center gap-1.5">
                    <span>✔</span> File uploaded successfully!
                  </p>
                )}
                {resUploadStatus === 'error' && (
                  <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5">
                    <span>❌</span> Upload failed. Please try again.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-brand-text dark:text-brand-dark-text">
                  <input type="checkbox" checked={resIsPremium} onChange={e => setResIsPremium(e.target.checked)} className="rounded" />
                  Premium Resource
                </label>
                {resIsPremium && (
                  <Field label="Price (₹)"><input type="number" value={resPrice} onChange={e => setResPrice(Number(e.target.value))} className={inputCls} placeholder="99" /></Field>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text" disabled={resUploadStatus === 'uploading'}>Cancel</button>
              <button onClick={handleResourceSave} disabled={resourceSaving || resUploadStatus === 'uploading'} className="flex-1 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-60 flex items-center justify-center gap-2">
                {(resourceSaving || resUploadStatus === 'uploading') && <Loader2 size={14} className="animate-spin" />}
                {isEditing ? 'Update' : 'Add'} Resource
              </button>
            </div>
          </motion.div>
        </div>
      )
    }

    // Simplified quick-add modal for courses
    if (type === 'course') {
      const handleSave = () => {
        if (!editItem.title) { toast.error('Title required'); return }
        if (editItem.id) {
          content.updateCourse(editItem.id, editItem)
          toast.success('Course updated!')
        } else {
          content.addCourse({ ...editItem, modules: [], enrolled: 0, rating: 4.5, reviews: 0, tags: [], gradientFrom: '#6C63FF', gradientTo: '#00BFA6', status: editItem.status || 'Draft' })
          toast.success('Course added!')
        }
        closeModal()
      }
      return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-lg w-full shadow-xl my-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{editItem.id ? 'Edit Course' : 'Add Course'}</h3>
              <button onClick={closeModal}><X size={18} className="text-brand-muted" /></button>
            </div>
            <div className="space-y-4">
              <Field label="Title *"><input value={editItem.title || ''} onChange={e => setEditItem((p: any) => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Course title" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Group">
                  <select value={editItem.group || 'College & Tech Courses'} onChange={e => setEditItem((p: any) => ({ ...p, group: e.target.value }))} className={inputCls}>
                    {['Foundation Programs', 'Competitive Exams', 'College & Tech Courses'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Subcategory">
                  <select value={editItem.subcategory || 'DSA'} onChange={e => setEditItem((p: any) => ({ ...p, subcategory: e.target.value }))} className={inputCls}>
                    {['DSA', 'Web Development', 'App Development', 'Flutter Development', 'AI & Machine Learning', 'Data Science', 'Cyber Security', 'Cloud Computing', 'Interview Preparation', 'Aptitude Preparation', 'JEE Preparation', 'NEET Preparation', 'CUET Preparation', 'Olympiads', 'NTSE', 'Class 1-5', 'Class 6-8', 'Class 9-10', 'Class 11-12'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Level">
                  <select value={editItem.level || 'Beginner'} onChange={e => setEditItem((p: any) => ({ ...p, level: e.target.value }))} className={inputCls}>
                    {['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Price">
                  <input value={editItem.price === 'FREE' ? 'FREE' : (editItem.price || '')} onChange={e => { const v = e.target.value.toUpperCase(); setEditItem((p: any) => ({ ...p, price: v === 'FREE' ? 'FREE' : parseInt(v) || 0 })) }} className={inputCls} placeholder="FREE or 999" />
                </Field>
                <Field label="Duration"><input value={editItem.duration || ''} onChange={e => setEditItem((p: any) => ({ ...p, duration: e.target.value }))} className={inputCls} placeholder="40 hours" /></Field>
                <Field label="Status">
                  <select value={editItem.status || 'Draft'} onChange={e => setEditItem((p: any) => ({ ...p, status: e.target.value }))} className={inputCls}>
                    <option>Published</option><option>Draft</option>
                  </select>
                </Field>
              </div>
              <Field label="Video URL"><input value={editItem.videoUrl || ''} onChange={e => setEditItem((p: any) => ({ ...p, videoUrl: e.target.value }))} className={inputCls} placeholder="https://youtube.com/..." /></Field>
              <Field label="Description"><textarea value={editItem.description || ''} onChange={e => setEditItem((p: any) => ({ ...p, description: e.target.value }))} rows={3} className={inputCls + ' resize-none'} placeholder="Course description" /></Field>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600">{editItem.id ? 'Update' : 'Add'} Course</button>
            </div>
          </motion.div>
        </div>
      )
    }

    // Generic modal for other types (quiz, roadmap, mentor)
    const handleGenericSave = () => {
      const title = editItem.title || editItem.name || editItem.studentName || 'Item'
      if (!title || title === 'Item') { toast.error('Required fields missing'); return }

      switch (type) {
        case 'quiz':
          if (editItem.id) content.updateQuiz(editItem.id, editItem)
          else content.addQuiz({ ...editItem, questions: [], status: 'Draft', maxScore: 100 })
          break
        case 'roadmap':
          if (editItem.id) content.updateRoadmap(editItem.id, editItem)
          else content.addRoadmap({ ...editItem, steps: [], status: 'Draft' })
          break
        case 'mentor':
          if (editItem.id) mentors.updateMentor(editItem.id, editItem)
          else mentors.addMentor({ ...editItem, services: [], fees: {}, expertise: [], status: 'Active', rating: 5, reviews: 0, sessions: 0 })
          break
      }
      toast.success(editItem.id ? 'Updated successfully!' : 'Added successfully!')
      closeModal()
    }

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-lg w-full shadow-xl my-4">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text capitalize">{editItem.id ? 'Edit' : 'Add'} {type}</h3>
            <button onClick={closeModal}><X size={18} className="text-brand-muted" /></button>
          </div>
          <div className="space-y-4">
            <Field label="Title / Name *">
              <input
                value={editItem.title || editItem.name || editItem.studentName || ''}
                onChange={e => setEditItem((p: any) => ({ ...p, title: e.target.value, name: e.target.value, studentName: e.target.value }))}
                className={inputCls}
                placeholder="Enter title"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={editItem.description || editItem.content || editItem.story || ''}
                onChange={e => setEditItem((p: any) => ({ ...p, description: e.target.value, content: e.target.value, story: e.target.value }))}
                rows={4}
                className={inputCls + ' resize-none'}
                placeholder="Description..."
              />
            </Field>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                <strong>Note:</strong> Fill in the title and description to create a basic entry. You can edit all details after creating it.
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={closeModal} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text">Cancel</button>
            <button onClick={handleGenericSave} className="flex-1 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600">{editItem.id ? 'Update' : 'Add'}</button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview()
      case 'courses': return renderCourses()
      case 'resources': return renderResources()
      case 'quizzes': return renderQuizzes()
      case 'roadmaps': return renderRoadmaps()
      case 'mentorship': return renderMentorship()
      case 'youtube-videos': return renderYoutubeVideos()
      case 'hierarchy': return renderHierarchy()
      case 'pathfinder-careers': return renderPathfinderCareers()
      case 'pathfinder-exams': return renderPathfinderExams()
      case 'pathfinder-mappings': return renderPathfinderMappings()
      case 'users': return renderUsers()
      case 'settings': return renderSettings()
      default: return null
    }
  }

  const groups = Array.from(new Set(sidebarItems.map(i => i.group || 'Main')))

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">

          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col w-64 flex-shrink-0">
            <div className="card p-4 sticky top-24">
              <div className="flex items-center gap-2.5 px-2 py-2 mb-4 border-b border-brand-border dark:border-brand-dark-border pb-4">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <Shield size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-text dark:text-brand-dark-text">Admin Panel</p>
                  <p className="text-[10px] text-brand-muted dark:text-brand-dark-muted">Skill021</p>
                </div>
              </div>

              <nav className="space-y-1">
                {groups.map(group => {
                  const groupItems = sidebarItems.filter(i => (i.group || 'Main') === group)
                  return (
                    <div key={group}>
                      {group !== 'Main' && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted dark:text-brand-dark-muted px-3 pt-3 pb-1">{group}</p>
                      )}
                      {groupItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => { setActiveTab(item.id); setSearch('') }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${activeTab === item.id
                            ? 'bg-primary-500 text-white'
                            : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                        >
                          <item.icon size={16} />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Mobile Tab Bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-brand-dark-card border-t border-brand-border dark:border-brand-dark-border flex overflow-x-auto">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-3 text-xs transition-colors ${activeTab === item.id ? 'text-primary-500' : 'text-brand-muted dark:text-brand-dark-muted'
                  }`}
              >
                <item.icon size={18} />
                <span className="hidden sm:block">{item.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <main className="flex-1 min-w-0 pb-20 lg:pb-0">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {renderContent()}
            </motion.div>
          </main>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <DeleteModal
            title={deleteId.title}
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && renderModal()}
      </AnimatePresence>

      {/* Hierarchy Delete Confirmation Modal */}
      <AnimatePresence>
        {hierarchyDeleteId && (
          <DeleteModal
            title={(() => {
              const tab = hierarchyTab
              if (tab === 'colleges') return hColleges.find(c => c.id === hierarchyDeleteId)?.name ?? ''
              if (tab === 'courses') return hCourses.find(c => c.id === hierarchyDeleteId)?.name ?? ''
              if (tab === 'branches') return hBranches.find(b => b.id === hierarchyDeleteId)?.name ?? ''
              if (tab === 'semesters') {
                const s = hSemesters.find(sem => sem.id === hierarchyDeleteId)
                return s ? `Semester ${s.semester_number}` : ''
              }
              if (tab === 'subjects') return hSubjects.find(s => s.id === hierarchyDeleteId)?.name ?? ''
              return 'Record'
            })()}
            onConfirm={() => {
              handleHierarchyDelete(hierarchyTab, hierarchyDeleteId)
              setHierarchyDeleteId(null)
            }}
            onCancel={() => setHierarchyDeleteId(null)}
          />
        )}
      </AnimatePresence>

      {/* Academic Hierarchy Add/Edit Modal */}
      <AnimatePresence>
        {showHierarchyModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-lg w-full shadow-xl my-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text capitalize">
                  {hierarchyEditItem ? 'Edit' : 'Add'} {hierarchyEditItem ? hierarchyEditItem._tab.slice(0, -1) : hierarchyTab.slice(0, -1)}
                </h3>
                <button onClick={closeHierarchyModal}><X size={18} className="text-brand-muted" /></button>
              </div>

              <div className="space-y-4">
                {/* Course level: parent College is required */}
                {(hierarchyEditItem ? hierarchyEditItem._tab : hierarchyTab) === 'courses' && (
                  <Field label="College *">
                    <select
                      value={hFormCollegeId}
                      onChange={e => setHFormCollegeId(e.target.value ? Number(e.target.value) : '')}
                      className={inputCls}
                      disabled={!!hierarchyEditItem}
                    >
                      <option value="">Select College...</option>
                      {modalColleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                )}

                {/* Branch level: College -> Course required */}
                {(hierarchyEditItem ? hierarchyEditItem._tab : hierarchyTab) === 'branches' && (
                  <>
                    <Field label="College *">
                      <select
                        value={hFormCollegeId}
                        onChange={e => setHFormCollegeId(e.target.value ? Number(e.target.value) : '')}
                        className={inputCls}
                        disabled={!!hierarchyEditItem}
                      >
                        <option value="">Select College...</option>
                        {modalColleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Course *">
                      <select
                        value={hFormCourseId}
                        onChange={e => setHFormCourseId(e.target.value ? Number(e.target.value) : '')}
                        className={inputCls}
                        disabled={!hFormCollegeId || !!hierarchyEditItem}
                      >
                        <option value="">Select Course...</option>
                        {modalCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                  </>
                )}

                {/* Semester level: College -> Course -> Branch required */}
                {(hierarchyEditItem ? hierarchyEditItem._tab : hierarchyTab) === 'semesters' && (
                  <>
                    <Field label="College *">
                      <select
                        value={hFormCollegeId}
                        onChange={e => setHFormCollegeId(e.target.value ? Number(e.target.value) : '')}
                        className={inputCls}
                        disabled={!!hierarchyEditItem}
                      >
                        <option value="">Select College...</option>
                        {modalColleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Course *">
                      <select
                        value={hFormCourseId}
                        onChange={e => setHFormCourseId(e.target.value ? Number(e.target.value) : '')}
                        className={inputCls}
                        disabled={!hFormCollegeId || !!hierarchyEditItem}
                      >
                        <option value="">Select Course...</option>
                        {modalCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Branch *">
                      <select
                        value={hFormBranchId}
                        onChange={e => setHFormBranchId(e.target.value ? Number(e.target.value) : '')}
                        className={inputCls}
                        disabled={!hFormCourseId || !!hierarchyEditItem}
                      >
                        <option value="">Select Branch...</option>
                        {modalBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </Field>
                  </>
                )}

                {/* Subject level: College -> Course -> Branch -> Semester required */}
                {(hierarchyEditItem ? hierarchyEditItem._tab : hierarchyTab) === 'subjects' && (
                  <>
                    <Field label="College *">
                      <select
                        value={hFormCollegeId}
                        onChange={e => setHFormCollegeId(e.target.value ? Number(e.target.value) : '')}
                        className={inputCls}
                        disabled={!!hierarchyEditItem}
                      >
                        <option value="">Select College...</option>
                        {modalColleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Course *">
                      <select
                        value={hFormCourseId}
                        onChange={e => setHFormCourseId(e.target.value ? Number(e.target.value) : '')}
                        className={inputCls}
                        disabled={!hFormCollegeId || !!hierarchyEditItem}
                      >
                        <option value="">Select Course...</option>
                        {modalCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Branch *">
                      <select
                        value={hFormBranchId}
                        onChange={e => setHFormBranchId(e.target.value ? Number(e.target.value) : '')}
                        className={inputCls}
                        disabled={!hFormCourseId || !!hierarchyEditItem}
                      >
                        <option value="">Select Branch...</option>
                        {modalBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Semester *">
                      <select
                        value={hFormSemesterId}
                        onChange={e => setHFormSemesterId(e.target.value ? Number(e.target.value) : '')}
                        className={inputCls}
                        disabled={!hFormBranchId || !!hierarchyEditItem}
                      >
                        <option value="">Select Semester...</option>
                        {modalSemesters.map(s => <option key={s.id} value={s.id}>Semester {s.semester_number}</option>)}
                      </select>
                    </Field>
                  </>
                )}

                {/* Common / Specific Detail inputs */}
                {(hierarchyEditItem ? hierarchyEditItem._tab : hierarchyTab) === 'colleges' && (
                  <>
                    <Field label="College Name *">
                      <input value={hFormName} onChange={e => setHFormName(e.target.value)} className={inputCls} placeholder="e.g. Delhi Technological University" />
                    </Field>
                    <Field label="Short Name">
                      <input value={hFormShortName} onChange={e => setHFormShortName(e.target.value)} className={inputCls} placeholder="e.g. DTU" />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="City">
                        <input value={hFormCity} onChange={e => setHFormCity(e.target.value)} className={inputCls} placeholder="e.g. New Delhi" />
                      </Field>
                      <Field label="State">
                        <input value={hFormState} onChange={e => setHFormState(e.target.value)} className={inputCls} placeholder="e.g. Delhi" />
                      </Field>
                    </div>
                  </>
                )}

                {(hierarchyEditItem ? hierarchyEditItem._tab : hierarchyTab) === 'courses' && (
                  <>
                    <Field label="Course Name *">
                      <input value={hFormName} onChange={e => setHFormName(e.target.value)} className={inputCls} placeholder="e.g. Bachelor of Technology" />
                    </Field>
                    <Field label="Duration">
                      <input value={hFormDuration} onChange={e => setHFormDuration(e.target.value)} className={inputCls} placeholder="e.g. 4 Years" />
                    </Field>
                  </>
                )}

                {(hierarchyEditItem ? hierarchyEditItem._tab : hierarchyTab) === 'branches' && (
                  <>
                    <Field label="Branch Name *">
                      <input value={hFormName} onChange={e => setHFormName(e.target.value)} className={inputCls} placeholder="e.g. Computer Science & Engineering" />
                    </Field>
                    <Field label="Code">
                      <input value={hFormCode} onChange={e => setHFormCode(e.target.value)} className={inputCls} placeholder="e.g. CSE" />
                    </Field>
                  </>
                )}

                {(hierarchyEditItem ? hierarchyEditItem._tab : hierarchyTab) === 'semesters' && (
                  <Field label="Semester Number *">
                    <input type="number" min="1" max="10" value={hFormSemesterNumber} onChange={e => setHFormSemesterNumber(e.target.value ? Number(e.target.value) : '')} className={inputCls} placeholder="e.g. 1" />
                  </Field>
                )}

                {(hierarchyEditItem ? hierarchyEditItem._tab : hierarchyTab) === 'subjects' && (
                  <>
                    <Field label="Subject Name *">
                      <input value={hFormName} onChange={e => setHFormName(e.target.value)} className={inputCls} placeholder="e.g. Database Management Systems" />
                    </Field>
                    <Field label="Code">
                      <input value={hFormCode} onChange={e => setHFormCode(e.target.value)} className={inputCls} placeholder="e.g. CS-301" />
                    </Field>
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={closeHierarchyModal} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text">Cancel</button>
                <button onClick={handleHierarchySave} disabled={hierarchySaving} className="flex-1 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-60 flex items-center justify-center gap-2">
                  {hierarchySaving && <Loader2 size={14} className="animate-spin" />}
                  {hierarchyEditItem ? 'Update' : 'Add'} Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
