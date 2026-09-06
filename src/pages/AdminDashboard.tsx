import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, FileText, HelpCircle, Map,
  Users, Settings, Plus, Edit2, Trash2, Search,
  X, Shield, TrendingUp, Eye, Download, EyeOff,
  CheckCircle, Zap, Video, Loader2, RotateCw, Compass, ListVideo, Clock, Briefcase, Mail, Phone, Trophy, Minus, Save, LogOut, ChevronDown, Check, Radio,
  CreditCard, DollarSign, ExternalLink, RefreshCw, ChevronRight, Copy, ShieldAlert,
  QrCode, UploadCloud, Sparkles, GraduationCap, Calendar, UserCheck, Award,
  Package, Layers, PlayCircle, FolderPlus,
  Upload, Image as ImageIcon, AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import LogoutConfirmModal from '../components/LogoutConfirmModal'
import {
  fetchHackathons as fetchAdminHackathons,
  createHackathon as createAdminHackathon,
  updateHackathon as updateAdminHackathon,
  deleteHackathon as deleteAdminHackathon,
  fetchTeams as fetchAdminTeams,
  updateTeamQualification as updateAdminTeamQual,
  updateTeamPosition as updateAdminTeamPos,
  markMemberAttendance as markAdminMemberAttendance,
  isTeamQualifiedForRound,
} from '../lib/hackathonService'
import { Hackathon, HackathonTeam, CreateHackathonInput, TeamMember } from '../features/hackathons/types'
import { useContentStore, Course, Resource, Quiz, Roadmap } from '../store/contentStore'
import {
  getTimestamps,
  addTimestamp,
  deleteTimestamp as deleteTimestampApi,
  formatSeconds,
  parseTimeToSeconds,
  VideoTimestamp,
  getAllEnrollments,
  approvePaymentRequest,
  rejectPaymentRequest,
  createEnrollment,
  revokeAccess,
  getPaymentSettings,
  updatePaymentSettings,
  type PaymentSettings,
  type Enrollment,
} from '../lib/videoEngagementService'
import { getResumeSignedUrl } from '../lib/careerApplicationService'

// Heuristic check: does this video file actually contain an audio track?
// Loads the file into an off-DOM <video>, briefly plays it (muted so the
// browser never blocks the programmatic play call), and inspects the
// browser-specific "audio decoded" signals. Not 100% reliable on every
// browser, but catches the common case of silently-recorded clips before
// an admin publishes a course video with no sound.
// Heuristic check: does this video file contain an audio track?
// Returns 'yes' | 'no' | 'unknown'. Deliberately conservative: only reports
// 'no' when a browser API gives a clear metadata-level answer. When the
// browser doesn't expose that info (or muting/autoplay quirks make it
// unreliable), it reports 'unknown' rather than risk a false alarm on a
// perfectly good file.
// Reads a video's duration (in seconds) from either a File or a URL, purely
// from metadata — no playback needed. Used to auto-adjust the chapter/
// timestamp input format (mm:ss vs hh:mm:ss) to match the actual video.
async function getVideoDurationSeconds(source: File | string): Promise<number | null> {
  const isFile = typeof source !== 'string'
  let url = isFile ? URL.createObjectURL(source as File) : source
  if (!isFile && url.startsWith('b2://')) {
    try { url = await getBackblazeVideoUrl(url) } catch { return null }
  }
  return new Promise((resolve) => {
    const el = document.createElement('video')
    el.preload = 'metadata'
    el.src = url
    let settled = false
    const finish = (result: number | null) => {
      if (settled) return
      settled = true
      if (isFile) URL.revokeObjectURL(url)
      resolve(result)
    }
    el.addEventListener('loadedmetadata', () => {
      finish(Number.isFinite(el.duration) ? el.duration : null)
    })
    el.addEventListener('error', () => finish(null))
    setTimeout(() => finish(null), 6000)
  })
}

// Turns raw seconds into an exact, admin-friendly duration string for the
// course "Duration" field, e.g. 395 -> "6 mins 35 secs", 5400 -> "1 hr 30 mins".
// Keeps full precision (no rounding up to the nearest minute).
function formatDurationHuman(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds)
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} hr${hours !== 1 ? 's' : ''}`)
  if (mins > 0) parts.push(`${mins} min${mins !== 1 ? 's' : ''}`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs} sec${secs !== 1 ? 's' : ''}`)
  return parts.join(' ')
}

function checkVideoHasAudio(file: File): Promise<'yes' | 'no' | 'unknown'> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const el = document.createElement('video')
    el.src = url
    // Not muted — some browsers (Chrome included) skip audio decoding
    // entirely for muted elements, which previously caused false "no
    // audio" results. Volume 0 keeps it silent without disabling decode.
    el.volume = 0
    el.preload = 'metadata'
    el.style.position = 'fixed'
    el.style.width = '1px'
    el.style.height = '1px'
    el.style.opacity = '0'
    el.style.pointerEvents = 'none'
    el.style.top = '-9999px'
    el.style.left = '-9999px'
    document.body.appendChild(el)

    let settled = false
    const finish = (result: 'yes' | 'no' | 'unknown') => {
      if (settled) return
      settled = true
      el.pause()
      el.remove()
      URL.revokeObjectURL(url)
      resolve(result)
    }

    el.addEventListener('loadedmetadata', () => {
      const anyEl = el as any

      // Chrome/Edge: audioTracks is populated from container metadata as
      // soon as metadata loads — no playback needed, so muting/autoplay
      // policy can't interfere with it.
      if (anyEl.audioTracks && typeof anyEl.audioTracks.length === 'number') {
        finish(anyEl.audioTracks.length > 0 ? 'yes' : 'no')
        return
      }
      // Firefox: mozHasAudio is also metadata-level, no playback needed.
      if (typeof anyEl.mozHasAudio === 'boolean') {
        finish(anyEl.mozHasAudio ? 'yes' : 'no')
        return
      }

      // Neither API is available (e.g. Safari) — fall back to a brief,
      // silent (volume 0, not muted) playback attempt and check decoded
      // audio bytes. If autoplay is blocked or this is inconclusive,
      // report 'unknown' rather than guess.
      el.play().then(() => {
        setTimeout(() => {
          const decoded = typeof anyEl.webkitAudioDecodedByteCount === 'number' ? anyEl.webkitAudioDecodedByteCount : null
          if (decoded === null) finish('unknown')
          else finish(decoded > 0 ? 'yes' : 'unknown')
        }, 800)
      }).catch(() => finish('unknown'))
    })
    el.addEventListener('error', () => finish('unknown'))
    setTimeout(() => finish('unknown'), 5000) // safety timeout — never hang the UI
  })
}
import {
  fetchAllMentors,
  createMentor,
  updateMentor as updateMentorApi,
  deleteMentor as deleteMentorApi,
  toggleMentorStatus as toggleMentorStatusApi,
  uploadMentorPhoto,
  deleteMentorPhoto,
  fetchAllSessions,
  createSession as createSessionApi,
  updateSession as updateSessionApi,
  updateSessionStatus as updateSessionStatusApi,
  deleteSession as deleteSessionApi,
  fetchAllGuidanceRequests,
  updateGuidanceRequestStatus as updateGuidanceRequestStatusApi,
  deleteGuidanceRequest as deleteGuidanceRequestApi,
  type Mentor,
  type MentorSession,
  type GuidanceRequest,
  type MentorshipServiceType,
} from '../lib/mentorService'
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
  fetchAllCareerApplications,
  updateCareerApplicationStatus,
  deleteCareerApplication,
  CareerApplication,
  ApplicationStatus,
} from '../lib/careerApplicationService'
import {
  fetchAllSiteCourses,
  createSiteCourse,
  updateSiteCourse,
  deleteSiteCourse,
  toggleSiteCourseStatus,
  uploadCourseVideo,
  uploadCourseThumbnail,
  deleteCourseFile,
} from '../lib/courseService'
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
import {
  supabase,
  fetchAllUsersWithEnrollments,
  toggleUserPremiumStatus,
  upsertUserProfile,
  type UserWithEnrollmentDetails,
  type UserEnrollmentSummary,
} from '../lib/supabase'
import toast from 'react-hot-toast'
import { isBackblazeRef, deleteBackblazeFile } from '../lib/backblazeService'
import { getLiveWebinars, createLiveWebinar, updateLiveWebinar, deleteLiveWebinar, getWebinarRecordings, uploadWebinarVideo, createWebinarRecording, deleteWebinarRecording, type LiveWebinar, type WebinarRecording, type WebinarProvider, type WebinarAccess } from '../lib/webinarService'
import { getBackblazeVideoUrl } from '../lib/backblazeService'
import {
  fetchAllDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  toggleDiscountActive,
  formatDiscountLabel,
  getDiscountStatus,
  applyDiscountToPrice,
  type ProductDiscount,
} from '../lib/discountService'
import {
  fetchAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive,
  getCouponStatus,
  formatCouponDiscount,
  fetchAllCouponRedemptionsWithDetails,
  type Coupon,
  type CouponRedemption,
} from '../lib/couponService'
import type {
  ProductType,
  DiscountType,
  CouponStatus,
  CreateProductDiscountInput,
  CreateCouponInput,
  UpdateCouponInput,
} from '../lib/pricingTypes'
import {
  fetchSubjectBundle,
  fetchAllSubjectBundles,
  createSubjectBundle,
  updateSubjectBundle,
  deleteSubjectBundle,
  toggleSubjectBundleActive,
  fetchSubjectCurriculum,
  createSubjectUnit,
  updateSubjectUnit,
  deleteSubjectUnit,
  createSubjectVideo,
  updateSubjectVideo,
  deleteSubjectVideo,
} from '../lib/subjectBundleService'
import type {
  SubjectBundle,
  CreateSubjectBundleInput,
  UpdateSubjectBundleInput,
  SubjectUnit,
  SubjectVideo,
  SubjectUnitResource,
} from '../lib/subjectBundleTypes'
import {
  fetchAllResourceBundles,
  createResourceBundle,
  updateResourceBundle,
  deleteResourceBundle,
  toggleResourceBundleActive,
  fetchResourceBundleItems,
  updateResourceBundleMappings,
} from '../lib/resourceBundleService'
import type {
  ResourceBundle,
  ResourceBundleItem,
  CreateResourceBundleInput,
  UpdateResourceBundleInput,
} from '../lib/resourceBundleTypes'

type AdminTab =
  | 'overview' | 'courses' | 'resources' | 'quizzes' | 'roadmaps'
  | 'mentorship' | 'youtube-videos' | 'webinars' | 'users' | 'settings' | 'hierarchy'
  | 'pathfinder-careers' | 'pathfinder-exams' | 'pathfinder-mappings'
  | 'career-applications'
  | 'hackathons' | 'payment-approvals'
  | 'subject-bundles' | 'resource-bundles'
  | 'course-discounts' | 'resource-discounts' | 'coupons' | 'coupon-usage'

const sidebarItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'hackathons', label: 'Hackathons', icon: Trophy, group: '🏆 Competitions' },
  { id: 'courses', label: 'Courses', icon: BookOpen, group: 'Content' },
  { id: 'resources', label: 'Resources', icon: FileText, group: 'Content' },
  { id: 'quizzes', label: 'Quizzes', icon: HelpCircle, group: 'Content' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, group: 'Content' },
  { id: 'youtube-videos', label: 'YouTube Videos', icon: Video, group: 'Content' },
  { id: 'webinars', label: 'Webinars', icon: Radio, group: 'Content' },
  { id: 'mentorship', label: 'Mentorship', icon: Users, group: 'Services' },
  { id: 'hierarchy', label: 'Academic Hierarchy', icon: BookOpen, group: 'Content' },
  { id: 'career-applications', label: 'Join Us Applications', icon: Briefcase, group: 'Services' },
  { id: 'pathfinder-careers', label: 'Career Paths', icon: Compass, group: '🧭 Skills021 PathFinder' },
  { id: 'pathfinder-exams', label: 'Exams', icon: FileText, group: '🧭 Skills021 PathFinder' },
  { id: 'pathfinder-mappings', label: 'Career Mapping', icon: Map, group: '🧭 Skills021 PathFinder' },
  { id: 'subject-bundles', label: 'Subject Bundles', icon: Package, group: '💰 Pricing & Bundles' },
  { id: 'resource-bundles', label: 'Resource Bundles', icon: Layers, group: '💰 Pricing & Bundles' },
  { id: 'course-discounts', label: 'Subject Bundle Discounts', icon: DollarSign, group: '💰 Pricing & Bundles' },
  { id: 'resource-discounts', label: 'Resource Bundle Discounts', icon: DollarSign, group: '💰 Pricing & Bundles' },
  { id: 'coupons', label: 'Coupon Codes', icon: Sparkles, group: '💰 Pricing & Bundles' },
  { id: 'coupon-usage', label: 'Coupon Usage', icon: TrendingUp, group: '💰 Pricing & Bundles' },
  { id: 'payment-approvals', label: 'Payment Approvals', icon: CreditCard, group: 'Admin' },
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

function DeleteModal({
  title,
  itemType,
  onConfirm,
  onCancel,
}: {
  title: string
  itemType?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}) {
  const [confirmInput, setConfirmInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const cleanTitle = (title || '').trim()
  const isMatch =
    confirmInput.trim().toLowerCase() === 'delete' ||
    (cleanTitle.length > 0 && confirmInput.trim().toLowerCase() === cleanTitle.toLowerCase())

  const handleConfirm = async () => {
    if (!isMatch || isDeleting) return
    setIsDeleting(true)
    try {
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

  const displayType = itemType
    ? itemType.charAt(0).toUpperCase() + itemType.slice(1)
    : 'Item'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-zinc-950 rounded-2xl p-6 sm:p-7 max-w-md w-full border border-red-500/30 shadow-2xl space-y-4 relative"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 text-red-500">
          <div className="p-2.5 bg-red-500/10 dark:bg-red-500/20 rounded-xl border border-red-500/20">
            <Trash2 size={22} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Delete {displayType}
            </h3>
            <p className="text-xs text-red-500 font-semibold uppercase tracking-wider">
              Irreversible Action
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-700 dark:text-red-300 leading-relaxed">
          <p className="font-bold mb-0.5">⚠️ Danger Zone Warning:</p>
          This action <strong>cannot be undone</strong>. This will permanently delete{' '}
          <span className="font-extrabold text-zinc-900 dark:text-white">"{title || 'this item'}"</span> and all associated files and data.
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            To confirm deletion, type <span className="select-all font-mono font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">delete</span> or <span className="select-all font-mono font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">"{title}"</span>:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={e => setConfirmInput(e.target.value)}
            placeholder={`Type "delete" or "${title}"`}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-black text-sm text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && isMatch) {
                handleConfirm()
              }
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isMatch || isDeleting}
            onClick={handleConfirm}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Deleting…
              </>
            ) : (
              'I understand the consequences, delete this'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function GuidanceRequestModal({ request, onClose, onStatusChange }: { request: GuidanceRequest; onClose: () => void; onStatusChange: (status: GuidanceRequest['status']) => void }) {
  const row = (label: string, value?: string) => (
    <div>
      <p className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-brand-text dark:text-brand-dark-text">{value || '—'}</p>
    </div>
  )
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-brand-dark-card rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-brand-border dark:border-brand-dark-border sticky top-0 bg-white dark:bg-brand-dark-card">
          <div>
            <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{request.fullName}</h3>
            <p className="text-xs text-brand-muted">Submitted {new Date(request.createdAt).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-6">
          <div>
            <h4 className="text-sm font-bold text-brand-text dark:text-brand-dark-text mb-3">Personal Details</h4>
            <div className="grid grid-cols-2 gap-4">
              {row('Mobile', request.mobile)}
              {row('WhatsApp', request.whatsapp)}
              {row('Email', request.email)}
              {row('City', request.city)}
              {row('State', request.state)}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-brand-text dark:text-brand-dark-text mb-3">Academic Details</h4>
            <div className="grid grid-cols-2 gap-4">
              {row('Class / Year', request.classYear)}
              {row('School / College', request.schoolCollege)}
              {row('Board / University', request.boardUniversity)}
              {row('Stream', request.stream)}
              {row('Percentage / CGPA', request.percentage)}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-brand-text dark:text-brand-dark-text mb-3">Guidance Needed</h4>
            <div className="flex flex-wrap gap-2">
              {request.guidanceTypes.map(t => (
                <span key={t} className="badge text-xs bg-gray-100 dark:bg-white/10 text-brand-text dark:text-brand-dark-text">{t}</span>
              ))}
              {request.guidanceTypes.length === 0 && <p className="text-sm text-brand-muted">None specified</p>}
            </div>
          </div>
          {request.additionalQuery && (
            <div>
              <h4 className="text-sm font-bold text-brand-text dark:text-brand-dark-text mb-2">Additional Query</h4>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted leading-relaxed">{request.additionalQuery}</p>
            </div>
          )}
          <div>
            <h4 className="text-sm font-bold text-brand-text dark:text-brand-dark-text mb-2">Status</h4>
            <select
              value={request.status}
              onChange={(e) => onStatusChange(e.target.value as GuidanceRequest['status'])}
              className="text-sm px-3 py-2 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text focus:outline-none"
            >
              {['New', 'In Progress', 'Contacted', 'Completed'].map(st => <option key={st}>{st}</option>)}
            </select>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Grayscale-only status badge, used exclusively within the Mentorship panel
function MentorStatusBadge({ status }: { status: string }) {
  const filled = ['Active', 'Completed', 'Confirmed', 'Published']
  const outline = ['Inactive', 'Cancelled']
  const cls = filled.includes(status)
    ? 'bg-black text-white dark:bg-white dark:text-black'
    : outline.includes(status)
      ? 'border border-brand-border dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted'
      : 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-200'
  return <span className={`badge text-xs ${cls}`}>{status}</span>
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
    New: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Contacted: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
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

// ─── Notes Subject Picker ───────────────────────────────────────────────────
// A proper searchable dropdown (replaces the old native <input list=...> /
// <datalist> combo, which looked like an unstyled browser popup and, in a
// number of browsers, would not reliably swap the selected value once one
// option had already been chosen). Clicking a different subject here always
// replaces the current selection immediately.
// ─── Resume Preview Modal ───────────────────────────────────────────────────
// Opens a resume in-place instead of triggering a browser download. PDFs
function ResumePreviewModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const [resolvedUrl, setResolvedUrl] = useState(url)

  useEffect(() => {
    let active = true
    getResumeSignedUrl(url).then((signed) => {
      if (active && signed) setResolvedUrl(signed)
    })
    return () => { active = false }
  }, [url])

  const ext = (resolvedUrl || url).split('?')[0].split('.').pop()?.toLowerCase() || ''
  const isPdf = ext === 'pdf'
  const isOfficeDoc = ext === 'doc' || ext === 'docx'
  const viewerSrc = isPdf
    ? resolvedUrl
    : isOfficeDoc
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl)}&embedded=true`
      : resolvedUrl

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl h-[85vh] bg-white dark:bg-brand-dark-card rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-brand-border dark:border-brand-dark-border">
          <p className="text-sm font-semibold text-brand-text dark:text-brand-dark-text truncate pr-4">{name}'s Resume</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <a
              href={resolvedUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted dark:text-brand-dark-muted transition-colors"
              title="Download"
            >
              <Download size={16} />
            </a>
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted dark:text-brand-dark-muted transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={16} />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted dark:text-brand-dark-muted transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-gray-100 dark:bg-black/20">
          <iframe src={viewerSrc} title={`${name}'s Resume`} className="w-full h-full border-0" />
        </div>
      </motion.div>
    </motion.div>
  )
}

function NotesSubjectPicker({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = options.filter(o => o.toLowerCase().includes(query.trim().toLowerCase()))

  const select = (subject: string) => {
    onChange(subject)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery('') }}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm text-left transition-all ${open
          ? 'border-primary-500 ring-2 ring-primary-500 bg-white dark:bg-brand-dark-bg'
          : 'border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg hover:border-primary-300'
          }`}
      >
        <span className={value ? 'text-brand-text dark:text-brand-dark-text font-medium' : 'text-brand-muted dark:text-brand-dark-muted'}>
          {value || 'Auto-match by course title'}
        </span>
        <ChevronDown size={15} className={`flex-shrink-0 text-brand-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-20 mt-1.5 w-full bg-white dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-brand-border dark:border-brand-dark-border">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search or type a new subject..."
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg text-xs border border-brand-border dark:border-brand-dark-border bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => select('')}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/10 ${!value ? 'text-primary-500 font-semibold' : 'text-brand-muted dark:text-brand-dark-muted'}`}
              >
                <Check size={12} className={!value ? 'opacity-100' : 'opacity-0'} />
                Auto-match by course title
              </button>

              {filtered.length === 0 && query.trim() && (
                <button
                  type="button"
                  onClick={() => select(query.trim())}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-brand-text dark:text-brand-dark-text hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <Plus size={12} />
                  Use "{query.trim()}"
                </button>
              )}

              {filtered.map(subject => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => select(subject)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/10 ${value === subject ? 'text-primary-500 font-semibold bg-primary-50 dark:bg-primary-950/20' : 'text-brand-text dark:text-brand-dark-text'
                    }`}
                >
                  <Check size={12} className={value === subject ? 'opacity-100' : 'opacity-0'} />
                  {subject}
                </button>
              ))}

              {filtered.length === 0 && !query.trim() && (
                <div className="px-3 py-3 text-xs text-brand-muted dark:text-brand-dark-muted text-center">
                  No published "Notes" resources yet
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

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

// ─── YouTube Videos Tab Component (Extracted to obey React Rules of Hooks) ────
function YoutubeVideosTab({ search, setSearch }: { search: string; setSearch: (s: string) => void }) {
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
            itemType="Video"
            onConfirm={() => handleDelete(deleteVideoId)}
            onCancel={() => setDeleteVideoId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<{ id: string; title: string; type: string } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [viewGuidanceRequest, setViewGuidanceRequest] = useState<GuidanceRequest | null>(null)

  // Stores
  const content = useContentStore()
  const navigate = useNavigate()
  const { adminUser, adminLogout, logoutUser } = useAuthStore()
  const [showAdminLogoutModal, setShowAdminLogoutModal] = useState(false)

  const handleConfirmAdminLogout = async () => {
    setShowAdminLogoutModal(false)
    try {
      await adminLogout()
      toast.success('Signed out of Admin Portal')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      navigate('/admin/login', { replace: true })
    }
  }

  // ─── Payment Gateway & UPI QR Settings ─────────────────────────────────────
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    upiId: 'skills021@upi',
    upiName: 'Skills021',
    qrCodeUrl: '',
    instructions: 'Scan QR or pay directly to the UPI ID, then enter your 12-digit UTR number and upload screenshot proof.',
  })
  const [draftPaymentSettings, setDraftPaymentSettings] = useState<PaymentSettings>({
    upiId: 'skills021@upi',
    upiName: 'Skills021',
    qrCodeUrl: '',
    instructions: 'Scan QR or pay directly to the UPI ID, then enter your 12-digit UTR number and upload screenshot proof.',
  })
  const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(false)
  const [showQrSettingsPanel, setShowQrSettingsPanel] = useState(false)

  useEffect(() => {
    getPaymentSettings().then((s) => {
      if (s) {
        setPaymentSettings(s)
        setDraftPaymentSettings(s)
      }
    })
  }, [])

  // ─── Supabase Hackathons State ─────────────────────────────────────────────
  const [adminHackathons, setAdminHackathons] = useState<Hackathon[]>([])
  const [adminHackathonsLoading, setAdminHackathonsLoading] = useState(false)
  const [selectedAdminHackathon, setSelectedAdminHackathon] = useState<Hackathon | null>(null)
  const [adminTeams, setAdminTeams] = useState<HackathonTeam[]>([])
  const [adminTeamsLoading, setAdminTeamsLoading] = useState(false)

  // Hackathon Modal states
  const [hTitleInput, setHTitleInput] = useState('')
  const [hDescInput, setHDescInput] = useState('')
  const [hStartInput, setHStartInput] = useState('')
  const [hEndInput, setHEndInput] = useState('')
  const [hDeadlineInput, setHDeadlineInput] = useState('')
  const [hVenueInput, setHVenueInput] = useState('')
  const [hBannerInput, setHBannerInput] = useState('')
  const [hMinTeamInput, setHMinTeamInput] = useState<number>(1)
  const [hMaxTeamInput, setHMaxTeamInput] = useState<number>(4)
  const [hMaxTeamsInput, setHMaxTeamsInput] = useState<number>(50)
  const [hDaysInput, setHDaysInput] = useState<number>(1)
  const [hRoundsInput, setHRoundsInput] = useState<number>(1)
  const [hRulesInput, setHRulesInput] = useState('')
  const [hStatusInput, setHStatusInput] = useState<'upcoming' | 'ongoing' | 'completed'>('upcoming')
  const [hRegOpenInput, setHRegOpenInput] = useState(true)
  const [showHackathonModal, setShowHackathonModal] = useState(false)
  const [editingHackathonId, setEditingHackathonId] = useState<string | null>(null)
  const [hackathonSaving, setHackathonSaving] = useState(false)

  // GitHub/Render style hackathon deletion modal state
  const [deletingHackathon, setDeletingHackathon] = useState<Hackathon | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeletingHackathon, setIsDeletingHackathon] = useState(false)

  const loadAdminHackathons = useCallback(async () => {
    setAdminHackathonsLoading(true)
    try {
      const data = await fetchAdminHackathons()
      setAdminHackathons(data)
    } catch (err) {
      console.error('Failed to load hackathons:', err)
      toast.error('Failed to load hackathons')
    } finally {
      setAdminHackathonsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'hackathons') loadAdminHackathons()
  }, [activeTab, loadAdminHackathons])

  const loadAdminTeams = async (hackathonId: string) => {
    setAdminTeamsLoading(true)
    try {
      const data = await fetchAdminTeams(hackathonId)
      setAdminTeams(data)
    } catch (err) {
      toast.error('Failed to load team registrations')
    } finally {
      setAdminTeamsLoading(false)
    }
  }

  const handleSelectHackathonForTeams = (h: Hackathon) => {
    setSelectedAdminHackathon(h)
    loadAdminTeams(h.id)
    if (h.status !== 'ongoing') {
      toast.error(`Team management is locked. Set status to ONGOING to edit teams.`)
    }
  }

  const handleUpdateStatus = async (h: Hackathon, status: 'upcoming' | 'ongoing' | 'completed') => {
    try {
      const isRegistrationOpen = (status === 'ongoing' || status === 'completed') ? false : h.isRegistrationOpen
      const updated = await updateAdminHackathon(h.id, { status, isRegistrationOpen })
      if (updated) {
        setAdminHackathons(prev => prev.map(item => item.id === h.id ? updated : item))
        if (selectedAdminHackathon?.id === h.id) setSelectedAdminHackathon(updated)
        toast.success(`Status updated to ${status.toUpperCase()}${!isRegistrationOpen ? ' (Registration Closed)' : ''}`)
      }
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleToggleRegistration = async (h: Hackathon) => {
    try {
      const updated = await updateAdminHackathon(h.id, { isRegistrationOpen: !h.isRegistrationOpen })
      if (updated) {
        setAdminHackathons(prev => prev.map(item => item.id === h.id ? updated : item))
        if (selectedAdminHackathon?.id === h.id) setSelectedAdminHackathon(updated)
        toast.success(`Registration ${updated.isRegistrationOpen ? 'opened' : 'closed'}`)
      }
    } catch (err) {
      toast.error('Failed to update registration status')
    }
  }

  // Progression draft state for hackathons (- / + controls)
  const [progressionDrafts, setProgressionDrafts] = useState<Record<string, { currentDay: number; numberOfDays: number; currentRound: number; numberOfRounds: number }>>({})
  const [savingProgressionId, setSavingProgressionId] = useState<string | null>(null)

  const getProgressionValues = (h: Hackathon) => {
    const draft = progressionDrafts[h.id]
    if (draft) return draft
    return {
      currentDay: h.currentDay,
      numberOfDays: h.numberOfDays,
      currentRound: h.currentRound,
      numberOfRounds: h.numberOfRounds,
    }
  }

  const handleStepDay = (h: Hackathon, delta: number) => {
    const curr = getProgressionValues(h)
    const newDay = Math.max(1, curr.currentDay + delta)
    const newTotalDays = Math.max(curr.numberOfDays, newDay)
    setProgressionDrafts(prev => ({
      ...prev,
      [h.id]: {
        ...curr,
        currentDay: newDay,
        numberOfDays: newTotalDays,
      }
    }))
  }

  const handleStepRound = (h: Hackathon, delta: number) => {
    const curr = getProgressionValues(h)
    const newRound = Math.max(1, curr.currentRound + delta)
    const newTotalRounds = Math.max(curr.numberOfRounds, newRound)
    setProgressionDrafts(prev => ({
      ...prev,
      [h.id]: {
        ...curr,
        currentRound: newRound,
        numberOfRounds: newTotalRounds,
      }
    }))
  }

  const handleSaveProgression = async (h: Hackathon) => {
    const draft = progressionDrafts[h.id]
    if (!draft) return

    setSavingProgressionId(h.id)
    try {
      const updated = await updateAdminHackathon(h.id, {
        currentDay: draft.currentDay,
        numberOfDays: draft.numberOfDays,
        currentRound: draft.currentRound,
        numberOfRounds: draft.numberOfRounds,
      })
      if (updated) {
        setAdminHackathons(prev => prev.map(item => item.id === h.id ? updated : item))
        if (selectedAdminHackathon?.id === h.id) setSelectedAdminHackathon(updated)
        setProgressionDrafts(prev => {
          const next = { ...prev }
          delete next[h.id]
          return next
        })
        toast.success(`Saved Day ${updated.currentDay}/${updated.numberOfDays} • Round ${updated.currentRound}/${updated.numberOfRounds}`)
      }
    } catch (err) {
      toast.error('Failed to save progression changes')
    } finally {
      setSavingProgressionId(null)
    }
  }

  const handleToggleQualification = async (teamId: string, round: number, current: boolean) => {
    try {
      const nextQual = !current
      await updateAdminTeamQual(teamId, round, nextQual)
      let resetPosNeeded = false

      setAdminTeams(prev => prev.map(t => {
        if (t.id === teamId) {
          if (!nextQual && t.position) resetPosNeeded = true
          return {
            ...t,
            qualifications: { ...t.qualifications, [String(round)]: nextQual },
            position: !nextQual ? null : t.position,
          }
        }
        return t
      }))

      if (resetPosNeeded && selectedAdminHackathon) {
        await updateAdminTeamPos(selectedAdminHackathon.id, teamId, null)
      }

      toast.success(`Team Round ${round} status updated`)
    } catch (err) {
      toast.error('Failed to update team qualification')
    }
  }

  const handleSetPodiumPosition = async (teamId: string, pos: 1 | 2 | 3 | null) => {
    if (!selectedAdminHackathon) return
    try {
      await updateAdminTeamPos(selectedAdminHackathon.id, teamId, pos)
      setAdminTeams(prev => prev.map(t => {
        if (t.id === teamId) return { ...t, position: pos }
        if (t.position === pos && pos !== null) return { ...t, position: null }
        return t
      }))
      toast.success(pos ? `Assigned #${pos} Place Podium!` : 'Cleared podium position')
    } catch (err) {
      toast.error('Failed to set podium position')
    }
  }

  const handleToggleMemberAttendance = async (team: HackathonTeam, memberIdx: number) => {
    if (!selectedAdminHackathon) return
    const currentDay = selectedAdminHackathon.currentDay
    const updatedMembers = [...team.members]
    updatedMembers[memberIdx] = {
      ...updatedMembers[memberIdx],
      present: !updatedMembers[memberIdx].present
    }
    try {
      await markAdminMemberAttendance(team.id, currentDay, updatedMembers)
      setAdminTeams(prev => prev.map(t => {
        if (t.id === team.id) {
          return {
            ...t,
            members: updatedMembers,
            dayAttendance: {
              ...t.dayAttendance,
              [String(currentDay)]: { marked: true, markedAt: new Date().toISOString(), members: updatedMembers }
            }
          }
        }
        return t
      }))
      toast.success('Member attendance updated')
    } catch (err) {
      toast.error('Failed to update attendance')
    }
  }

  const openAddHackathonModal = () => {
    setEditingHackathonId(null)
    setHTitleInput('')
    setHDescInput('')
    setHStartInput(new Date().toISOString().slice(0, 16))
    setHEndInput(new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16))
    setHDeadlineInput(new Date(Date.now() + 86400000).toISOString().slice(0, 16))
    setHVenueInput('Main Campus Auditorium & Discord')
    setHBannerInput('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80')
    setHMinTeamInput(1)
    setHMaxTeamInput(4)
    setHMaxTeamsInput(50)
    setHDaysInput(2)
    setHRoundsInput(3)
    setHRulesInput('1. Write clean original code.\n2. Respect judge decisions.')
    setHStatusInput('upcoming')
    setHRegOpenInput(true)
    setShowHackathonModal(true)
  }

  const openEditHackathonModal = (h: Hackathon) => {
    setEditingHackathonId(h.id)
    setHTitleInput(h.title)
    setHDescInput(h.description)
    setHStartInput(h.startDate.slice(0, 16))
    setHEndInput(h.endDate.slice(0, 16))
    setHDeadlineInput(h.registrationDeadline.slice(0, 16))
    setHVenueInput(h.venue)
    setHBannerInput(h.bannerUrl)
    setHMinTeamInput(h.minTeamSize)
    setHMaxTeamInput(h.maxTeamSize)
    setHMaxTeamsInput(h.maxTeams)
    setHDaysInput(h.numberOfDays)
    setHRoundsInput(h.numberOfRounds)
    setHRulesInput(h.rules)
    setHStatusInput(h.status)
    setHRegOpenInput(h.isRegistrationOpen)
    setShowHackathonModal(true)
  }

  const handleSaveHackathonForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hTitleInput.trim()) {
      toast.error('Title is required')
      return
    }

    setHackathonSaving(true)
    try {
      const payload: CreateHackathonInput = {
        title: hTitleInput.trim(),
        description: hDescInput.trim(),
        startDate: hStartInput,
        endDate: hEndInput,
        registrationDeadline: hDeadlineInput,
        venue: hVenueInput.trim(),
        bannerUrl: hBannerInput.trim(),
        minTeamSize: hMinTeamInput,
        maxTeamSize: hMaxTeamInput,
        maxTeams: hMaxTeamsInput,
        numberOfDays: hDaysInput,
        numberOfRounds: hRoundsInput,
        isRegistrationOpen: (hStatusInput === 'ongoing' || hStatusInput === 'completed') ? false : hRegOpenInput,
        status: hStatusInput,
        rules: hRulesInput.trim(),
      }

      if (editingHackathonId) {
        const updated = await updateAdminHackathon(editingHackathonId, payload)
        if (updated) {
          setAdminHackathons(prev => prev.map(h => h.id === editingHackathonId ? updated : h))
          if (selectedAdminHackathon?.id === editingHackathonId) setSelectedAdminHackathon(updated)
          toast.success('Hackathon updated!')
        }
      } else {
        const created = await createAdminHackathon(payload)
        setAdminHackathons(prev => [created, ...prev])
        toast.success('Hackathon created!')
      }
      setShowHackathonModal(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save hackathon')
    } finally {
      setHackathonSaving(false)
    }
  }

  const openDeleteModal = (h: Hackathon) => {
    setDeletingHackathon(h)
    setDeleteConfirmText('')
  }

  const handleConfirmDeleteHackathon = async () => {
    if (!deletingHackathon) return
    if (deleteConfirmText.trim() !== deletingHackathon.title.trim()) {
      toast.error('Hackathon title does not match')
      return
    }

    setIsDeletingHackathon(true)
    try {
      await deleteAdminHackathon(deletingHackathon.id)
      setAdminHackathons(prev => prev.filter(h => h.id !== deletingHackathon.id))
      if (selectedAdminHackathon?.id === deletingHackathon.id) setSelectedAdminHackathon(null)
      toast.success(`Hackathon "${deletingHackathon.title}" deleted successfully`)
      setDeletingHackathon(null)
      setDeleteConfirmText('')
    } catch (err) {
      toast.error('Failed to delete hackathon')
    } finally {
      setIsDeletingHackathon(false)
    }
  }

  const exportTeamsCSV = () => {
    if (!selectedAdminHackathon || adminTeams.length === 0) return
    const headers = ['Team Code', 'Team Name', 'Leader Name', 'Leader Email', 'College', 'Branch', 'Member Count', 'Podium Position']
    const rows = adminTeams.map(t => [
      `"${t.teamCode}"`,
      `"${t.teamName.replace(/"/g, '""')}"`,
      `"${t.leaderName.replace(/"/g, '""')}"`,
      `"${t.leaderEmail.replace(/"/g, '""')}"`,
      `"${t.leaderCollege.replace(/"/g, '""')}"`,
      `"${t.leaderBranch.replace(/"/g, '""')}"`,
      t.members.length,
      t.position ? `"${t.position} Place"` : '"N/A"',
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${selectedAdminHackathon.title.replace(/[^a-zA-Z0-9]/g, '_')}_Registrations.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV Report Downloaded!')
  }

  // ─── Supabase Mentorship State ─────────────────────────────────────────────
  const [dbMentors, setDbMentors] = useState<Mentor[]>([])
  const [dbSessions, setDbSessions] = useState<MentorSession[]>([])
  const [dbGuidanceRequests, setDbGuidanceRequests] = useState<GuidanceRequest[]>([])
  const [mentorshipLoading, setMentorshipLoading] = useState(false)
  const [mentorSaving, setMentorSaving] = useState(false)
  // Mentor photo upload state
  const [mentorPhotoFile, setMentorPhotoFile] = useState<File | null>(null)
  const [mentorPhotoUploadStatus, setMentorPhotoUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [mentorExistingPhotoUrl, setMentorExistingPhotoUrl] = useState('')

  // ─── Supabase Courses State ─────────────────────────────────────────────────
  const [dbCourses, setDbCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [courseSaving, setCourseSaving] = useState(false)
  // Course video upload state
  const [courseVideoFile, setCourseVideoFile] = useState<File | null>(null)
  const [courseVideoUploadStatus, setCourseVideoUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [courseVideoUploadProgress, setCourseVideoUploadProgress] = useState(0)
  const [courseExistingVideoUrl, setCourseExistingVideoUrl] = useState('')
  const [courseVideoAudioCheck, setCourseVideoAudioCheck] = useState<'checking' | 'has-audio' | 'no-audio' | null>(null)
  const [courseVideoDurationSeconds, setCourseVideoDurationSeconds] = useState<number | null>(null)
  // Course thumbnail upload state
  const [courseThumbFile, setCourseThumbFile] = useState<File | null>(null)
  const [courseThumbUploadStatus, setCourseThumbUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [courseExistingThumbUrl, setCourseExistingThumbUrl] = useState('')
  // Course chapters / YouTube-style timestamps state
  type CourseTimestampDraft = Partial<VideoTimestamp> & { timeSeconds: number; label: string; sortOrder: number }
  const [courseTimestamps, setCourseTimestamps] = useState<CourseTimestampDraft[]>([])
  const [timestampsLoading, setTimestampsLoading] = useState(false)
  const [newTimestampTime, setNewTimestampTime] = useState('')
  const [newTimestampLabel, setNewTimestampLabel] = useState('')
  const [timestampSaving, setTimestampSaving] = useState(false)
  const [deletingTimestampId, setDeletingTimestampId] = useState<string | null>(null)

  // ─── Webinars ───────────────────────────────────────────────────────────────
  const [liveWebinars, setLiveWebinars] = useState<LiveWebinar[]>([])
  const [webinarRecordings, setWebinarRecordings] = useState<WebinarRecording[]>([])
  const [webinarBusy, setWebinarBusy] = useState(false)
  const [editingWebinarId, setEditingWebinarId] = useState<string | null>(null)
  const [showWebinarEditModal, setShowWebinarEditModal] = useState(false)

  // Lock the page behind the webinar edit modal. The modal itself remains scrollable.
  useEffect(() => {
    if (!showWebinarEditModal) return
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [showWebinarEditModal])
  const [liveTitle, setLiveTitle] = useState('')
  const [liveDescription, setLiveDescription] = useState('')
  const [liveProvider, setLiveProvider] = useState<WebinarProvider>('Google Meet')
  const [liveJoinUrl, setLiveJoinUrl] = useState('')
  const [liveAccess, setLiveAccess] = useState<WebinarAccess>('free')
  const [livePrice, setLivePrice] = useState('0')
  const [liveStartsAt, setLiveStartsAt] = useState('')
  const [liveEndsAt, setLiveEndsAt] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startHour, setStartHour] = useState('')
  const [startMinute, setStartMinute] = useState('00')
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('AM')
  const [hasEndTime, setHasEndTime] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [endHour, setEndHour] = useState('')
  const [endMinute, setEndMinute] = useState('00')
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('AM')
  const [recordingTitle, setRecordingTitle] = useState('')
  const [recordingDescription, setRecordingDescription] = useState('')
  const [recordingDate, setRecordingDate] = useState(new Date().toISOString().slice(0, 10))
  const [recordingFile, setRecordingFile] = useState<File | null>(null)
  const [recordingDuration, setRecordingDuration] = useState('')
  const [recordingAccess, setRecordingAccess] = useState<WebinarAccess>('free')
  const [recordingPrice, setRecordingPrice] = useState('0')
  const [recordingUploadProgress, setRecordingUploadProgress] = useState(0)
  const [recordingDurationLoading, setRecordingDurationLoading] = useState(false)

  // Automatically detect the selected replay's real duration from browser
  // video metadata. The admin does not need to type the duration manually.
  useEffect(() => {
    let active = true
    if (!recordingFile) {
      setRecordingDuration('')
      setRecordingDurationLoading(false)
      return
    }
    setRecordingDurationLoading(true)
      ; (async () => {
        const seconds = await getVideoDurationSeconds(recordingFile)
        if (!active) return
        setRecordingDuration(seconds != null ? formatDurationHuman(seconds) : '')
        setRecordingDurationLoading(false)
      })()
    return () => { active = false }
  }, [recordingFile])

  // Video card (same upload function as the Courses panel) reused inside the webinar edit modal
  const [webinarEditVideoFile, setWebinarEditVideoFile] = useState<File | null>(null)
  const [webinarEditVideoUploadStatus, setWebinarEditVideoUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [webinarEditVideoUploadProgress, setWebinarEditVideoUploadProgress] = useState(0)
  const [webinarEditVideoAudioCheck, setWebinarEditVideoAudioCheck] = useState<'checking' | 'has-audio' | 'no-audio' | null>(null)
  const [webinarEditVideoDurationSeconds, setWebinarEditVideoDurationSeconds] = useState<number | null>(null)

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

  // Hierarchy dropdown state for course form — same College → Course →
  // Branch → Semester → Subject cascade as the resource form above, kept in
  // its own state so the two modals never interfere with each other.
  const [cColleges, setCColleges] = useState<College[]>([])
  const [cCourses, setCCourses] = useState<DBCourse[]>([])
  const [cBranches, setCBranches] = useState<Branch[]>([])
  const [cSemesters, setCSemesters] = useState<Semester[]>([])
  const [cSubjects, setCSubjects] = useState<Subject[]>([])
  const [cSelectedCollegeId, setCSelectedCollegeId] = useState<number | ''>('')
  const [cSelectedCourseId, setCSelectedCourseId] = useState<number | ''>('')
  const [cSelectedBranchId, setCSelectedBranchId] = useState<number | ''>('')
  const [cSelectedSemesterId, setCSelectedSemesterId] = useState<number | ''>('')
  const [cSelectedSubjectId, setCSelectedSubjectId] = useState<number | ''>('')

  // Resource form fields
  const [resTitle, setResTitle] = useState('')
  const [resDescription, setResDescription] = useState('')
  const [resAuthor, setResAuthor] = useState('')
  // File upload states
  const [resUploadFile, setResUploadFile] = useState<File | null>(null)
  const [resUploadProgress, setResUploadProgress] = useState(0)
  const [resUploadStatus, setResUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [resExistingFileUrl, setResExistingFileUrl] = useState('')
  const [resUploadMode, setResUploadMode] = useState<'bundle' | 'individual'>('bundle')
  const [resIsPremium, setResIsPremium] = useState(false)
  const [resPrice, setResPrice] = useState<number>(0)
  const [resStatus, setResStatus] = useState<'Published' | 'Draft'>('Draft')

  // Subject Bundle live lookup states for Course & Resource modals
  const [courseSubjectBundle, setCourseSubjectBundle] = useState<SubjectBundle | null | undefined>(undefined)
  const [loadingCourseBundle, setLoadingCourseBundle] = useState(false)
  const [resourceSubjectBundle, setResourceSubjectBundle] = useState<SubjectBundle | null | undefined>(undefined)
  const [loadingResourceBundle, setLoadingResourceBundle] = useState(false)

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

  // ─── Users from Supabase ──────────────────────────────────────────────────
  const [dbUsers, setDbUsers] = useState<UserWithEnrollmentDetails[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserWithEnrollmentDetails | null>(null)
  const [userFilter, setUserFilter] = useState<'all' | 'paid' | 'free' | 'none'>('all')
  const [studentModalTab, setStudentModalTab] = useState<'profile' | 'courses' | 'payments' | 'guidance'>('profile')
  const [grantItemCategory, setGrantItemCategory] = useState<'course' | 'resource' | 'webinar'>('course')
  const [grantItemId, setGrantItemId] = useState('')
  const [grantAccessType, setGrantAccessType] = useState<'paid' | 'free'>('paid')
  const [isGrantingAccess, setIsGrantingAccess] = useState(false)
  const [quickLookupQuery, setQuickLookupQuery] = useState('')
  const [editingAvatarUrl, setEditingAvatarUrl] = useState('')
  const [savingAvatar, setSavingAvatar] = useState(false)

  // ─── Payment Approvals & Verification State ───────────────────────────────
  const [paymentRequests, setPaymentRequests] = useState<Enrollment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'rejected'>('pending')
  const [inspectProofImage, setInspectProofImage] = useState<string | null>(null)
  const [rejectModalId, setRejectModalId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadPaymentRequests = useCallback(async () => {
    setPaymentsLoading(true)
    try {
      const data = await getAllEnrollments()
      setPaymentRequests(data)
    } catch (err) {
      console.error('Failed to load payment requests:', err)
    } finally {
      setPaymentsLoading(false)
    }
  }, [])

  const loadDbUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const data = await fetchAllUsersWithEnrollments()
      setDbUsers(data)
    } catch (err) {
      console.error('Failed to load users', err)
      toast.error(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'users') {
      loadDbUsers()
    }
    if (activeTab === 'payment-approvals') {
      loadPaymentRequests()
    }
  }, [activeTab, loadDbUsers, loadPaymentRequests])

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

  // Load resources when switching to resources tab
  useEffect(() => {
    if (activeTab === 'resources') {
      loadDbResources()
    }
  }, [activeTab, loadDbResources])

  // ─── Load courses from Supabase ────────────────────────────────────────────
  const loadDbCourses = useCallback(async () => {
    setCoursesLoading(true)
    try {
      const data = await fetchAllSiteCourses()
      setDbCourses(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load courses'
      toast.error(msg)
    } finally {
      setCoursesLoading(false)
    }
  }, [])

  // Load courses when switching to courses tab
  useEffect(() => {
    if (activeTab === 'courses') {
      loadDbCourses()
    }
  }, [activeTab, loadDbCourses])

  const loadWebinars = useCallback(async () => {
    setWebinarBusy(true)
    try {
      const [live, recordings] = await Promise.all([getLiveWebinars(), getWebinarRecordings()])
      setLiveWebinars(live); setWebinarRecordings(recordings)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to load webinars') }
    finally { setWebinarBusy(false) }
  }, [])

  useEffect(() => { if (activeTab === 'webinars') loadWebinars() }, [activeTab, loadWebinars])

  // ─── Load mentorship data from Supabase ────────────────────────────────────
  const loadMentorship = useCallback(async () => {
    setMentorshipLoading(true)
    try {
      const [m, s, g] = await Promise.all([fetchAllMentors(), fetchAllSessions(), fetchAllGuidanceRequests()])
      setDbMentors(m)
      setDbSessions(s)
      setDbGuidanceRequests(g)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load mentorship data')
    } finally {
      setMentorshipLoading(false)
    }
  }, [])

  // Load mentorship data when switching to mentorship tab
  useEffect(() => {
    if (activeTab === 'mentorship') {
      loadMentorship()
    }
  }, [activeTab, loadMentorship])

  // Ensure legacy mock numbers (e.g. 17,900 from initial demo) are sanitized to real data
  useEffect(() => {
    content.quizzes.forEach(q => {
      if (q.participants === 3400 || q.participants === 5600 || q.participants === 8900) {
        content.updateQuiz(q.id, { participants: 0 })
      }
    })
    content.roadmaps.forEach(r => {
      if (r.views === 45000 || r.views === 32000 || r.views === 28000) {
        content.updateRoadmap(r.id, { views: 0 })
      }
    })
  }, [content])

  // ─── Load career applications (Join Us form submissions) from Supabase ────
  const [careerApplications, setCareerApplications] = useState<CareerApplication[]>([])
  const [careerApplicationsLoading, setCareerApplicationsLoading] = useState(false)
  const [previewResume, setPreviewResume] = useState<{ url: string; name: string } | null>(null)

  const loadCareerApplications = useCallback(async () => {
    setCareerApplicationsLoading(true)
    try {
      setCareerApplications(await fetchAllCareerApplications())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load applications')
    } finally {
      setCareerApplicationsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'career-applications') {
      loadCareerApplications()
    }
  }, [activeTab, loadCareerApplications])

  const loadPathfinderCareers = useCallback(async () => {
    setPathfinderLoading(true)
    try {
      setCareerPaths(await getCareerPaths())
    } catch (err) {
      console.error('Failed to load career paths', err)
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

  // Auto-fill the course "Duration" field from the uploaded/selected video's
  // real length, once it's detected — but never overwrite a value the admin
  // already typed in themselves.
  useEffect(() => {
    if (courseVideoDurationSeconds != null && editItem?._type === 'course' && !editItem.duration) {
      setEditItem((p: any) => (p && !p.duration ? { ...p, duration: formatDurationHuman(courseVideoDurationSeconds) } : p))
    }
  }, [courseVideoDurationSeconds])

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

  // ─── Course form: Academic Hierarchy cascade (mirrors resource form) ───────
  useEffect(() => {
    if (showModal && editItem?._type === 'course') {
      fetchColleges().then(setCColleges).catch(() => toast.error('Failed to load colleges'))
    }
  }, [showModal, editItem?._type])

  useEffect(() => {
    if (cSelectedCollegeId) {
      fetchCourses(cSelectedCollegeId as number).then(setCCourses).catch(() => toast.error('Failed to load courses'))
      if (!isPrefillingRef.current) {
        setCSelectedCourseId(''); setCSelectedBranchId(''); setCSelectedSemesterId(''); setCSelectedSubjectId('')
        setCBranches([]); setCSemesters([]); setCSubjects([])
      }
    } else {
      setCCourses([])
      setCSelectedCourseId(''); setCSelectedBranchId(''); setCSelectedSemesterId(''); setCSelectedSubjectId('')
      setCBranches([]); setCSemesters([]); setCSubjects([])
    }
  }, [cSelectedCollegeId])

  useEffect(() => {
    if (cSelectedCourseId) {
      fetchBranches(cSelectedCourseId as number).then(setCBranches).catch(() => toast.error('Failed to load branches'))
      if (!isPrefillingRef.current) {
        setCSelectedBranchId(''); setCSelectedSemesterId(''); setCSelectedSubjectId('')
        setCSemesters([]); setCSubjects([])
      }
    } else {
      setCBranches([])
      setCSelectedBranchId(''); setCSelectedSemesterId(''); setCSelectedSubjectId('')
      setCSemesters([]); setCSubjects([])
    }
  }, [cSelectedCourseId])

  useEffect(() => {
    if (cSelectedBranchId) {
      fetchSemesters(cSelectedBranchId as number).then(setCSemesters).catch(() => toast.error('Failed to load semesters'))
      if (!isPrefillingRef.current) {
        setCSelectedSemesterId(''); setCSelectedSubjectId('')
        setCSubjects([])
      }
    } else {
      setCSemesters([])
      setCSelectedSemesterId(''); setCSelectedSubjectId('')
      setCSubjects([])
    }
  }, [cSelectedBranchId])

  useEffect(() => {
    if (cSelectedSemesterId) {
      fetchSubjects(cSelectedSemesterId as number).then(setCSubjects).catch(() => toast.error('Failed to load subjects'))
      if (!isPrefillingRef.current) {
        setCSelectedSubjectId('')
      }
    } else {
      setCSubjects([])
      setCSelectedSubjectId('')
    }
  }, [cSelectedSemesterId])

  // Lookup active Subject Bundle for Course Modal
  useEffect(() => {
    if (showModal && editItem?._type === 'course') {
      if (cSelectedSubjectId) {
        setLoadingCourseBundle(true)
        fetchSubjectBundle(Number(cSelectedSubjectId))
          .then(b => setCourseSubjectBundle(b))
          .catch(() => setCourseSubjectBundle(null))
          .finally(() => setLoadingCourseBundle(false))
      } else {
        setCourseSubjectBundle(undefined)
      }
    }
  }, [showModal, editItem?._type, cSelectedSubjectId])

  // Lookup active Subject Bundle for Resource Modal
  useEffect(() => {
    if (showModal && editItem?._type === 'resource') {
      const activeSubjId = selectedSubjectId || editItem?.subjectId
      if (activeSubjId) {
        setLoadingResourceBundle(true)
        fetchSubjectBundle(Number(activeSubjId))
          .then(b => setResourceSubjectBundle(b))
          .catch(() => setResourceSubjectBundle(null))
          .finally(() => setLoadingResourceBundle(false))
      } else {
        setResourceSubjectBundle(undefined)
      }
    }
  }, [showModal, editItem?._type, selectedSubjectId, editItem?.subjectId])

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

  // Users loaded directly from Supabase profiles & enrollments
  const users = dbUsers

  const openAdd = (type?: string) => {
    if (type === 'course') {
      setCourseVideoFile(null); setCourseVideoUploadStatus('idle'); setCourseVideoUploadProgress(0); setCourseExistingVideoUrl('')
      setCourseThumbFile(null); setCourseThumbUploadStatus('idle'); setCourseExistingThumbUrl('')
      setCourseTimestamps([]); setNewTimestampTime(''); setNewTimestampLabel('')
      setCourseVideoAudioCheck(null)
      setCourseVideoDurationSeconds(null)
      setCSelectedCollegeId(''); setCSelectedCourseId(''); setCSelectedBranchId('')
      setCSelectedSemesterId(''); setCSelectedSubjectId('')
      setCCourses([]); setCBranches([]); setCSemesters([]); setCSubjects([])
    }
    if (type === 'mentor') {
      setMentorPhotoFile(null); setMentorPhotoUploadStatus('idle'); setMentorExistingPhotoUrl('')
    }
    if (type === 'resource') {
      // Reset resource form
      setResTitle(''); setResDescription(''); setResAuthor('Skills021 Team')
      setResUploadFile(null); setResUploadProgress(0); setResUploadStatus('idle'); setResExistingFileUrl('')
      setResUploadMode('bundle')
      setResIsPremium(false); setResPrice(0); setResStatus('Published')
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
    } else if (type === 'course') {
      setCSelectedCollegeId(''); setCSelectedCourseId(''); setCSelectedBranchId('')
      setCSelectedSemesterId(''); setCSelectedSubjectId('')
      setCCourses([]); setCBranches([]); setCSemesters([]); setCSubjects([])
      setCourseVideoFile(null); setCourseVideoUploadStatus('idle'); setCourseExistingVideoUrl('')
      setCourseThumbFile(null); setCourseThumbUploadStatus('idle'); setCourseExistingThumbUrl('')
      setEditItem({
        _type: type,
        status: 'Published',
        group: 'College & Tech Courses',
        subcategory: 'DSA',
        level: 'Beginner',
        isFree: false,
        price: '',
        uploadMode: 'bundle',
      })
    } else {
      setEditItem({ _type: type })
    }
    setShowModal(true)
  }
  const openEdit = async (item: any) => {
    if (item._type === 'course') {
      item.uploadMode = item.isBundleOnly ? 'bundle' : 'individual'
      setCourseVideoFile(null); setCourseVideoUploadStatus('idle'); setCourseVideoUploadProgress(0); setCourseExistingVideoUrl(item.videoUrl || '')
      setCourseThumbFile(null); setCourseThumbUploadStatus('idle'); setCourseExistingThumbUrl(item.thumbnail || '')
      setNewTimestampTime(''); setNewTimestampLabel('')
      setCourseVideoAudioCheck(null)
      setCourseVideoDurationSeconds(null)
      if (item.videoUrl) {
        getVideoDurationSeconds(item.videoUrl).then(setCourseVideoDurationSeconds)
      }
      if (item.id) {
        setTimestampsLoading(true)
        try {
          const ts = await getTimestamps(String(item.id))
          setCourseTimestamps(ts)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to load chapters')
        } finally {
          setTimestampsLoading(false)
        }
      } else {
        setCourseTimestamps([])
      }

      // Pre-fill Academic Hierarchy dropdowns from the course's stored subjectId
      setCSelectedCollegeId(''); setCSelectedCourseId(''); setCSelectedBranchId('')
      setCSelectedSemesterId(''); setCSelectedSubjectId('')
      setCCourses([]); setCBranches([]); setCSemesters([]); setCSubjects([])
      if (item.collegeId) {
        isPrefillingRef.current = true
        try {
          setCSelectedCollegeId(item.collegeId)
          const crs = await fetchCourses(item.collegeId)
          setCCourses(crs)
          if (item.academicCourseId) {
            setCSelectedCourseId(item.academicCourseId)
            const brs = await fetchBranches(item.academicCourseId)
            setCBranches(brs)
            if (item.branchId) {
              setCSelectedBranchId(item.branchId)
              const sems = await fetchSemesters(item.branchId)
              setCSemesters(sems)
              if (item.semesterId) {
                setCSelectedSemesterId(item.semesterId)
                const subs = await fetchSubjects(item.semesterId)
                setCSubjects(subs)
                if (item.subjectId) setCSelectedSubjectId(item.subjectId)
              }
            }
          }
        } catch (err) {
          console.error('Failed to prefill course hierarchy:', err)
        } finally {
          isPrefillingRef.current = false
        }
      }
    }
    if (item._type === 'mentor') {
      setMentorPhotoFile(null); setMentorPhotoUploadStatus('idle'); setMentorExistingPhotoUrl(item.photo || '')
    }
    if (item._type === 'resource') {
      // Pre-fill resource form fields for editing
      setResTitle(item.title || ''); setResDescription(item.description || '')
      setResAuthor(item.author || '')
      setResUploadFile(null); setResUploadProgress(0); setResUploadStatus('idle'); setResExistingFileUrl(item.downloadUrl || '')
      setResUploadMode(item.isBundleOnly ? 'bundle' : 'individual')
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
  const closeModal = () => {
    setShowModal(false)
    setEditItem(null)
    setPathfinderErrors({})
    setCourseSubjectBundle(undefined)
    setResourceSubjectBundle(undefined)
  }

  // Adds a chapter/timestamp for the course currently being edited, with
  // validation against the video's actual detected duration so admins can't
  // accidentally add a chapter past the end of the video.
  const handleAddChapter = async () => {
    if (!newTimestampTime || !newTimestampLabel.trim()) return
    const seconds = parseTimeToSeconds(newTimestampTime)
    if (!Number.isFinite(seconds) || seconds < 0) {
      toast.error('Enter a valid time, e.g. 0.05, 0:05, or 0:05:00')
      return
    }
    if (courseVideoDurationSeconds != null && seconds > Math.ceil(courseVideoDurationSeconds)) {
      toast.error(`That's past the end of the video (${formatSeconds(courseVideoDurationSeconds)} long)`)
      return
    }
    setTimestampSaving(true)
    try {
      const draft = { timeSeconds: seconds, label: newTimestampLabel.trim(), sortOrder: courseTimestamps.length }
      if (editItem?.id) {
        const created = await addTimestamp(String(editItem.id), seconds, draft.label, courseTimestamps.length)
        setCourseTimestamps(prev => [...prev, created].sort((a, b) => a.timeSeconds - b.timeSeconds))
        toast.success('Chapter added')
      } else {
        setCourseTimestamps(prev => [...prev, draft].sort((a, b) => a.timeSeconds - b.timeSeconds).map((item, index) => ({ ...item, sortOrder: index })))
        toast.success('Chapter queued — it will be saved with the course')
      }
      setNewTimestampTime(''); setNewTimestampLabel('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add chapter')
    } finally {
      setTimestampSaving(false)
    }
  }

  // ─── Overview ───────────────────────────────────────────────────────────────
  const renderOverview = () => {
    const statsCards = [
      { label: 'Total Courses', val: dbCourses.length, icon: BookOpen, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
      { label: 'Resources', val: dbResources.length, icon: FileText, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
      { label: 'Quizzes', val: content.quizzes.length, icon: HelpCircle, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
      { label: 'Roadmaps', val: content.roadmaps.length, icon: Map, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
      { label: 'Active Mentors', val: dbMentors.filter(m => m.status === 'Active').length, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
      { label: 'Total Users', val: dbUsers.length, icon: Users, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
      { label: 'Paid Course Students', val: dbUsers.filter(u => u.hasPaidCourses).length, icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
      { label: 'New Guidance Requests', val: dbGuidanceRequests.filter(r => r.status === 'New').length, icon: Users, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
      { label: 'New Join Us Applications', val: careerApplications.filter(a => a.status === 'New').length, icon: Briefcase, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    ]

    const totalDownloads = dbResources.reduce((a, r) => a + (r.downloads ?? 0), 0)
    const totalEnrolled = dbCourses.reduce((a, c) => a + (c.enrolled ?? 0), 0)
    const totalQuizParticipants = content.quizzes.reduce((a, q) => {
      const p = (q.participants === 3400 || q.participants === 5600 || q.participants === 8900) ? 0 : (q.participants ?? 0)
      return a + p
    }, 0)
    const totalSessions = dbSessions.length

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
            {dbCourses.slice(0, 5).map(c => (
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
    const filtered = dbCourses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    return (
      <div>
        <SectionHeader title="Manage Courses" count={dbCourses.length} onAdd={() => openAdd('course')} addLabel="Add Course" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search courses..." />
        {coursesLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-brand-muted dark:text-brand-dark-muted mb-3" />
            <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Loading courses...</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>{['Title', 'Group', 'Subcategory', 'Price', 'Video', 'Enrolled', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text max-w-[180px] truncate">{c.title}</td>
                      <td className="px-4 py-3 text-xs text-brand-muted dark:text-brand-dark-muted whitespace-nowrap">{c.group}</td>
                      <td className="px-4 py-3 font-medium">
                        {c.isBundleOnly ? (
                          <span className="badge bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs inline-flex items-center gap-1 font-bold">
                            <Package size={12} /> Under Bundle
                          </span>
                        ) : c.price === 'FREE' ? (
                          <span className="text-green-500 font-bold">FREE</span>
                        ) : (
                          `₹${c.price}`
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.videoUrl ? (
                          <span className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 font-semibold px-2 py-0.5 rounded-md">Uploaded</span>
                        ) : (
                          <span className="text-[10px] bg-gray-100 dark:bg-white/10 text-brand-muted font-semibold px-2 py-0.5 rounded-md">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted">{(c.enrolled ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              try {
                                const updated = await toggleSiteCourseStatus(c.id, c.status)
                                setDbCourses(prev => prev.map(x => x.id === c.id ? updated : x))
                                toast.success(`Course ${updated.status === 'Published' ? 'published' : 'unpublished'}`)
                              } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to toggle status') }
                            }}
                            title={c.status === 'Published' ? 'Unpublish' : 'Publish'}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted dark:text-brand-dark-muted transition-colors"
                          >{c.status === 'Published' ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                          <button onClick={() => openEdit({ ...c, _type: 'course' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteId({ id: c.id, title: c.title, type: 'course' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !coursesLoading && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-brand-muted text-sm">No courses found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
                      <td className="px-4 py-3">
                        {r.isBundleOnly ? (
                          <span className="badge bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs inline-flex items-center gap-1 font-bold">
                            <Package size={12} /> Under Bundle
                          </span>
                        ) : r.isPremium ? (
                          <span className="badge bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-xs">₹{r.price ?? 0}</span>
                        ) : (
                          <span className="badge bg-green-50 dark:bg-green-900/20 text-green-600 text-xs">Free</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              try {
                                const updated = await toggleResourceStatusApi(r.id, r.status)
                                setDbResources(prev => prev.map(res => res.id === r.id ? updated : res))
                                toast.success(`Resource ${updated.status === 'Published' ? 'published' : 'unpublished'}`)
                              } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to toggle status') }
                            }}
                            title={r.status === 'Published' ? 'Unpublish' : 'Publish'}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"
                          >
                            {r.status === 'Published' ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
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
                    <td className="px-4 py-3 text-brand-muted">{(q.participants === 3400 || q.participants === 5600 || q.participants === 8900 ? 0 : (q.participants ?? 0)).toLocaleString()}</td>
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
  const CAREER_STATUS_STYLES: Record<ApplicationStatus, string> = {
    'New': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'In Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Shortlisted': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Hired': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }

  const renderCareerApplications = () => (
    <div className="space-y-6">
      <SectionHeader title="Join Us Applications" count={careerApplications.length} />
      {careerApplicationsLoading && (
        <div className="flex items-center gap-2 text-sm text-brand-muted dark:text-brand-dark-muted">
          <Loader2 size={16} className="animate-spin" /> Loading applications...
        </div>
      )}
      {!careerApplicationsLoading && careerApplications.length === 0 ? (
        <div className="card p-10 text-center text-sm text-brand-muted dark:text-brand-dark-muted">
          No one has submitted the "Join Us" form yet. Submissions will show up here automatically.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Applicant', 'Contact', 'Type / Role', 'Experience', 'Resume', 'Applied', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {careerApplications.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-text dark:text-brand-dark-text">{a.fullName}</p>
                      <p className="text-xs text-brand-muted">{a.collegeOrOrganization || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-muted text-xs">
                      <p className="flex items-center gap-1"><Mail size={11} /> {a.email || '—'}</p>
                      <p className="flex items-center gap-1 mt-0.5"><Phone size={11} /> {a.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-muted text-xs">
                      <p className="font-medium text-brand-text dark:text-brand-dark-text">{a.applicationType}</p>
                      <p>{a.role || '—'}{a.department ? ` · ${a.department}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-muted text-xs">{a.experienceLevel || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {a.resumeUrl ? (
                        <button
                          onClick={() => setPreviewResume({ url: a.resumeUrl, name: a.fullName })}
                          className="flex items-center gap-1 text-primary-500 hover:underline"
                        >
                          <ExternalLink size={11} /> View
                        </button>
                      ) : <span className="text-brand-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-brand-muted text-xs whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CAREER_STATUS_STYLES[a.status]}`}>{a.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <select
                          value={a.status}
                          onChange={async (e) => {
                            const status = e.target.value as ApplicationStatus
                            try {
                              const updated = await updateCareerApplicationStatus(a.id, status)
                              setCareerApplications(prev => prev.map(x => x.id === a.id ? updated : x))
                            } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to update status') }
                          }}
                          className="text-xs px-2 py-1 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text focus:outline-none"
                        >
                          {(['New', 'In Review', 'Shortlisted', 'Rejected', 'Hired'] as ApplicationStatus[]).map(st => <option key={st}>{st}</option>)}
                        </select>
                        <button
                          onClick={() => setDeleteId({ id: a.id, title: a.fullName, type: 'careerApplication' })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderMentorship = () => (
    <div className="space-y-6">
      {mentorshipLoading && (
        <div className="flex items-center gap-2 text-sm text-brand-muted dark:text-brand-dark-muted">
          <Loader2 size={16} className="animate-spin" /> Loading mentorship data...
        </div>
      )}
      {/* Guidance Requests — submitted via the public Mentorship form */}
      <div>
        <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-4">
          Guidance Requests ({dbGuidanceRequests.length})
        </h3>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Student', 'Contact', 'Class / Institution', 'Guidance Needed', 'Submitted', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {dbGuidanceRequests.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-text dark:text-brand-dark-text">{r.fullName}</p>
                      <p className="text-xs text-brand-muted">{r.city}{r.city && r.state ? ', ' : ''}{r.state}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-muted text-xs">
                      <p>{r.mobile}</p>
                      <p>{r.email}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-muted text-xs">
                      <p>{r.classYear || '—'}</p>
                      <p>{r.schoolCollege || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-muted text-xs max-w-[220px]">
                      {r.guidanceTypes.slice(0, 2).join(', ')}
                      {r.guidanceTypes.length > 2 ? ` +${r.guidanceTypes.length - 2} more` : ''}
                    </td>
                    <td className="px-4 py-3 text-brand-muted text-xs whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3"><MentorStatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewGuidanceRequest(r)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-text dark:text-brand-dark-text" title="View details"><Eye size={14} /></button>
                        <select
                          value={r.status}
                          onChange={async (e) => {
                            const status = e.target.value as GuidanceRequest['status']
                            try {
                              const updated = await updateGuidanceRequestStatusApi(r.id, status)
                              setDbGuidanceRequests(prev => prev.map(x => x.id === r.id ? updated : x))
                            } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to update status') }
                          }}
                          className="text-xs px-2 py-1 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text focus:outline-none"
                        >
                          {['New', 'In Progress', 'Contacted', 'Completed'].map(st => <option key={st}>{st}</option>)}
                        </select>
                        <button onClick={() => setDeleteId({ id: r.id, title: r.fullName, type: 'guidanceRequest' })} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dbGuidanceRequests.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-brand-muted text-sm">No guidance requests yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SectionHeader title="Manage Mentors" count={dbMentors.length} onAdd={() => openAdd('mentor')} addLabel="Add Mentor" />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>{['Mentor', 'Company', 'Services', 'Sessions', 'Rating', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
              {dbMentors.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {m.photo ? (
                        <img src={m.photo} alt={m.name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-violet-200 dark:ring-violet-900/50" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                          {m.name?.[0] || 'M'}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-brand-text dark:text-brand-dark-text">{m.name}</p>
                        <p className="text-xs text-brand-muted">{m.designation}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-muted text-xs">{m.company}</td>
                  <td className="px-4 py-3 text-brand-muted text-xs">{m.services.length} services</td>
                  <td className="px-4 py-3 text-brand-muted">{(m.sessions ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-brand-text dark:text-brand-dark-text font-semibold">⭐ {m.rating}</td>
                  <td className="px-4 py-3"><MentorStatusBadge status={m.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async () => {
                          try {
                            const updated = await toggleMentorStatusApi(m.id, m.status)
                            setDbMentors(prev => prev.map(x => x.id === m.id ? updated : x))
                            toast.success(`Mentor ${updated.status === 'Active' ? 'activated' : 'deactivated'}`)
                          } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to toggle status') }
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"
                      ><EyeOff size={14} /></button>
                      <button onClick={() => openEdit({ ...m, _type: 'mentor' })} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-text dark:text-brand-dark-text"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteId({ id: m.id, title: m.name, type: 'mentor' })} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {dbMentors.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-brand-muted text-sm">No mentors yet. Click "Add Mentor" to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sessions — fully managed by admin: create, edit, update status, delete */}
      <div>
        <SectionHeader title="Sessions" count={dbSessions.length} onAdd={() => openAdd('session')} addLabel="Add Session" />
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Student', 'Mentor', 'Service', 'Date', 'Fee', 'Status', 'Update', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {dbSessions.map(s => {
                  const mentor = dbMentors.find(m => m.id === s.mentorId)
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text">{s.studentName}</td>
                      <td className="px-4 py-3 text-brand-muted text-xs">{mentor?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-brand-muted text-xs">{s.serviceType}</td>
                      <td className="px-4 py-3 text-brand-muted text-xs">{s.date} {s.time}</td>
                      <td className="px-4 py-3 font-semibold text-brand-text dark:text-brand-dark-text">₹{s.fee}</td>
                      <td className="px-4 py-3"><MentorStatusBadge status={s.status} /></td>
                      <td className="px-4 py-3">
                        <select
                          value={s.status}
                          onChange={async e => {
                            const status = e.target.value as MentorSession['status']
                            try {
                              const updated = await updateSessionStatusApi(s.id, status)
                              setDbSessions(prev => prev.map(x => x.id === s.id ? updated : x))
                            } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to update status') }
                          }}
                          className="text-xs px-2 py-1 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text focus:outline-none"
                        >
                          {['Pending', 'Confirmed', 'Completed', 'Cancelled'].map(st => <option key={st}>{st}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit({ ...s, _type: 'session' })} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-text dark:text-brand-dark-text" title="Edit session"><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteId({ id: s.id, title: s.studentName, type: 'session' })} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted" title="Delete session"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {dbSessions.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-brand-muted text-sm">No sessions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── Users (Supabase Profiles, Avatars & Granular Access Controller) ───────
  const renderUsers = () => {
    const getStudentAvatarUrl = (name?: string, avatarUrl?: string) => {
      if (avatarUrl && avatarUrl.trim()) return avatarUrl
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Student')}&background=6366f1&color=fff&bold=true&font-size=0.45`
    }

    const searchLower = search.toLowerCase()
    const filtered = dbUsers.filter((u) => {
      const matchText =
        (u.name || '').toLowerCase().includes(searchLower) ||
        (u.email || '').toLowerCase().includes(searchLower) ||
        (u.college || '').toLowerCase().includes(searchLower) ||
        (u.phone || '').toLowerCase().includes(searchLower) ||
        (u.id || '').toLowerCase().includes(searchLower)
      if (!matchText) return false

      if (userFilter === 'paid') return u.hasPaidCourses
      if (userFilter === 'free') return u.freeCoursesCount > 0 && !u.hasPaidCourses
      if (userFilter === 'none') return u.totalCoursesCount === 0
      return true
    })

    const totalPaidRevenue = dbUsers.reduce((sum, u) => sum + (u.totalAmountPaid || 0), 0)
    const totalPaidLearners = dbUsers.filter((u) => u.hasPaidCourses).length
    const totalFreeLearners = dbUsers.filter((u) => u.freeCoursesCount > 0 && !u.hasPaidCourses).length

    // Toggle Master All-Access Pass
    const handleTogglePremium = async (u: UserWithEnrollmentDetails) => {
      const newStatus = !u.is_premium
      const ok = await toggleUserPremiumStatus(u.id, newStatus)
      if (ok) {
        toast.success(newStatus ? `Granted All-Access Premium to ${u.name}! ⭐` : `Revoked Premium access for ${u.name}`)
        setDbUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, is_premium: newStatus } : item)))
        if (selectedUserDetail && selectedUserDetail.id === u.id) {
          setSelectedUserDetail((prev) => (prev ? { ...prev, is_premium: newStatus } : null))
        }
      } else {
        toast.error('Failed to update premium membership')
      }
    }

    // Save/Update Custom Student Avatar
    const handleSaveAvatar = async () => {
      if (!selectedUserDetail) return
      if (!editingAvatarUrl.trim()) {
        toast.error('Please enter a valid avatar image URL')
        return
      }

      setSavingAvatar(true)
      try {
        await upsertUserProfile({
          id: selectedUserDetail.id,
          avatar_url: editingAvatarUrl.trim(),
        })

        toast.success('Student avatar updated successfully! 🖼️')
        setSelectedUserDetail((prev) => (prev ? { ...prev, avatar_url: editingAvatarUrl.trim() } : null))
        setDbUsers((prev) =>
          prev.map((u) => (u.id === selectedUserDetail.id ? { ...u, avatar_url: editingAvatarUrl.trim() } : u))
        )
        setEditingAvatarUrl('')
      } catch (err: any) {
        toast.error(err.message || 'Failed to update avatar')
      } finally {
        setSavingAvatar(false)
      }
    }

    // Grant access to ANY specific item (Course, Study Notes/Resource, Webinar)
    const handleGrantSpecificAccess = async () => {
      if (!selectedUserDetail || !grantItemId) {
        toast.error('Please select an item to grant access to')
        return
      }

      let itemTitle = ''
      let defaultPrice = 0

      if (grantItemCategory === 'course') {
        const c = dbCourses.find((item) => item.id === grantItemId)
        if (!c) {
          toast.error('Course not found')
          return
        }
        itemTitle = c.title
        defaultPrice = typeof c.price === 'number' ? c.price : 0
      } else if (grantItemCategory === 'resource') {
        const r = dbResources.find((item) => String(item.id) === grantItemId)
        if (!r) {
          toast.error('Resource not found')
          return
        }
        itemTitle = `[Study Notes] ${r.title}`
        defaultPrice = r.isPremium ? 99 : 0
      } else if (grantItemCategory === 'webinar') {
        const w = liveWebinars.find((item) => item.id === grantItemId)
        if (!w) {
          toast.error('Webinar not found')
          return
        }
        itemTitle = `[Webinar] ${w.title}`
        defaultPrice = 199
      }

      if (selectedUserDetail.enrollments.some((e) => e.courseId === grantItemId)) {
        toast.error(`Student already has access to "${itemTitle}"`)
        return
      }

      setIsGrantingAccess(true)
      try {
        const parts = (selectedUserDetail.name || '').trim().split(' ')
        const firstName = parts[0] || 'Student'
        const lastName = parts.slice(1).join(' ') || ''
        const courseAmount = grantAccessType === 'paid' ? defaultPrice : 0

        const newEnr = await createEnrollment({
          courseId: grantItemId,
          userId: selectedUserDetail.id,
          firstName,
          lastName,
          email: selectedUserDetail.email,
          phone: selectedUserDetail.phone || '',
          status: grantAccessType,
          amount: courseAmount,
          itemTitle,
          itemType: grantItemCategory,
          utrNumber: 'Granted by Skills021',
        })

        toast.success(`Access granted to "${itemTitle}"! 🎉`)
        setGrantItemId('')

        const summaryItem: UserEnrollmentSummary = {
          id: newEnr.id,
          courseId: newEnr.courseId,
          courseTitle: itemTitle,
          firstName: newEnr.firstName,
          lastName: newEnr.lastName,
          email: newEnr.email,
          phone: newEnr.phone,
          amount: newEnr.amount,
          paymentStatus: (newEnr.status === 'paid' ? 'paid' : 'free') as 'paid' | 'free',
          status: 'active',
          createdAt: newEnr.createdAt,
        }

        setSelectedUserDetail((prev) =>
          prev
            ? {
                ...prev,
                enrollments: [summaryItem, ...prev.enrollments],
                totalCoursesCount: prev.totalCoursesCount + 1,
                paidCoursesCount: grantAccessType === 'paid' ? prev.paidCoursesCount + 1 : prev.paidCoursesCount,
                freeCoursesCount: grantAccessType === 'free' ? prev.freeCoursesCount + 1 : prev.freeCoursesCount,
                hasPaidCourses: prev.hasPaidCourses || grantAccessType === 'paid',
              }
            : null
        )

        setDbUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUserDetail.id
              ? {
                  ...u,
                  enrollments: [summaryItem, ...u.enrollments],
                  totalCoursesCount: u.totalCoursesCount + 1,
                  paidCoursesCount: grantAccessType === 'paid' ? u.paidCoursesCount + 1 : u.paidCoursesCount,
                  freeCoursesCount: grantAccessType === 'free' ? u.freeCoursesCount + 1 : u.freeCoursesCount,
                  hasPaidCourses: u.hasPaidCourses || grantAccessType === 'paid',
                }
              : u
          )
        )

        loadPaymentRequests()
      } catch (err: any) {
        toast.error(err.message || 'Failed to grant access')
      } finally {
        setIsGrantingAccess(false)
      }
    }

    // Revoke / Take Away access to ANY specific item
    const handleRevokeSpecificAccess = async (enrollmentId: string, itemTitle?: string) => {
      if (!selectedUserDetail) return
      try {
        await revokeAccess(enrollmentId, 'Access revoked by Skills021')
        toast.success(`Access to "${itemTitle || 'item'}" revoked! 🔒`)

        const enr = selectedUserDetail.enrollments.find((e) => e.id === enrollmentId)
        const isPaid = enr?.paymentStatus === 'paid' || (enr?.amount ?? 0) > 0

        setSelectedUserDetail((prev) =>
          prev
            ? {
                ...prev,
                enrollments: prev.enrollments.filter((e) => e.id !== enrollmentId),
                totalCoursesCount: Math.max(0, prev.totalCoursesCount - 1),
                paidCoursesCount: Math.max(0, prev.paidCoursesCount - (isPaid ? 1 : 0)),
                freeCoursesCount: Math.max(0, prev.freeCoursesCount - (!isPaid ? 1 : 0)),
                hasPaidCourses: prev.enrollments
                  .filter((e) => e.id !== enrollmentId)
                  .some((e) => e.paymentStatus === 'paid' || e.amount > 0),
              }
            : null
        )

        setDbUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUserDetail.id
              ? {
                  ...u,
                  enrollments: u.enrollments.filter((e) => e.id !== enrollmentId),
                  totalCoursesCount: Math.max(0, u.totalCoursesCount - 1),
                  paidCoursesCount: Math.max(0, u.paidCoursesCount - (isPaid ? 1 : 0)),
                  freeCoursesCount: Math.max(0, u.freeCoursesCount - (!isPaid ? 1 : 0)),
                  hasPaidCourses: u.enrollments
                    .filter((e) => e.id !== enrollmentId)
                    .some((e) => e.paymentStatus === 'paid' || e.amount > 0),
                }
              : u
          )
        )

        loadPaymentRequests()
      } catch (err: any) {
        toast.error(err.message || 'Failed to revoke access')
      }
    }

    return (
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Student Lookup & Access Control</h2>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
              Inspect any student's complete dossier, see their avatar, and grant or revoke access to any specific course, notes, or webinar
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDbUsers}
              disabled={usersLoading}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={usersLoading ? 'animate-spin' : ''} /> Refresh Students
            </button>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
              Total Spend: ₹{totalPaidRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-xs text-brand-muted dark:text-brand-dark-muted font-medium">Total Registered Students</p>
            <p className="text-2xl font-bold text-brand-text dark:text-brand-dark-text mt-1">{dbUsers.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-amber-500 font-medium flex items-center gap-1">
              <Sparkles size={12} /> All-Access Pass Holders
            </p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{dbUsers.filter((u) => u.is_premium).length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Paid Course Students</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalPaidLearners}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Free Course Students</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalFreeLearners}</p>
          </div>
        </div>

        {/* ─── QUICK STUDENT LOOKUP HUB ────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-primary-500/10 via-indigo-500/10 to-amber-500/10 border border-primary-500/30 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary-500 text-white shadow-md">
                <Search size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text">
                  Instant Student Lookup & Quick Access Hub
                </h3>
                <p className="text-xs text-brand-muted dark:text-brand-dark-muted">
                  Search any student by name, email, phone, college, or user ID to instantly inspect and grant/revoke access
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border text-brand-muted w-fit">
              {dbUsers.length} Students Indexed
            </span>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-500" />
            <input
              type="text"
              placeholder="Type student name, email (e.g. rahul@...), phone, or college to look up..."
              value={quickLookupQuery}
              onChange={(e) => setQuickLookupQuery(e.target.value)}
              className="input pl-10 pr-10 text-xs py-2.5 bg-white dark:bg-brand-dark-card border-primary-500/30 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 shadow-inner"
            />
            {quickLookupQuery && (
              <button
                onClick={() => setQuickLookupQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text text-xs p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Real-time Match Results with Avatars */}
          {quickLookupQuery.trim().length > 0 && (
            <div className="mt-2 bg-white dark:bg-brand-dark-card rounded-xl border border-primary-500/30 shadow-xl overflow-hidden divide-y divide-brand-border dark:divide-brand-dark-border max-h-80 overflow-y-auto">
              {(() => {
                const q = quickLookupQuery.toLowerCase().trim()
                const matches = dbUsers.filter(
                  (u) =>
                    (u.name || '').toLowerCase().includes(q) ||
                    (u.email || '').toLowerCase().includes(q) ||
                    (u.phone || '').toLowerCase().includes(q) ||
                    (u.college || '').toLowerCase().includes(q) ||
                    (u.id || '').toLowerCase().includes(q)
                )

                if (matches.length === 0) {
                  return (
                    <div className="p-6 text-center text-xs text-brand-muted">
                      No student found matching "{quickLookupQuery}". Try searching with another email or name.
                    </div>
                  )
                }

                return matches.slice(0, 8).map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-primary-50/50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-primary-500/30 shadow-md flex-shrink-0 bg-primary-500/10">
                        <img
                          src={getStudentAvatarUrl(u.name, u.avatar_url)}
                          alt={u.name}
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=6366f1&color=fff&bold=true`
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-xs text-brand-text dark:text-brand-dark-text truncate">{u.name}</p>
                          {u.is_premium && (
                            <span className="badge text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold">
                              ⭐ ALL-ACCESS PASS
                            </span>
                          )}
                          <span className="badge text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                            {u.enrollments.length} Item{u.enrollments.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-brand-muted truncate mt-0.5">
                          {u.email} • {u.college || 'Institution N/A'} • {u.phone || 'No phone'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setSelectedUserDetail(u)
                          setStudentModalTab('courses')
                        }}
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                      >
                        Manage Access
                      </button>

                      <button
                        onClick={() => {
                          setSelectedUserDetail(u)
                          setStudentModalTab('profile')
                        }}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 shadow-sm flex items-center gap-1 transition-all"
                      >
                        <Eye size={12} /> Inspect Dossier
                      </button>
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              placeholder="Filter table by name, email, phone or college..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'all', label: `All Students (${dbUsers.length})` },
              { id: 'paid', label: `Paid Students (${totalPaidLearners})` },
              { id: 'free', label: `Free Only (${totalFreeLearners})` },
              { id: 'none', label: `No Enrollments` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setUserFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  userFilter === f.id
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-white/5 text-brand-muted hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  {['Student & Avatar', 'Contact & College', 'Role', 'Membership & Access', 'Paid Items Taken', 'Total Granted', 'Joined Date', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {usersLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-brand-muted text-sm">
                      <Loader2 size={24} className="animate-spin mx-auto text-primary-500 mb-2" />
                      Loading students...
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      {/* Student & Avatar */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-primary-500/20 shadow-sm flex-shrink-0 bg-primary-500/10">
                            <img
                              src={getStudentAvatarUrl(u.name, u.avatar_url)}
                              alt={u.name}
                              onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=6366f1&color=fff&bold=true`
                              }}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-brand-text dark:text-brand-dark-text text-sm leading-snug truncate">{u.name}</p>
                            <p className="text-xs text-brand-muted dark:text-brand-dark-muted truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact & College */}
                      <td className="px-4 py-3 text-xs">
                        <div className="text-brand-text dark:text-brand-dark-text font-medium">{u.college}</div>
                        <div className="text-brand-muted dark:text-brand-dark-muted text-[11px] mt-0.5">{u.phone || 'No phone'}</div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <span
                          className={`badge text-xs ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-semibold'
                              : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Membership & Access */}
                      <td className="px-4 py-3">
                        <div className="space-y-1.5">
                          {u.is_premium ? (
                            <span className="badge text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold">
                              ⭐ ALL-ACCESS PREMIUM
                            </span>
                          ) : u.hasPaidCourses ? (
                            <span className="badge text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold">
                              PAID MEMBER
                            </span>
                          ) : (
                            <span className="badge text-[10px] bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400">Free Standard</span>
                          )}
                          <div>
                            <button
                              onClick={() => handleTogglePremium(u)}
                              className={`text-[10px] font-semibold underline transition-colors ${
                                u.is_premium ? 'text-red-500 hover:text-red-600' : 'text-primary-600 dark:text-primary-400 hover:text-primary-700'
                              }`}
                            >
                              {u.is_premium ? 'Revoke Premium' : '+ Grant All-Access'}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Paid Items Taken */}
                      <td className="px-4 py-3 text-xs">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {u.paidCoursesCount} items (₹{u.totalAmountPaid.toLocaleString()})
                        </span>
                      </td>

                      {/* Total Granted */}
                      <td className="px-4 py-3 text-xs font-semibold text-brand-text dark:text-brand-dark-text">
                        {u.totalCoursesCount} item{u.totalCoursesCount !== 1 ? 's' : ''}
                      </td>

                      {/* Joined Date */}
                      <td className="px-4 py-3 text-xs text-brand-muted dark:text-brand-dark-muted whitespace-nowrap">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedUserDetail(u)
                              setStudentModalTab('profile')
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 text-xs font-semibold transition-colors"
                          >
                            <Eye size={12} /> Inspect Dossier
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {!usersLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-brand-muted text-sm">
                      No students found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── 360° STUDENT DOSSIER & GRANULAR ACCESS MANAGEMENT MODAL ────────── */}
        <AnimatePresence>
          {selectedUserDetail && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUserDetail(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl bg-white dark:bg-brand-dark-card rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col border border-brand-border dark:border-brand-dark-border"
              >
                {/* Modal Header with Large Avatar Display */}
                <div className="p-5 sm:p-6 border-b border-brand-border dark:border-brand-dark-border bg-gray-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-4 ring-primary-500/30 shadow-xl bg-gradient-to-br from-primary-500 to-indigo-600">
                        <img
                          src={getStudentAvatarUrl(selectedUserDetail.name, selectedUserDetail.avatar_url)}
                          alt={selectedUserDetail.name}
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserDetail.name || 'User')}&background=6366f1&color=fff&bold=true`
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {selectedUserDetail.is_premium && (
                        <span className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-black rounded-full shadow-md" title="All-Access Premium Active">
                          <Sparkles size={13} />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text truncate">
                          {selectedUserDetail.name}
                        </h3>
                        {selectedUserDetail.is_premium ? (
                          <span className="badge text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold flex items-center gap-1 shadow-sm">
                            <Sparkles size={11} /> ALL-ACCESS PREMIUM ACTIVE
                          </span>
                        ) : (
                          <span className="badge text-[10px] bg-gray-100 dark:bg-white/10 text-brand-muted">
                            Standard Student
                          </span>
                        )}
                        <span className="badge text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          {selectedUserDetail.role}
                        </span>
                      </div>
                      <p className="text-xs text-brand-muted dark:text-brand-dark-muted truncate mt-0.5">
                        {selectedUserDetail.email} • ID: <span className="font-mono text-[11px]">{selectedUserDetail.id}</span>
                      </p>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleTogglePremium(selectedUserDetail)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                        selectedUserDetail.is_premium
                          ? 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500 hover:text-white'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500'
                      }`}
                    >
                      {selectedUserDetail.is_premium ? (
                        <>
                          <ShieldAlert size={14} /> Revoke All-Access Pass
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} /> ⭐ Grant All-Access Pass
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setSelectedUserDetail(null)}
                      className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 text-brand-muted transition-colors"
                      title="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Modal Navigation Tabs */}
                <div className="flex items-center gap-1 px-6 border-b border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card overflow-x-auto">
                  {[
                    { id: 'profile', label: '📋 Profile & Academics', count: null },
                    { id: 'courses', label: '🎓 Permissions & Access Control', count: selectedUserDetail.enrollments.length },
                    {
                      id: 'payments',
                      label: '💳 Payments & Proofs',
                      count: paymentRequests.filter(
                        (p) => p.userId === selectedUserDetail.id || p.email?.toLowerCase() === selectedUserDetail.email.toLowerCase()
                      ).length,
                    },
                    {
                      id: 'guidance',
                      label: '💬 Guidance & Mentorship',
                      count:
                        dbGuidanceRequests.filter(
                          (g) =>
                            (g.email && g.email.toLowerCase() === selectedUserDetail.email.toLowerCase()) ||
                            (g.fullName && g.fullName.toLowerCase() === selectedUserDetail.name.toLowerCase())
                        ).length +
                        dbSessions.filter(
                          (s) =>
                            s.studentEmail?.toLowerCase() === selectedUserDetail.email.toLowerCase() ||
                            s.studentName?.toLowerCase() === selectedUserDetail.name.toLowerCase()
                        ).length,
                    },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setStudentModalTab(t.id as any)}
                      className={`px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 ${
                        studentModalTab === t.id
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-brand-muted hover:text-brand-text dark:hover:text-brand-dark-text'
                      }`}
                    >
                      {t.label}
                      {t.count !== null && t.count > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold">
                          {t.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Modal Content Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* TAB 1: Profile & Academics */}
                  {studentModalTab === 'profile' && (
                    <div className="space-y-6">
                      {/* Avatar Management Card */}
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getStudentAvatarUrl(selectedUserDetail.name, selectedUserDetail.avatar_url)}
                            alt={selectedUserDetail.name}
                            onError={(e) => {
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserDetail.name || 'User')}&background=6366f1&color=fff&bold=true`
                            }}
                            className="w-12 h-12 rounded-xl object-cover ring-2 ring-primary-500/30 shadow-sm"
                          />
                          <div>
                            <p className="text-xs font-bold text-brand-text dark:text-brand-dark-text">Student Profile Avatar</p>
                            <p className="text-[11px] text-brand-muted truncate max-w-xs">
                              {selectedUserDetail.avatar_url ? selectedUserDetail.avatar_url : 'Generated dynamic initials avatar'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-1 max-w-md">
                          <input
                            type="text"
                            placeholder="Update avatar image URL (https://...)..."
                            value={editingAvatarUrl}
                            onChange={(e) => setEditingAvatarUrl(e.target.value)}
                            className="input text-xs py-1.5 flex-1"
                          />
                          <button
                            onClick={handleSaveAvatar}
                            disabled={!editingAvatarUrl.trim() || savingAvatar}
                            className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap disabled:opacity-40"
                          >
                            {savingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                          </button>
                        </div>
                      </div>

                      {/* Key Profile Details */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-3">
                          Personal & Academic Information
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border">
                            <span className="text-[11px] text-brand-muted block">College / University</span>
                            <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text block mt-0.5 truncate">
                              {selectedUserDetail.college || 'Not Specified'}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border">
                            <span className="text-[11px] text-brand-muted block">Branch / Field</span>
                            <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text block mt-0.5 truncate">
                              {selectedUserDetail.branch || 'Not Specified'}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border">
                            <span className="text-[11px] text-brand-muted block">Semester & Year</span>
                            <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text block mt-0.5">
                              {selectedUserDetail.current_semester
                                ? `Semester ${selectedUserDetail.current_semester}`
                                : 'Sem N/A'}{' '}
                              {selectedUserDetail.year_of_study ? `(${selectedUserDetail.year_of_study})` : ''}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border">
                            <span className="text-[11px] text-brand-muted block">Phone Number</span>
                            <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text block mt-0.5 truncate">
                              {selectedUserDetail.phone || 'No phone recorded'}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border">
                            <span className="text-[11px] text-brand-muted block">Age</span>
                            <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text block mt-0.5">
                              {selectedUserDetail.age ? `${selectedUserDetail.age} years old` : 'Not specified'}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border">
                            <span className="text-[11px] text-brand-muted block">Account Created</span>
                            <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text block mt-0.5">
                              {selectedUserDetail.created_at
                                ? new Date(selectedUserDetail.created_at).toLocaleDateString()
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border">
                            <span className="text-[11px] text-brand-muted block">Paid Spend</span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                              ₹{selectedUserDetail.totalAmountPaid.toLocaleString()}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border">
                            <span className="text-[11px] text-brand-muted block">Total Granted Items</span>
                            <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text block mt-0.5">
                              {selectedUserDetail.totalCoursesCount} ({selectedUserDetail.paidCoursesCount} Paid,{' '}
                              {selectedUserDetail.freeCoursesCount} Free)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      {selectedUserDetail.bio && (
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border">
                          <span className="text-[11px] text-brand-muted block mb-1 font-semibold">Student Bio</span>
                          <p className="text-xs text-brand-text dark:text-brand-dark-text italic leading-relaxed">
                            "{selectedUserDetail.bio}"
                          </p>
                        </div>
                      )}

                      {/* Semester SGPA Breakdown */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-3 flex items-center justify-between">
                          <span>Semester SGPA Academic Record</span>
                          {selectedUserDetail.semester_sgpa && Object.keys(selectedUserDetail.semester_sgpa).length > 0 && (
                            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                              Average CGPA:{' '}
                              {(
                                Object.values(selectedUserDetail.semester_sgpa).reduce((a, b) => a + Number(b), 0) /
                                Object.values(selectedUserDetail.semester_sgpa).length
                              ).toFixed(2)}
                            </span>
                          )}
                        </h4>

                        {selectedUserDetail.semester_sgpa && Object.keys(selectedUserDetail.semester_sgpa).length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(selectedUserDetail.semester_sgpa).map(([sem, score]) => (
                              <div
                                key={sem}
                                className="p-3 rounded-xl bg-white dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border flex items-center justify-between"
                              >
                                <span className="text-xs text-brand-muted font-medium">Semester {sem}</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  {Number(score).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-brand-muted bg-gray-50 dark:bg-white/5 rounded-xl border border-brand-border dark:border-brand-dark-border">
                            No semester SGPA record submitted by this student yet.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Granular Permissions & Access Control (GRANT & TAKE AWAY ACCESS TO ANY SPECIFIC THING) */}
                  {studentModalTab === 'courses' && (
                    <div className="space-y-6">
                      {/* ⚡ Grant Access to Any Specific Thing */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary-500/10 via-indigo-500/10 to-purple-500/10 border border-primary-500/30 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary-500 text-white">
                            <Plus size={15} />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-brand-text dark:text-brand-dark-text">
                              Grant Specific Access to {selectedUserDetail.name}
                            </h4>
                            <p className="text-[11px] text-brand-muted">
                              Select any specific course, study material/notes, or live webinar to grant immediate access
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          {/* Item Category */}
                          <div className="sm:col-span-3">
                            <label className="text-[11px] font-semibold text-brand-muted block mb-1">
                              1. Item Category
                            </label>
                            <select
                              value={grantItemCategory}
                              onChange={(e) => {
                                setGrantItemCategory(e.target.value as any)
                                setGrantItemId('')
                              }}
                              className="input text-xs w-full py-2 bg-white dark:bg-brand-dark-card font-semibold"
                            >
                              <option value="course">📚 Specific Course ({dbCourses.length})</option>
                              <option value="resource">📄 Study Material / Notes ({dbResources.length})</option>
                              <option value="webinar">📹 Live Webinar ({liveWebinars.length})</option>
                            </select>
                          </div>

                          {/* Specific Item Selector */}
                          <div className="sm:col-span-5">
                            <label className="text-[11px] font-semibold text-brand-muted block mb-1">
                              2. Select Specific Item
                            </label>
                            <select
                              value={grantItemId}
                              onChange={(e) => setGrantItemId(e.target.value)}
                              className="input text-xs w-full py-2 bg-white dark:bg-brand-dark-card"
                            >
                              <option value="">
                                -- Choose{' '}
                                {grantItemCategory === 'course'
                                  ? 'Course'
                                  : grantItemCategory === 'resource'
                                  ? 'Study Resource'
                                  : 'Webinar'}{' '}
                                --
                              </option>
                              {grantItemCategory === 'course' &&
                                dbCourses.map((c) => {
                                  const already = selectedUserDetail.enrollments.some((e) => e.courseId === c.id)
                                  return (
                                    <option key={c.id} value={c.id} disabled={already}>
                                      {already ? '✓ Active: ' : ''}
                                      {c.title} ({typeof c.price === 'number' ? `₹${c.price}` : 'FREE'})
                                    </option>
                                  )
                                })}
                              {grantItemCategory === 'resource' &&
                                dbResources.map((r) => {
                                  const idStr = String(r.id)
                                  const already = selectedUserDetail.enrollments.some((e) => e.courseId === idStr)
                                  return (
                                    <option key={idStr} value={idStr} disabled={already}>
                                      {already ? '✓ Active: ' : ''}
                                      {r.title} ({r.subject || r.type || 'Study Notes'} - {r.isPremium ? '⭐ Premium' : 'Free'})
                                    </option>
                                  )
                                })}
                              {grantItemCategory === 'webinar' &&
                                liveWebinars.map((w) => {
                                  const already = selectedUserDetail.enrollments.some((e) => e.courseId === w.id)
                                  return (
                                    <option key={w.id} value={w.id} disabled={already}>
                                      {already ? '✓ Active: ' : ''}
                                      {w.title} ({new Date(w.startsAt).toLocaleDateString()} - {w.access === 'paid' ? '⭐ Paid' : 'Free'})
                                    </option>
                                  )
                                })}
                            </select>
                          </div>

                          {/* Access Type */}
                          <div className="sm:col-span-4">
                            <label className="text-[11px] font-semibold text-brand-muted block mb-1">
                              3. Access Level
                            </label>
                            <select
                              value={grantAccessType}
                              onChange={(e) => setGrantAccessType(e.target.value as any)}
                              className="input text-xs w-full py-2 bg-white dark:bg-brand-dark-card font-semibold"
                            >
                              <option value="paid">⭐ Full Access (Admin Waived / Override)</option>
                              <option value="free">Standard Free Access</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={handleGrantSpecificAccess}
                            disabled={!grantItemId || isGrantingAccess}
                            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isGrantingAccess ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Plus size={13} />
                            )}
                            + Grant Access to Selected Item
                          </button>
                        </div>
                      </div>

                      {/* Master All-Access Membership Card */}
                      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-amber-500 text-black font-bold shadow-md">
                            <Sparkles size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-brand-text dark:text-brand-dark-text">
                              All-Access VIP Membership Pass (Site-wide Access)
                            </p>
                            <p className="text-[11px] text-brand-muted">
                              {selectedUserDetail.is_premium
                                ? 'Student has full unlocked VIP access to all present & upcoming content on the platform'
                                : 'Granting this gives the student unlocked access to all courses, resources, and webinars'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleTogglePremium(selectedUserDetail)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap ${
                            selectedUserDetail.is_premium
                              ? 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500 hover:text-white'
                              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 font-bold'
                          }`}
                        >
                          {selectedUserDetail.is_premium ? (
                            <>
                              <ShieldAlert size={12} /> Revoke Master Pass
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} /> ⭐ Grant Master Pass
                            </>
                          )}
                        </button>
                      </div>

                      {/* Currently Granted Permissions & Access (TAKE AWAY / REVOKE SPECIFIC ACCESS) */}
                      <div>
                        <h4 className="font-bold text-sm text-brand-text dark:text-brand-dark-text flex items-center justify-between mb-3">
                          <span>
                            Granted Permissions & Active Access ({selectedUserDetail.enrollments.length})
                          </span>
                          <span className="text-xs font-normal text-brand-muted">
                            Click Revoke Access on any item to remove permission
                          </span>
                        </h4>

                        {selectedUserDetail.enrollments.length === 0 ? (
                          <div className="py-12 text-center text-brand-muted text-xs bg-gray-50 dark:bg-white/5 rounded-2xl border border-brand-border dark:border-brand-dark-border">
                            No active permissions or enrollments recorded for this student. Use the tool above to grant access.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {selectedUserDetail.enrollments.map((enr) => {
                              const isPaid = enr.paymentStatus === 'paid' || enr.amount > 0
                              const isResource =
                                enr.courseTitle?.includes('[Study Notes]') ||
                                enr.courseId.startsWith('res-') ||
                                enr.courseId.startsWith('resource-')
                              const isWebinar =
                                enr.courseTitle?.includes('[Webinar]') ||
                                enr.courseId.startsWith('web-') ||
                                enr.courseId.startsWith('webinar-')
                              const isCourse = !isResource && !isWebinar

                              return (
                                <div
                                  key={enr.id}
                                  className="p-3.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card flex items-center justify-between gap-4 shadow-sm hover:border-primary-500/30 transition-all"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      {isCourse && (
                                        <span className="badge text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                                          📚 COURSE
                                        </span>
                                      )}
                                      {isResource && (
                                        <span className="badge text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                          📄 STUDY NOTES
                                        </span>
                                      )}
                                      {isWebinar && (
                                        <span className="badge text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                          📹 WEBINAR
                                        </span>
                                      )}
                                      <span
                                        className={`badge text-[10px] font-bold ${
                                          isPaid
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                        }`}
                                      >
                                        {isPaid ? `FULL ACCESS (₹${enr.amount})` : 'FREE ACCESS'}
                                      </span>
                                      <span className="text-[11px] text-brand-muted">
                                        Granted {new Date(enr.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="font-bold text-xs text-brand-text dark:text-brand-dark-text truncate">
                                      {enr.courseTitle || `Item #${enr.courseId}`}
                                    </p>
                                    <p className="text-[11px] text-brand-muted mt-0.5">
                                      Item ID: <span className="font-mono">{enr.courseId}</span> • Ref: <span className="font-mono">{enr.id}</span>
                                    </p>
                                  </div>

                                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                                    <span className="text-sm font-bold text-brand-text dark:text-brand-dark-text">
                                      {isPaid ? `₹${enr.amount}` : '₹0'}
                                    </span>
                                    <button
                                      onClick={() => handleRevokeSpecificAccess(enr.id, enr.courseTitle)}
                                      className="px-3 py-1 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white border border-red-500/20 text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm"
                                      title="Revoke and take away access to this specific item"
                                    >
                                      <ShieldAlert size={11} /> Revoke Access
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Payments & Transaction Proofs */}
                  {studentModalTab === 'payments' && (
                    <div className="space-y-4">
                      {(() => {
                        const studentPayments = paymentRequests.filter(
                          (p) =>
                            p.userId === selectedUserDetail.id ||
                            (p.email && p.email.toLowerCase() === selectedUserDetail.email.toLowerCase())
                        )

                        if (studentPayments.length === 0) {
                          return (
                            <div className="py-12 text-center text-brand-muted text-xs bg-gray-50 dark:bg-white/5 rounded-2xl border border-brand-border dark:border-brand-dark-border">
                              No payment requests or UTR transactions recorded for this student.
                            </div>
                          )
                        }

                        return (
                          <div className="space-y-3">
                            {studentPayments.map((p) => (
                              <div
                                key={p.id}
                                className="p-4 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                              >
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`badge text-[10px] font-bold ${
                                        p.status === 'paid'
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                          : p.status === 'pending'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                      }`}
                                    >
                                      {p.status.toUpperCase()}
                                    </span>
                                    <span className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">
                                      {p.itemTitle || 'Payment Item'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-brand-muted flex items-center gap-3 flex-wrap">
                                    <span>
                                      UTR:{' '}
                                      <span className="font-mono font-bold text-brand-text dark:text-brand-dark-text">
                                        {p.utrNumber || 'N/A'}
                                      </span>
                                    </span>
                                    <span>Date: {new Date(p.createdAt).toLocaleString()}</span>
                                    <span>
                                      Amount:{' '}
                                      <strong className="text-emerald-600 dark:text-emerald-400">₹{p.amount}</strong>
                                    </span>
                                  </div>
                                </div>

                                {p.screenshotUrl && (
                                  <button
                                    onClick={() => setInspectProofImage(p.screenshotUrl || null)}
                                    className="px-3 py-1.5 rounded-lg border border-brand-border dark:border-brand-dark-border text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-1.5 flex-shrink-0"
                                  >
                                    <Eye size={12} /> View Screenshot Proof
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* TAB 4: Guidance & Mentorship Requests */}
                  {studentModalTab === 'guidance' && (
                    <div className="space-y-4">
                      {(() => {
                        const studentGuidance = dbGuidanceRequests.filter(
                          (g) =>
                            (g.email && g.email.toLowerCase() === selectedUserDetail.email.toLowerCase()) ||
                            (g.fullName && g.fullName.toLowerCase() === selectedUserDetail.name.toLowerCase())
                        )
                        const studentSessions = dbSessions.filter(
                          (s) =>
                            (s.studentEmail && s.studentEmail.toLowerCase() === selectedUserDetail.email.toLowerCase()) ||
                            (s.studentName && s.studentName.toLowerCase() === selectedUserDetail.name.toLowerCase())
                        )

                        if (studentGuidance.length === 0 && studentSessions.length === 0) {
                          return (
                            <div className="py-12 text-center text-brand-muted text-xs bg-gray-50 dark:bg-white/5 rounded-2xl border border-brand-border dark:border-brand-dark-border">
                              No guidance requests or mentorship sessions booked by this student.
                            </div>
                          )
                        }

                        return (
                          <div className="space-y-4">
                            {studentGuidance.length > 0 && (
                              <div>
                                <h5 className="text-xs font-bold text-brand-muted uppercase mb-2">
                                  Guidance Inquiries ({studentGuidance.length})
                                </h5>
                                <div className="space-y-2">
                                  {studentGuidance.map((g) => (
                                    <div
                                      key={g.id}
                                      className="p-3.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card"
                                    >
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="font-bold text-xs text-brand-text dark:text-brand-dark-text">
                                          {g.guidanceTypes?.join(', ') || 'General Inquiry'}
                                        </span>
                                        <span className="badge text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                          {g.status}
                                        </span>
                                      </div>
                                      <p className="text-xs text-brand-muted">{g.additionalQuery || 'No description provided'}</p>
                                      <p className="text-[10px] text-brand-muted mt-2">
                                        Submitted on {new Date(g.createdAt).toLocaleString()}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {studentSessions.length > 0 && (
                              <div>
                                <h5 className="text-xs font-bold text-brand-muted uppercase mb-2">
                                  Mentorship Bookings ({studentSessions.length})
                                </h5>
                                <div className="space-y-2">
                                  {studentSessions.map((s) => (
                                    <div
                                      key={s.id}
                                      className="p-3.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card flex items-center justify-between gap-4"
                                    >
                                      <div>
                                        <p className="font-bold text-xs text-brand-text dark:text-brand-dark-text">
                                          Mentor Session ({s.serviceType})
                                        </p>
                                        <p className="text-[11px] text-brand-muted mt-0.5">
                                          Date: {s.date} at {s.time} • Status: {s.status}
                                        </p>
                                      </div>
                                      <span className="badge text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                        {s.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-brand-border dark:border-brand-dark-border flex items-center justify-between">
                  <div className="text-[11px] text-brand-muted font-mono flex items-center gap-1.5">
                    <span>UID:</span>
                    <span className="font-bold text-brand-text dark:text-brand-dark-text">{selectedUserDetail.id}</span>
                  </div>
                  <button
                    onClick={() => setSelectedUserDetail(null)}
                    className="px-4 py-2 bg-gray-200 dark:bg-white/10 text-brand-text dark:text-brand-dark-text text-xs font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                  >
                    Close Dossier
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ─── Payment Gateway & UPI Settings Form ────────────────────────────────────
  const renderPaymentGatewaySettingsForm = () => {
    const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!draftPaymentSettings.upiId.trim()) {
        toast.error('UPI ID cannot be empty')
        return
      }
      setPaymentSettingsLoading(true)
      try {
        const updated = await updatePaymentSettings(draftPaymentSettings)
        setPaymentSettings(updated)
        setDraftPaymentSettings(updated)
        toast.success('UPI ID & QR Code settings saved successfully! 🎉')
      } catch (err: any) {
        toast.error(err.message || 'Failed to save payment settings')
      } finally {
        setPaymentSettingsLoading(false)
      }
    }

    const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file (PNG, JPG, or WEBP)')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be under 5 MB')
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setDraftPaymentSettings((prev) => ({ ...prev, qrCodeUrl: reader.result as string }))
        toast.success('QR Code image loaded! Click "Save Payment Settings" below to apply.')
      }
      reader.readAsDataURL(file)
    }

    const previewUpiIntentUrl = `upi://pay?pa=${encodeURIComponent(draftPaymentSettings.upiId || 'skills021@upi')}&pn=${encodeURIComponent(draftPaymentSettings.upiName || 'Skills021')}&am=499&cu=INR`
    const previewQrUrl = draftPaymentSettings.qrCodeUrl && draftPaymentSettings.qrCodeUrl.trim() !== ''
      ? draftPaymentSettings.qrCodeUrl
      : `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(previewUpiIntentUrl)}&size=240x240&margin=10`

    return (
      <div className="card p-6 border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-brand-border dark:border-brand-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text">UPI & QR Code Configuration</h3>
              <p className="text-xs text-brand-muted dark:text-brand-dark-muted">
                Configure your official UPI ID and upload your merchant QR code shown to students at checkout
              </p>
            </div>
          </div>
          {draftPaymentSettings.updatedAt && (
            <span className="text-[11px] text-brand-muted">
              Last saved: {new Date(draftPaymentSettings.updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Form */}
          <form onSubmit={handleSaveSettings} className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-brand-text dark:text-brand-dark-text mb-1">
                  Official UPI ID *
                </label>
                <input
                  type="text"
                  value={draftPaymentSettings.upiId}
                  onChange={(e) => setDraftPaymentSettings((p) => ({ ...p, upiId: e.target.value }))}
                  placeholder="e.g. yourname@oksbi or skills021@upi"
                  className="input text-xs font-mono"
                  required
                />
                <p className="text-[11px] text-brand-muted mt-1">Students copy this ID to make UPI payments</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text dark:text-brand-dark-text mb-1">
                  Payee / Business Name *
                </label>
                <input
                  type="text"
                  value={draftPaymentSettings.upiName}
                  onChange={(e) => setDraftPaymentSettings((p) => ({ ...p, upiName: e.target.value }))}
                  placeholder="e.g. Skills021 Learning"
                  className="input text-xs"
                  required
                />
                <p className="text-[11px] text-brand-muted mt-1">Displayed in student UPI app & receipt</p>
              </div>
            </div>

            {/* All-Access Pass Price */}
            <div>
              <label className="block text-xs font-bold text-brand-text dark:text-brand-dark-text mb-1">
                ⭐ All-Access Pass Membership Price (₹) *
              </label>
              <input
                type="number"
                min="1"
                value={draftPaymentSettings.allAccessPrice ?? 999}
                onChange={(e) => setDraftPaymentSettings((p) => ({ ...p, allAccessPrice: Math.max(1, parseInt(e.target.value) || 999) }))}
                placeholder="999"
                className="input text-xs font-semibold"
                required
              />
              <p className="text-[11px] text-brand-muted mt-1">
                Controls the price displayed on the &quot;Upgrade to All-Access&quot; button on student dashboards and course checkout modals
              </p>
            </div>

            {/* Custom QR Code Upload */}
            <div>
              <label className="block text-xs font-bold text-brand-text dark:text-brand-dark-text mb-1">
                Upload UPI QR Code Image (PhonePe / GPay / Paytm / Bank QR)
              </label>
              <div className="border-2 border-dashed border-brand-border dark:border-brand-dark-border rounded-xl p-4 text-center bg-gray-50 dark:bg-white/5 hover:bg-gray-100/70 dark:hover:bg-white/10 transition-colors relative group">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleQrUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <UploadCloud size={24} className="text-primary-500" />
                  <p className="text-xs font-bold text-brand-text dark:text-brand-dark-text">
                    {draftPaymentSettings.qrCodeUrl ? 'Click or Drag to Replace QR Code Image' : 'Click or Drag to Upload QR Code Image'}
                  </p>
                  <p className="text-[11px] text-brand-muted">Supports PNG, JPG, WEBP (Max 5MB)</p>
                </div>
              </div>
              {draftPaymentSettings.qrCodeUrl && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-brand-border dark:border-brand-dark-border">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle size={13} /> Custom QR Code image active
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftPaymentSettings((p) => ({ ...p, qrCodeUrl: '' }))
                      toast.success('Reset to dynamic QR generator. Click "Save Payment Settings" to apply.')
                    }}
                    className="text-xs font-semibold text-red-500 hover:underline"
                  >
                    Remove Custom Image (Use Dynamic QR)
                  </button>
                </div>
              )}
            </div>

            {/* Verification Instructions */}
            <div>
              <label className="block text-xs font-bold text-brand-text dark:text-brand-dark-text mb-1">
                Checkout Instructions for Students
              </label>
              <textarea
                value={draftPaymentSettings.instructions || ''}
                onChange={(e) => setDraftPaymentSettings((p) => ({ ...p, instructions: e.target.value }))}
                rows={2}
                placeholder="Scan QR or pay directly to the UPI ID..."
                className="input text-xs resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={paymentSettingsLoading}
                className="px-5 py-2.5 rounded-xl bg-[#0A0A0A] dark:bg-white text-white dark:text-black font-bold text-xs hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm flex items-center gap-2"
              >
                {paymentSettingsLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Payment Settings
              </button>
            </div>
          </form>

          {/* Live Student Checkout Preview */}
          <div className="lg:col-span-5 bg-gray-50 dark:bg-white/5 rounded-2xl p-5 border border-brand-border dark:border-brand-dark-border flex flex-col items-center justify-center text-center">
            <p className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Live Student Checkout Preview</p>
            <div className="p-3 bg-white rounded-xl shadow-sm border border-brand-border max-w-[200px] max-h-[200px] flex items-center justify-center overflow-hidden mb-3">
              <img
                src={previewQrUrl}
                alt="UPI QR Code Preview"
                className="w-40 h-40 object-contain rounded-lg"
              />
            </div>
            <div className="w-full max-w-xs space-y-1">
              <p className="text-xs font-mono font-bold text-brand-text dark:text-brand-dark-text bg-white dark:bg-brand-dark-card px-3 py-1.5 rounded-lg border border-brand-border dark:border-brand-dark-border truncate">
                {draftPaymentSettings.upiId || 'skills021@upi'}
              </p>
              <p className="text-[11px] text-brand-muted">
                Payee: <span className="font-semibold text-brand-text dark:text-brand-dark-text">{draftPaymentSettings.upiName || 'Skills021'}</span>
              </p>
              {draftPaymentSettings.qrCodeUrl ? (
                <span className="badge text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">
                  Custom Uploaded QR Active
                </span>
              ) : (
                <span className="badge text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold">
                  Dynamic UPI QR Active
                </span>
              )}
              <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 font-bold mt-2">
                <span>⭐ All-Access Pass:</span>
                <span>₹{(draftPaymentSettings.allAccessPrice ?? 999).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Payment Approvals & Verification ──────────────────────────────────────
  const renderPaymentApprovals = () => {
    const searchLower = search.toLowerCase()
    const filtered = paymentRequests.filter((p) => {
      const matchText =
        (p.firstName || '').toLowerCase().includes(searchLower) ||
        (p.lastName || '').toLowerCase().includes(searchLower) ||
        (p.email || '').toLowerCase().includes(searchLower) ||
        (p.phone || '').toLowerCase().includes(searchLower) ||
        (p.utrNumber || '').toLowerCase().includes(searchLower) ||
        (p.itemTitle || '').toLowerCase().includes(searchLower) ||
        (p.courseId || '').toLowerCase().includes(searchLower)
      if (!matchText) return false

      if (paymentFilter === 'pending') return p.status === 'pending'
      if (paymentFilter === 'paid') return p.status === 'paid'
      if (paymentFilter === 'rejected') return p.status === 'rejected'
      return true
    })

    const pendingCount = paymentRequests.filter((p) => p.status === 'pending').length
    const approvedCount = paymentRequests.filter((p) => p.status === 'paid').length
    const rejectedCount = paymentRequests.filter((p) => p.status === 'rejected').length
    const totalVerifiedRevenue = paymentRequests
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    const handleApprove = async (req: Enrollment) => {
      try {
        await approvePaymentRequest(req.id)
        toast.success(`Payment approved! Access granted to ${req.firstName || req.email} 🎉`)
        setPaymentRequests((prev) =>
          prev.map((item) => (item.id === req.id ? { ...item, status: 'paid', rejectionReason: '' } : item))
        )
        loadDbUsers()
      } catch (err: any) {
        toast.error(err.message || 'Failed to approve payment')
      }
    }

    const handleRevoke = async (req: Enrollment) => {
      try {
        await revokeAccess(req.id, 'Access revoked by Skills021')
        toast.success(`Access revoked for ${req.firstName || req.email}! 🔒`)
        setPaymentRequests((prev) =>
          prev.map((item) =>
            item.id === req.id
              ? { ...item, status: 'rejected', rejectionReason: 'Access revoked by Skills021' }
              : item
          )
        )
        loadDbUsers()
      } catch (err: any) {
        toast.error(err.message || 'Failed to revoke access')
      }
    }

    const handleConfirmReject = async () => {
      if (!rejectModalId) return
      try {
        await rejectPaymentRequest(rejectModalId, rejectReason.trim() || 'Payment details could not be verified')
        toast.success('Payment request marked as rejected')
        setPaymentRequests((prev) =>
          prev.map((item) =>
            item.id === rejectModalId
              ? { ...item, status: 'rejected', rejectionReason: rejectReason.trim() || 'Rejected by Skills021' }
              : item
          )
        )
        setRejectModalId(null)
        setRejectReason('')
      } catch (err: any) {
        toast.error(err.message || 'Failed to reject payment')
      }
    }

    const copyToClipboard = (text: string, label: string) => {
      navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`))
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2.5">
              <span>Payment Approvals & Verification</span>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold text-xs">
                  {pendingCount} Pending
                </span>
              )}
            </h2>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
              Review UPI receipts, verify 12-digit UTR numbers, and manage student course access
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQrSettingsPanel((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${showQrSettingsPanel
                ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                : 'border-brand-border dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
            >
              <QrCode size={14} /> {showQrSettingsPanel ? 'Hide UPI & QR Settings' : 'Configure UPI & QR Code'}
            </button>

            <button
              onClick={loadPaymentRequests}
              disabled={paymentsLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-brand-border dark:border-brand-dark-border text-xs font-semibold text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <RefreshCw size={13} className={paymentsLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Collapsible UPI & QR Code Settings Panel */}
        <AnimatePresence>
          {showQrSettingsPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {renderPaymentGatewaySettingsForm()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metrics Overview — Clean & Professional */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5 border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider">Pending Review</p>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            </div>
            <p className="text-3xl font-extrabold text-brand-text dark:text-brand-dark-text mt-2">{pendingCount}</p>
          </div>
          <div className="card p-5 border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider">Approved Payments</p>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            </div>
            <p className="text-3xl font-extrabold text-brand-text dark:text-brand-dark-text mt-2">{approvedCount}</p>
          </div>
          <div className="card p-5 border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider">Rejected Proofs</p>
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
            </div>
            <p className="text-3xl font-extrabold text-brand-text dark:text-brand-dark-text mt-2">{rejectedCount}</p>
          </div>
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              placeholder="Search by student, email, UTR #, or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'pending', label: `Pending Review (${pendingCount})` },
              { id: 'paid', label: `Approved (${approvedCount})` },
              { id: 'rejected', label: `Rejected (${rejectedCount})` },
              { id: 'all', label: `All Requests (${paymentRequests.length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setPaymentFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${paymentFilter === f.id
                  ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black shadow-xs'
                  : 'bg-gray-100 dark:bg-white/5 text-brand-muted hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  {['Student Info', 'Item Requested', 'Amount', 'UTR / Ref Number', 'Screenshot Proof', 'Date Submitted', 'Status', 'Admin Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {paymentsLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-brand-muted text-sm">
                      <Loader2 size={24} className="animate-spin mx-auto text-primary-500 mb-2" />
                      Loading payment requests...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-brand-muted text-sm">
                      No payment requests found for this filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors">
                      {/* Student Info */}
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-brand-text dark:text-brand-dark-text text-sm">
                          {req.firstName} {req.lastName}
                        </p>
                        <p className="text-xs text-brand-muted dark:text-brand-dark-muted">{req.email}</p>
                        {req.phone && (
                          <p className="text-[11px] text-brand-muted font-mono">{req.phone}</p>
                        )}
                      </td>

                      {/* Item Requested */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider ${req.itemType === 'subject_bundle'
                              ? 'bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40'
                              : req.itemType === 'resource_bundle'
                              ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40'
                              : req.itemType === 'premium_membership'
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40'
                              : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                              }`}
                          >
                            {req.itemType === 'subject_bundle' ? '📦 SUBJECT BUNDLE' : req.itemType === 'resource_bundle' ? '📄 RESOURCE BUNDLE' : req.itemType === 'premium_membership' ? '⭐ PREMIUM PASS' : 'COURSE PURCHASE'}
                          </span>
                          <p className="text-xs font-semibold text-brand-text dark:text-brand-dark-text line-clamp-1">
                            {req.itemTitle || `Course #${req.courseId}`}
                          </p>
                          {req.notes && (
                            <p className="text-[10px] text-brand-muted font-mono">{req.notes}</p>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 font-bold text-brand-text dark:text-brand-dark-text">
                        ₹{req.amount}
                      </td>

                      {/* UTR Number */}
                      <td className="px-4 py-3.5">
                        {req.utrNumber ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-white/10 rounded-md select-all text-brand-text dark:text-brand-dark-text">
                              {req.utrNumber}
                            </span>
                            <button
                              onClick={() => copyToClipboard(req.utrNumber!, 'UTR Number')}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-brand-muted"
                              title="Copy UTR"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-brand-muted italic">—</span>
                        )}
                      </td>

                      {/* Screenshot Proof */}
                      <td className="px-4 py-3.5">
                        {req.screenshotUrl ? (
                          <button
                            onClick={() => setInspectProofImage(req.screenshotUrl!)}
                            className="group relative w-11 h-11 rounded-lg overflow-hidden border border-brand-border dark:border-brand-dark-border hover:ring-2 hover:ring-primary-500 transition-all flex items-center justify-center bg-gray-100 dark:bg-white/5"
                          >
                            <img src={req.screenshotUrl} alt="Receipt proof" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Eye size={14} />
                            </div>
                          </button>
                        ) : (
                          <span className="text-xs text-brand-muted italic">—</span>
                        )}
                      </td>

                      {/* Date Submitted */}
                      <td className="px-4 py-3.5 text-xs text-brand-muted whitespace-nowrap">
                        {req.createdAt ? new Date(req.createdAt).toLocaleString() : '—'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {req.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                            <CheckCircle size={12} /> Approved
                          </span>
                        ) : req.status === 'rejected' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                              Rejected
                            </span>
                            {req.rejectionReason && (
                              <p className="text-[10px] text-brand-muted max-w-[120px] truncate" title={req.rejectionReason}>
                                {req.rejectionReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                            Pending Review
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {req.status !== 'paid' && (
                            <button
                              onClick={() => handleApprove(req)}
                              className="px-3 py-1.5 rounded-lg bg-[#0A0A0A] dark:bg-white text-white dark:text-black text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-xs"
                            >
                              Approve Access
                            </button>
                          )}
                          {req.status === 'paid' && (
                            <button
                              onClick={() => handleRevoke(req)}
                              className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors flex items-center gap-1"
                              title="Revoke access immediately"
                            >
                              <ShieldAlert size={12} /> Revoke
                            </button>
                          )}
                          {req.status === 'pending' && (
                            <button
                              onClick={() => {
                                setRejectModalId(req.id)
                                setRejectReason('')
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-semibold transition-colors"
                            >
                              Reject
                            </button>
                          )}
                          {req.screenshotUrl && (
                            <button
                              onClick={() => setInspectProofImage(req.screenshotUrl!)}
                              className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-brand-muted transition-colors"
                              title="View Proof Image"
                            >
                              <Eye size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Screenshot Zoom Modal */}
        <AnimatePresence>
          {inspectProofImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectProofImage(null)}
              className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-xl w-full bg-white dark:bg-brand-dark-card rounded-2xl overflow-hidden shadow-2xl p-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-brand-border dark:border-brand-dark-border mb-3">
                  <h4 className="font-bold text-sm text-brand-text dark:text-brand-dark-text">Payment Proof Screenshot</h4>
                  <button onClick={() => setInspectProofImage(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
                    <X size={18} />
                  </button>
                </div>
                <div className="max-h-[75vh] overflow-y-auto flex items-center justify-center bg-gray-50 dark:bg-black/50 rounded-xl p-2">
                  <img src={inspectProofImage} alt="Full screenshot proof" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm" />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reject Reason Modal */}
        <AnimatePresence>
          {rejectModalId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectModalId(null)}
              className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-md w-full bg-white dark:bg-brand-dark-card rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4"
              >
                <h4 className="font-bold text-lg text-brand-text dark:text-brand-dark-text">Reject Payment Proof</h4>
                <p className="text-xs text-brand-muted dark:text-brand-dark-muted">
                  Please state why this payment could not be verified (e.g. Invalid UTR, Amount Mismatch, Duplicate submission).
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. UTR number not found in bank statement"
                  rows={3}
                  className="input text-xs resize-none"
                />
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setRejectModalId(null)}
                    className="px-4 py-2 border border-brand-border dark:border-brand-dark-border text-xs font-semibold rounded-xl text-brand-muted hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmReject}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ─── Settings ────────────────────────────────────────────────────────────────
  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Platform & Payment Settings</h2>
        <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
          Manage your UPI payment gateway details, QR code uploads, and platform overview
        </p>
      </div>

      {/* Payment Gateway Configuration */}
      {renderPaymentGatewaySettingsForm()}

      {/* Platform Overview */}
      <div className="card p-6 border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-brand-border dark:border-brand-dark-border">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <Shield size={24} className="text-primary-500" />
          </div>
          <div>
            <h3 className="font-bold text-brand-text dark:text-brand-dark-text">Platform Overview</h3>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted">Summary of all live modules on Skills021</p>
          </div>
        </div>
        {[
          { label: 'Platform Name', val: 'Skill021' },
          { label: 'YouTube Channel', val: 'youtube.com/@skills021' },
          { label: 'Total Courses', val: dbCourses.length.toString() },
          { label: 'Total Resources', val: dbResources.length.toString() },
          { label: 'Active Mentors', val: dbMentors.filter(m => m.status === 'Active').length.toString() },
          { label: 'Total Active Users', val: users.filter((u: any) => !u.disabled).length.toString() },
          { label: 'Total Mentor Sessions', val: dbSessions.length.toString() },
          { label: 'Guidance Requests', val: dbGuidanceRequests.length.toString() },
          { label: 'New Requests', val: dbGuidanceRequests.filter(r => r.status === 'New').length.toString() },
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

  // ─── Hackathons Panel ──────────────────────────────────────────────────────
  const renderHackathons = () => {
    const filtered = adminHackathons.filter(h => h.title.toLowerCase().includes(search.toLowerCase()))

    return (
      <div className="space-y-6">
        <SectionHeader title="Manage Hackathons" count={adminHackathons.length} onAdd={openAddHackathonModal} addLabel="Add Hackathon" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search hackathons..." />

        {adminHackathonsLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-brand-muted dark:text-brand-dark-muted mb-3" />
            <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Loading hackathons...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Table of Hackathons */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      {['Hackathon Title', 'Status', 'Reg Status', 'Teams', 'Days / Rounds', 'Progression', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                    {filtered.map(h => {
                      const draft = getProgressionValues(h)
                      const isModified =
                        draft.currentDay !== h.currentDay ||
                        draft.numberOfDays !== h.numberOfDays ||
                        draft.currentRound !== h.currentRound ||
                        draft.numberOfRounds !== h.numberOfRounds

                      return (
                        <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-4 py-3 font-bold text-brand-text dark:text-brand-dark-text max-w-[200px] truncate">
                            {h.title}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={h.status}
                              onChange={e => handleUpdateStatus(h, e.target.value as any)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${h.status === 'ongoing' ? 'bg-emerald-500 text-white border-emerald-600' :
                                h.status === 'upcoming' ? 'bg-blue-500 text-white border-blue-600' :
                                  'bg-gray-500 text-white border-gray-600'
                                }`}
                              title="Set hackathon status (ONGOING is Active)"
                            >
                              <option value="upcoming" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">UPCOMING</option>
                              <option value="ongoing" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">ONGOING (ACTIVE)</option>
                              <option value="completed" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">COMPLETED</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleRegistration(h)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${h.isRegistrationOpen ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                }`}
                            >
                              {h.isRegistrationOpen ? 'OPEN' : 'CLOSED'}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-semibold text-brand-text dark:text-brand-dark-text">
                            {h.currentTeams}/{h.maxTeams}
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-brand-muted dark:text-brand-dark-muted">
                            Day {draft.currentDay}/{draft.numberOfDays} • Round {draft.currentRound}/{draft.numberOfRounds}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1.5 min-w-[190px]">
                              {/* Day Control */}
                              <div className="flex items-center justify-between gap-1.5 bg-gray-100 dark:bg-white/5 p-1.5 rounded-xl border border-gray-200 dark:border-white/10">
                                <span className="text-[11px] font-bold text-brand-muted pl-1">Day</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleStepDay(h, -1)}
                                    disabled={draft.currentDay <= 1}
                                    className="w-5 h-5 flex items-center justify-center rounded-md bg-white dark:bg-white/10 text-brand-text dark:text-brand-dark-text font-bold hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-30 text-xs transition-colors"
                                    title="Decrease Day"
                                  >
                                    <Minus size={11} />
                                  </button>
                                  <span className="text-xs font-mono font-bold w-9 text-center text-primary-600 dark:text-primary-400">
                                    {draft.currentDay}/{draft.numberOfDays}
                                  </span>
                                  <button
                                    onClick={() => handleStepDay(h, 1)}
                                    className="w-5 h-5 flex items-center justify-center rounded-md bg-white dark:bg-white/10 text-brand-text dark:text-brand-dark-text font-bold hover:bg-gray-200 dark:hover:bg-white/20 text-xs transition-colors"
                                    title="Increase Day"
                                  >
                                    <Plus size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* Round Control */}
                              <div className="flex items-center justify-between gap-1.5 bg-gray-100 dark:bg-white/5 p-1.5 rounded-xl border border-gray-200 dark:border-white/10">
                                <span className="text-[11px] font-bold text-brand-muted pl-1">Round</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleStepRound(h, -1)}
                                    disabled={draft.currentRound <= 1}
                                    className="w-5 h-5 flex items-center justify-center rounded-md bg-white dark:bg-white/10 text-brand-text dark:text-brand-dark-text font-bold hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-30 text-xs transition-colors"
                                    title="Decrease Round"
                                  >
                                    <Minus size={11} />
                                  </button>
                                  <span className="text-xs font-mono font-bold w-9 text-center text-emerald-600 dark:text-emerald-400">
                                    {draft.currentRound}/{draft.numberOfRounds}
                                  </span>
                                  <button
                                    onClick={() => handleStepRound(h, 1)}
                                    className="w-5 h-5 flex items-center justify-center rounded-md bg-white dark:bg-white/10 text-brand-text dark:text-brand-dark-text font-bold hover:bg-gray-200 dark:hover:bg-white/20 text-xs transition-colors"
                                    title="Increase Round"
                                  >
                                    <Plus size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* Save Button */}
                              {isModified && (
                                <button
                                  onClick={() => handleSaveProgression(h)}
                                  disabled={savingProgressionId === h.id}
                                  className="w-full py-1 px-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all animate-pulse"
                                >
                                  {savingProgressionId === h.id ? (
                                    <>
                                      <Loader2 size={12} className="animate-spin" /> Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Save size={12} /> Save Progression
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleSelectHackathonForTeams(h)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${h.status === 'ongoing'
                                  ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-xs'
                                  : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/20'
                                  }`}
                                title={h.status === 'ongoing' ? 'Manage Teams' : 'Hackathon must be ONGOING to manage teams'}
                              >
                                Manage Teams {h.status !== 'ongoing' && '(Locked)'}
                              </button>
                              <button onClick={() => openEditHackathonModal(h)} className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-500">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => openDeleteModal(h)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete Hackathon">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-brand-muted text-sm">No hackathons found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Managed Hackathon Teams & Attendance Panel */}
            {selectedAdminHackathon && (() => {
              const isHackathonActive = selectedAdminHackathon.status === 'ongoing'
              return (
                <div className="card p-6 space-y-4 border-2 border-primary-500/30">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brand-border dark:border-brand-dark-border pb-4">
                    <div>
                      <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">SELECTED HACKATHON</span>
                      <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2">
                        {selectedAdminHackathon.title}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${isHackathonActive ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}>
                          {selectedAdminHackathon.status}
                        </span>
                      </h3>
                      <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-0.5">
                        Day {selectedAdminHackathon.currentDay} of {selectedAdminHackathon.numberOfDays} • Active Round: Round {selectedAdminHackathon.currentRound}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={exportTeamsCSV} className="px-3.5 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 flex items-center gap-1.5">
                        <Download size={14} /> Export CSV
                      </button>
                    </div>
                  </div>

                  {!isHackathonActive && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <Shield size={16} className="shrink-0 text-amber-500" />
                      <span>
                        Team management is <strong>LOCKED</strong> because hackathon status is currently <strong>{selectedAdminHackathon.status.toUpperCase()}</strong>. Change status to <strong>ONGOING (ACTIVE)</strong> in the table above to edit attendance or qualifications.
                      </span>
                    </div>
                  )}

                  {adminTeamsLoading ? (
                    <div className="py-8 text-center text-xs text-brand-muted">Loading teams...</div>
                  ) : adminTeams.length === 0 ? (
                    <div className="py-8 text-center text-sm text-brand-muted">No teams registered for this hackathon yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      {(() => {
                        const isLastRound = selectedAdminHackathon.currentRound === selectedAdminHackathon.numberOfRounds
                        return (
                          <table className="w-full text-xs sm:text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-white/5 uppercase text-[10px] font-bold text-brand-muted">
                              <tr>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Team Name</th>
                                <th className="px-4 py-3">Leader</th>
                                <th className="px-4 py-3">Member Attendance (Day {selectedAdminHackathon.currentDay})</th>
                                <th className="px-4 py-3">Round {selectedAdminHackathon.currentRound} Qualification</th>
                                {isLastRound && <th className="px-4 py-3">Podium Place</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                              {adminTeams.map(team => {
                                const isEligible = isTeamQualifiedForRound(team, selectedAdminHackathon.currentRound)
                                const isQualified = team.qualifications[String(selectedAdminHackathon.currentRound)] === true
                                return (
                                  <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                    <td className="px-4 py-3 font-mono font-bold text-primary-500">{team.teamCode}</td>
                                    <td className="px-4 py-3 font-bold text-brand-text dark:text-brand-dark-text">{team.teamName}</td>
                                    <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted">{team.leaderName} ({team.leaderEmail})</td>

                                    {/* Member-wise Attendance Checklist */}
                                    <td className="px-4 py-3">
                                      <div className="flex flex-wrap gap-1.5">
                                        {team.members.map((m, mIdx) => (
                                          <button
                                            key={mIdx}
                                            disabled={!isHackathonActive}
                                            onClick={() => handleToggleMemberAttendance(team, mIdx)}
                                            className={`px-2 py-1 rounded text-[11px] font-medium border ${m.present
                                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold'
                                              : 'bg-gray-100 dark:bg-white/5 text-gray-400 border-transparent'
                                              } ${!isHackathonActive ? 'opacity-60 cursor-not-allowed' : ''}`}
                                          >
                                            {m.name.split(' ')[0]} {m.present ? '✓' : '✗'}
                                          </button>
                                        ))}
                                      </div>
                                    </td>

                                    {/* Round Qualification Toggle */}
                                    <td className="px-4 py-3">
                                      {!isEligible ? (
                                        <span
                                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20 inline-flex items-center gap-1"
                                          title="Team was eliminated in a previous round"
                                        >
                                          ELIMINATED PREV ROUND
                                        </span>
                                      ) : (
                                        <button
                                          disabled={!isHackathonActive}
                                          onClick={() => handleToggleQualification(team.id, selectedAdminHackathon.currentRound, isQualified)}
                                          className={`px-3 py-1 rounded-lg text-xs font-bold ${isQualified ? 'bg-emerald-500 text-white' : 'bg-red-500/20 text-red-500 border border-red-500/30'
                                            } ${!isHackathonActive ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        >
                                          {isQualified ? 'QUALIFIED' : 'NOT QUALIFIED'}
                                        </button>
                                      )}
                                    </td>

                                    {/* Podium Selection - Only visible in final round for qualified final round teams */}
                                    {isLastRound && (
                                      <td className="px-4 py-3">
                                        {isEligible && isQualified ? (
                                          <select
                                            disabled={!isHackathonActive}
                                            value={team.position ?? ''}
                                            onChange={e => {
                                              const val = e.target.value ? Number(e.target.value) as 1 | 2 | 3 : null
                                              handleSetPodiumPosition(team.id, val)
                                            }}
                                            className={`px-2 py-1 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-xs font-semibold ${!isHackathonActive ? 'opacity-60 cursor-not-allowed' : ''
                                              }`}
                                          >
                                            <option value="">None</option>
                                            <option value="1">🥇 1st Place</option>
                                            <option value="2">🥈 2nd Place</option>
                                            <option value="3">🥉 3rd Place</option>
                                          </select>
                                        ) : (
                                          <span className="text-xs text-brand-muted/60 dark:text-brand-dark-muted/60 italic">
                                            N/A (Not Qualified)
                                          </span>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })()}
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
    } else if (type === 'course') {
      try {
        await deleteSiteCourse(id)
        setDbCourses(prev => prev.filter(c => c.id !== id))
        toast.success(`${title} deleted successfully`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete course')
      }
    } else if (type === 'careerApplication') {
      try {
        await deleteCareerApplication(id)
        setCareerApplications(prev => prev.filter(a => a.id !== id))
        toast.success(`${title} deleted successfully`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete application')
      }
    } else if (type === 'mentor') {
      try {
        await deleteMentorApi(id)
        setDbMentors(prev => prev.filter(m => m.id !== id))
        toast.success(`${title} deleted successfully`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete mentor')
      }
    } else if (type === 'guidanceRequest') {
      try {
        await deleteGuidanceRequestApi(id)
        setDbGuidanceRequests(prev => prev.filter(r => r.id !== id))
        toast.success(`${title} deleted successfully`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete guidance request')
      }
    } else if (type === 'session') {
      try {
        await deleteSessionApi(id)
        setDbSessions(prev => prev.filter(s => s.id !== id))
        toast.success(`${title} deleted successfully`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete session')
      }
    } else {
      switch (type) {
        case 'quiz': content.deleteQuiz(id); break
        case 'roadmap': content.deleteRoadmap(id); break
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

            // Perform storage upload with real progress tracking
            setResUploadStatus('uploading')
            setResUploadProgress(0)
            fileUrl = await uploadResourceFile(resUploadFile, storagePath, (p) => setResUploadProgress(p))
            setResUploadProgress(100)
            setResUploadStatus('success')

            // Cleanup old file on update
            if (isEditing && resExistingFileUrl) {
              await deleteResourceFile(resExistingFileUrl).catch(err => console.error('Failed to remove old resource file:', err))
            }
          }

          const isUnderBundle = resUploadMode === 'bundle'
          if (isUnderBundle && !selectedSubjectId && !editItem?.subjectId) {
            toast.error('Please select a Subject in the Hierarchy to place this resource under its Bundle.')
            setResourceSaving(false)
            return
          }

          if (isEditing) {
            // Update existing resource
            const updatePayload: any = {
              title: resTitle,
              description: resDescription,
              author: resAuthor,
              fileUrl: fileUrl,
              isPremium: isUnderBundle ? true : resIsPremium,
              price: isUnderBundle ? null : (resIsPremium ? resPrice : null),
              status: resStatus,
              isBundleOnly: isUnderBundle,
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
              isPremium: isUnderBundle ? true : resIsPremium,
              price: isUnderBundle ? undefined : (resIsPremium ? resPrice : undefined),
              status: resStatus,
              isBundleOnly: isUnderBundle,
            }
            const created = await createResourceApi(input)
            setDbResources(prev => [created, ...prev])
            toast.success('Resource added!')
          }
          closeModal()
        } catch (err) {
          setResUploadStatus('error')
          setResUploadProgress(0)
          toast.error(err instanceof Error ? err.message : 'Failed to save resource')
        } finally {
          setResourceSaving(false)
        }
      }

      return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-brand-dark-card rounded-3xl p-6 max-w-lg w-full shadow-2xl my-4 max-h-[90vh] overflow-y-auto border border-violet-200/70 dark:border-violet-900/50 relative overflow-x-hidden">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{isEditing ? 'Edit Resource' : 'Add Resource'}</h3>
              <button onClick={closeModal}><X size={18} className="text-brand-muted" /></button>
            </div>
            <div className="space-y-4">
              {/* Content Type Selector: Subject Bundle vs Individual */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-text dark:text-brand-dark-text">
                  Content Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setResUploadMode('bundle')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      resUploadMode === 'bundle'
                        ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/30 ring-2 ring-primary-500/20 shadow-xs'
                        : 'border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${resUploadMode === 'bundle' ? 'border-primary-500 bg-primary-500' : 'border-gray-400'}`}>
                        {resUploadMode === 'bundle' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <Package size={16} className="text-primary-500 shrink-0" />
                      <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text">Subject Bundle</span>
                    </div>
                    <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted leading-relaxed pl-5">
                      Curriculum under Subject Bundle. Access & pricing are managed by the Subject Bundle.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResUploadMode('individual')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      resUploadMode === 'individual'
                        ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/30 ring-2 ring-violet-500/20 shadow-xs'
                        : 'border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${resUploadMode === 'individual' ? 'border-violet-500 bg-violet-500' : 'border-gray-400'}`}>
                        {resUploadMode === 'individual' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <FileText size={16} className="text-violet-500 shrink-0" />
                      <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text">Individual</span>
                    </div>
                    <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted leading-relaxed pl-5">
                      Associated with Subject only. Maintains individual Free / Paid pricing.
                    </p>
                  </button>
                </div>
              </div>

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

                  {/* Show already-created Subject Bundle for this subject */}
                  {resUploadMode === 'bundle' && selectedSubjectId && (
                    <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800/40">
                      {loadingResourceBundle ? (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                          <Loader2 size={13} className="animate-spin text-amber-500" />
                          <span>Checking for existing Subject Bundle...</span>
                        </div>
                      ) : resourceSubjectBundle ? (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                              <Package size={14} className="text-amber-500 shrink-0" />
                              Existing Subject Bundle: {resourceSubjectBundle.subjectName || 'Subject Bundle'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${resourceSubjectBundle.isActive ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-red-100 text-red-700'}`}>
                              {resourceSubjectBundle.isActive ? 'Active Bundle' : 'Inactive Bundle'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-amber-900/80 dark:text-amber-200/80">
                            <span>6-Month Plan: <strong>₹{resourceSubjectBundle.sixMonthPrice}</strong> {resourceSubjectBundle.sixMonthEnabled ? '' : '(Disabled)'}</span>
                            <span>•</span>
                            <span>Lifetime Plan: <strong>₹{resourceSubjectBundle.lifetimePrice}</strong> {resourceSubjectBundle.lifetimeEnabled ? '' : '(Disabled)'}</span>
                          </div>
                          <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                            ✔ Resource uploaded here will become part of this Subject Bundle.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                            <AlertCircle size={14} />
                            <span>No Subject Bundle Created Yet</span>
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            Please create a Subject Bundle in the <strong>Subject Bundles</strong> tab first for this subject, or this resource will automatically initialize the bundle upon saving.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isEditing && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>Current:</strong> {editItem.college} → {editItem.course} → {editItem.branch} → Sem {editItem.semester} → {editItem.subject}
                  </p>
                  {resUploadMode === 'bundle' && editItem?.subjectId && resourceSubjectBundle && (
                    <div className="pt-2 border-t border-amber-200 dark:border-amber-800/50">
                      <div className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
                        <span>Subject Bundle: <strong>{resourceSubjectBundle.subjectName}</strong> (6-Mo: ₹{resourceSubjectBundle.sixMonthPrice} | Lifetime: ₹{resourceSubjectBundle.lifetimePrice})</span>
                        <span className="text-[10px] font-bold text-green-600">Active</span>
                      </div>
                    </div>
                  )}
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

              {resUploadMode === 'bundle' ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Sparkles size={15} className="text-amber-500 shrink-0" />
                  <span><strong>Subject Bundle Pricing:</strong> Access is controlled by the Subject Bundle pricing. No individual price needed at upload time.</span>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border">
                  <label className="flex items-center gap-2 text-sm text-brand-text dark:text-brand-dark-text cursor-pointer">
                    <input type="checkbox" checked={resIsPremium} onChange={e => setResIsPremium(e.target.checked)} className="rounded text-primary-500" />
                    Premium Resource
                  </label>
                  {resIsPremium ? (
                    <div className="flex-1">
                      <Field label="Price (₹)">
                        <input
                          type="number"
                          value={resPrice || ''}
                          onChange={e => setResPrice(Number(e.target.value) || 0)}
                          className={inputCls}
                          placeholder="99"
                        />
                      </Field>
                    </div>
                  ) : (
                    <span className="text-xs text-green-600 font-semibold bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-md">
                      Free for all users
                    </span>
                  )}
                </div>
              )}
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

    // Course modal — saves to Supabase (site_courses) with real video/thumbnail file upload
    if (type === 'course') {
      const cleanFilename = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]/g, '_')

      const handleSave = async () => {
        if (!editItem.title) { toast.error('Title required'); return }
        setCourseSaving(true)
        let newlyUploadedVideoUrl: string | null = null
        let newlyUploadedThumbnailUrl: string | null = null
        try {
          let videoUrl = courseExistingVideoUrl
          let thumbnailUrl = courseExistingThumbUrl

          // Upload video file if a new one was selected with real progress tracking
          if (courseVideoFile) {
            setCourseVideoUploadStatus('uploading')
            setCourseVideoUploadProgress(0)
            try {
              const path = `${Date.now()}_${cleanFilename(courseVideoFile.name)}`
              videoUrl = await uploadCourseVideo(courseVideoFile, path, (p) => setCourseVideoUploadProgress(p))
              newlyUploadedVideoUrl = videoUrl
              setCourseVideoUploadProgress(100)
              setCourseVideoUploadStatus('success')
            } catch (err) {
              setCourseVideoUploadStatus('error')
              throw err
            }
          }

          // Upload thumbnail file if a new one was selected
          if (courseThumbFile) {
            setCourseThumbUploadStatus('uploading')
            try {
              const path = `${Date.now()}_${cleanFilename(courseThumbFile.name)}`
              thumbnailUrl = await uploadCourseThumbnail(courseThumbFile, path)
              newlyUploadedThumbnailUrl = thumbnailUrl
              setCourseThumbUploadStatus('success')
            } catch (err) {
              setCourseThumbUploadStatus('error')
              throw err
            }
          }

          const isUnderBundle = (editItem.uploadMode ?? (editItem.id ? (editItem.isBundleOnly ? 'bundle' : 'individual') : 'bundle')) === 'bundle'
          if (isUnderBundle && !cSelectedSubjectId) {
            toast.error('Please select a Subject in the Academic Hierarchy to place this course under its Subject Bundle.')
            setCourseSaving(false)
            return
          }

          const isFree = !isUnderBundle && editItem.price === 'FREE'
          const payload = {
            title: editItem.title,
            description: editItem.description || '',
            group: editItem.group || 'College & Tech Courses',
            subcategory: editItem.subcategory || 'DSA',
            instructor: editItem.instructor || 'Skills021 Team',
            duration: editItem.duration || '',
            lectures: editItem.lectures ?? 0,
            level: editItem.level || 'Beginner',
            isFree: isUnderBundle ? false : isFree,
            price: isUnderBundle ? 0 : (isFree ? 0 : (Number(editItem.price) || 0)),
            tags: editItem.tags || [],
            thumbnailUrl: thumbnailUrl || undefined,
            videoUrl: videoUrl || undefined,
            status: editItem.status || 'Draft',
            notesSubject: editItem.notesSubject || '',
            subjectId: cSelectedSubjectId ? Number(cSelectedSubjectId) : null,
            isBundleOnly: isUnderBundle,
          }

          let savedCourseId: string
          if (editItem.id) {
            const updated = await updateSiteCourse(editItem.id, payload)
            savedCourseId = String(updated.id)
            setDbCourses(prev => prev.map(c => c.id === editItem.id ? updated : c))
            if ((updated as unknown as { _subjectLinkFailed?: boolean })._subjectLinkFailed) {
              toast.error('Course saved, but the College/Course/Branch/Semester/Subject link did NOT save — it won\u2019t show up under the Courses page academic filter yet. Reload the schema cache, then edit and save this course again.', { duration: 8000 })
            } else {
              toast.success('Course updated!')
            }
          } else {
            const created = await createSiteCourse(payload)
            savedCourseId = String(created.id)
            setDbCourses(prev => [created, ...prev])
            if ((created as unknown as { _subjectLinkFailed?: boolean })._subjectLinkFailed) {
              toast.error('Course saved, but the College/Course/Branch/Semester/Subject link did NOT save — it won\u2019t show up under the Courses page academic filter yet. Reload the schema cache, then edit and save this course again.', { duration: 8000 })
            } else {
              toast.success('Course added!')
            }
          }

          // New courses can have chapters entered on the same upload form.
          // Persist them only after the course row exists, so no schema change
          // or temporary database row is required.
          const pendingTimestamps = courseTimestamps.filter(t => !t.id)
          if (pendingTimestamps.length > 0) {
            const createdTimestamps = []
            for (const timestamp of pendingTimestamps) {
              createdTimestamps.push(await addTimestamp(savedCourseId, timestamp.timeSeconds, timestamp.label, timestamp.sortOrder))
            }
            setCourseTimestamps(createdTimestamps)
          }

          // Only remove replaced files after the database points at the new ones.
          if (editItem.id && courseExistingVideoUrl && videoUrl !== courseExistingVideoUrl) {
            await deleteCourseFile(courseExistingVideoUrl).catch((err) => console.warn('Old course video cleanup failed:', err))
          }
          if (editItem.id && courseExistingThumbUrl && thumbnailUrl !== courseExistingThumbUrl) {
            await deleteCourseFile(courseExistingThumbUrl).catch((err) => console.warn('Old course thumbnail cleanup failed:', err))
          }
          closeModal()
        } catch (err) {
          if (newlyUploadedVideoUrl && isBackblazeRef(newlyUploadedVideoUrl)) {
            await deleteCourseFile(newlyUploadedVideoUrl).catch(() => { })
          }
          if (newlyUploadedThumbnailUrl) {
            await deleteCourseFile(newlyUploadedThumbnailUrl).catch(() => { })
          }
          toast.error(err instanceof Error ? err.message : 'Failed to save course')
        } finally {
          setCourseSaving(false)
        }
      }

      const uploadBusy = courseVideoUploadStatus === 'uploading' || courseSaving
      const isUnderBundle = (editItem.uploadMode ?? (editItem.id ? (editItem.isBundleOnly ? 'bundle' : 'individual') : 'bundle')) === 'bundle'

      return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-brand-dark-card rounded-3xl p-6 max-w-lg w-full shadow-2xl my-4 max-h-[90vh] overflow-y-auto border border-violet-200/70 dark:border-violet-900/50 relative overflow-x-hidden">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{editItem.id ? 'Edit Course' : 'Add Course'}</h3>
              <button onClick={closeModal}><X size={18} className="text-brand-muted" /></button>
            </div>
            <div className="space-y-4">
              {/* Content Type Selector: Subject Bundle vs Individual */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-text dark:text-brand-dark-text">
                  Content Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditItem((p: any) => ({ ...p, uploadMode: 'bundle' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isUnderBundle
                        ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/30 ring-2 ring-primary-500/20 shadow-xs'
                        : 'border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isUnderBundle ? 'border-primary-500 bg-primary-500' : 'border-gray-400'}`}>
                        {isUnderBundle && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <Package size={16} className="text-primary-500 shrink-0" />
                      <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text">Subject Bundle</span>
                    </div>
                    <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted leading-relaxed pl-5">
                      Curriculum under Subject Bundle. Access & pricing are managed by the Subject Bundle.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditItem((p: any) => ({ ...p, uploadMode: 'individual' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      !isUnderBundle
                        ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/30 ring-2 ring-violet-500/20 shadow-xs'
                        : 'border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${!isUnderBundle ? 'border-violet-500 bg-violet-500' : 'border-gray-400'}`}>
                        {!isUnderBundle && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <BookOpen size={16} className="text-violet-500 shrink-0" />
                      <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text">Individual</span>
                    </div>
                    <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted leading-relaxed pl-5">
                      Standalone course under this Subject. Maintains individual Free / Paid pricing.
                    </p>
                  </button>
                </div>
              </div>

              <Field label="Title *"><input value={editItem.title || ''} onChange={e => setEditItem((p: any) => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Course title" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Group">
                  <select value={editItem.group || 'College & Tech Courses'} onChange={e => setEditItem((p: any) => ({ ...p, group: e.target.value }))} className={inputCls}>
                    {['Foundation Programs', 'Competitive Exams', 'College & Tech Courses'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Subcategory">
                  <select value={editItem.subcategory || 'DSA'} onChange={e => setEditItem((p: any) => ({ ...p, subcategory: e.target.value }))} className={inputCls}>
                    {['DSA', 'IPU Courses', 'AKTU Courses', 'Web Development', 'App Development', 'Flutter Development', 'AI & Machine Learning', 'Data Science', 'Cyber Security', 'Cloud Computing', 'Interview Preparation', 'Aptitude Preparation', 'JEE Preparation', 'NEET Preparation', 'CUET Preparation', 'Olympiads', 'NTSE', 'Class 1-5', 'Class 6-8', 'Class 9-10', 'Class 11-12'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Level">
                  <select value={editItem.level || 'Beginner'} onChange={e => setEditItem((p: any) => ({ ...p, level: e.target.value }))} className={inputCls}>
                    {['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </Field>
                {isUnderBundle ? (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500 shrink-0" />
                    <span>Bundle Pricing (No price needed here)</span>
                  </div>
                ) : (
                  <Field label="Price">
                    <input value={editItem.price === 'FREE' ? 'FREE' : (editItem.price || '')} onChange={e => { const v = e.target.value.toUpperCase(); setEditItem((p: any) => ({ ...p, price: v === 'FREE' ? 'FREE' : parseInt(v) || 0 })) }} className={inputCls} placeholder="FREE or 999" />
                  </Field>
                )}
                <Field label="Duration"><input value={editItem.duration || ''} onChange={e => setEditItem((p: any) => ({ ...p, duration: e.target.value }))} className={inputCls} placeholder="40 hours" /></Field>
                <Field label="Status">
                  <select value={editItem.status || 'Draft'} onChange={e => setEditItem((p: any) => ({ ...p, status: e.target.value }))} className={inputCls}>
                    <option>Published</option><option>Draft</option>
                  </select>
                </Field>
              </div>

              {/* Academic Hierarchy */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isUnderBundle
                  ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40'
                  : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
              }`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${
                    isUnderBundle ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    Academic Hierarchy {isUnderBundle ? '(Required for Subject Bundle)' : '(Optional)'}
                  </p>
                  {isUnderBundle && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                      Target Bundle
                    </span>
                  )}
                </div>
                <Field label="College">
                  <select value={cSelectedCollegeId} onChange={e => setCSelectedCollegeId(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                    <option value="">Select College...</option>
                    {cColleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Course">
                  <select value={cSelectedCourseId} onChange={e => setCSelectedCourseId(e.target.value ? Number(e.target.value) : '')} className={inputCls} disabled={!cSelectedCollegeId}>
                    <option value="">Select Course...</option>
                    {cCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Branch">
                  <select value={cSelectedBranchId} onChange={e => setCSelectedBranchId(e.target.value ? Number(e.target.value) : '')} className={inputCls} disabled={!cSelectedCourseId}>
                    <option value="">Select Branch...</option>
                    {cBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </Field>
                <Field label="Semester">
                  <select value={cSelectedSemesterId} onChange={e => setCSelectedSemesterId(e.target.value ? Number(e.target.value) : '')} className={inputCls} disabled={!cSelectedBranchId}>
                    <option value="">Select Semester...</option>
                    {cSemesters.map(s => <option key={s.id} value={s.id}>Semester {s.semester_number}</option>)}
                  </select>
                </Field>
                <Field label="Subject">
                  <select value={cSelectedSubjectId} onChange={e => setCSelectedSubjectId(e.target.value ? Number(e.target.value) : '')} className={inputCls} disabled={!cSelectedSemesterId}>
                    <option value="">Select Subject...</option>
                    {cSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>

                {/* Show already-created Subject Bundle for this subject */}
                {isUnderBundle && cSelectedSubjectId && (
                  <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/40">
                    {loadingCourseBundle ? (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                        <Loader2 size={13} className="animate-spin text-amber-500" />
                        <span>Checking for existing Subject Bundle...</span>
                      </div>
                    ) : courseSubjectBundle ? (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                            <Package size={14} className="text-amber-500 shrink-0" />
                            Existing Subject Bundle: {courseSubjectBundle.subjectName || 'Subject Bundle'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${courseSubjectBundle.isActive ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-red-100 text-red-700'}`}>
                            {courseSubjectBundle.isActive ? 'Active Bundle' : 'Inactive Bundle'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-amber-900/80 dark:text-amber-200/80">
                          <span>6-Month Plan: <strong>₹{courseSubjectBundle.sixMonthPrice}</strong> {courseSubjectBundle.sixMonthEnabled ? '' : '(Disabled)'}</span>
                          <span>•</span>
                          <span>Lifetime Plan: <strong>₹{courseSubjectBundle.lifetimePrice}</strong> {courseSubjectBundle.lifetimeEnabled ? '' : '(Disabled)'}</span>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                          ✔ Content uploaded here will become part of this Subject Bundle.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                          <AlertCircle size={14} />
                          <span>No Subject Bundle Created Yet</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Please create a Subject Bundle in the <strong>Subject Bundles</strong> tab first for this subject, or this course will automatically initialize the bundle upon saving.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-blue-600 dark:text-blue-400">
                  Sets this course's place in the same hierarchy students use to filter the Courses panel.
                </p>
              </div>

              <Field label="Linked Notes Subject (optional)">
                <NotesSubjectPicker
                  value={editItem.notesSubject || ''}
                  onChange={(subject) => setEditItem((p: any) => ({ ...p, notesSubject: subject }))}
                  options={Array.from(new Set(
                    dbResources
                      .filter(r => r.type.toLowerCase() === 'notes' && r.status === 'Published' && r.subject)
                      .map(r => r.subject)
                  )).sort((a, b) => a.localeCompare(b))}
                />
              </Field>

              {/* Video Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-brand-text dark:text-brand-dark-text">Course Video</label>
                <div className="border-2 border-dashed border-brand-border dark:border-brand-dark-border rounded-xl p-5 text-center bg-gray-50 dark:bg-brand-dark-bg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors relative group">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setCourseVideoFile(file)
                        setCourseVideoUploadStatus('idle')
                        setCourseVideoUploadProgress(0)
                        setCourseVideoAudioCheck('checking')
                        checkVideoHasAudio(file).then(result => {
                          setCourseVideoAudioCheck(result === 'yes' ? 'has-audio' : result === 'no' ? 'no-audio' : null)
                        })
                        setCourseVideoDurationSeconds(null)
                        getVideoDurationSeconds(file).then(setCourseVideoDurationSeconds)
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Video className="text-brand-muted dark:text-brand-dark-muted group-hover:scale-105 transition-transform" size={24} />
                    <p className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">
                      {courseVideoFile ? 'Change Selected Video' : courseExistingVideoUrl ? 'Replace Video' : 'Choose Video File'}
                    </p>
                    <p className="text-[10px] text-brand-muted">MP4, WebM, MOV — keeps original audio track</p>
                  </div>
                </div>
                {courseVideoAudioCheck === 'checking' && (
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Checking video for an audio track...</p>
                )}
                {courseVideoAudioCheck === 'no-audio' && (
                  <p className="text-xs text-amber-600 font-semibold flex items-start gap-1.5">
                    <span>⚠</span>
                    <span>Couldn't detect sound in this video in a quick browser check. If you're confident the file has audio (e.g. it plays fine in VLC), it's likely fine — this check can occasionally misfire. Just verify sound plays after uploading.</span>
                  </p>
                )}
                {courseVideoAudioCheck === 'has-audio' && (
                  <p className="text-xs text-green-600 font-semibold flex items-center gap-1.5"><span>✔</span> Audio track detected — this video has sound.</p>
                )}
                {(courseVideoFile || courseExistingVideoUrl) && (
                  <div className="p-3 bg-gray-50 dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border rounded-xl flex items-center justify-between text-xs text-brand-text dark:text-brand-dark-text">
                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                      <span className="text-green-500 font-bold">✔</span>
                      <div className="truncate text-left">
                        <p className="font-semibold truncate">{courseVideoFile ? courseVideoFile.name : 'Current Stored Video'}</p>
                        {courseVideoFile && <p className="text-[10px] text-brand-muted">{(courseVideoFile.size / 1024 / 1024).toFixed(2)} MB</p>}
                      </div>
                    </div>
                    {courseExistingVideoUrl && !courseVideoFile && (
                      <span className="text-[10px] bg-primary-50 dark:bg-primary-950/20 text-primary-600 font-semibold px-2 py-0.5 rounded-md">Active</span>
                    )}
                  </div>
                )}
                {courseVideoUploadStatus === 'uploading' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-brand-muted uppercase">
                      <span>Uploading Video...</span><span>{courseVideoUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${courseVideoUploadProgress}%` }} transition={{ duration: 0.1 }} className="bg-primary-500 h-full rounded-full" />
                    </div>
                  </div>
                )}
                {courseVideoUploadStatus === 'success' && <p className="text-xs text-green-600 font-semibold flex items-center gap-1.5"><span>✔</span> Video uploaded successfully!</p>}
                {courseVideoUploadStatus === 'error' && <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5"><span>❌</span> Video upload failed. Please try again.</p>}
              </div>

              {/* Chapters / YouTube-style Timestamps */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-brand-text dark:text-brand-dark-text">
                  <ListVideo size={15} /> Chapters (Video Timestamps)
                  {courseVideoDurationSeconds != null && (
                    <span className="ml-auto text-[10px] font-mono font-normal text-brand-muted dark:text-brand-dark-muted bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                      Video length: {formatSeconds(courseVideoDurationSeconds)}
                    </span>
                  )}
                </label>
                <div className="border border-brand-border dark:border-brand-dark-border rounded-xl p-3 space-y-3 bg-gray-50 dark:bg-brand-dark-bg">
                  {timestampsLoading ? (
                    <div className="flex items-center justify-center py-3"><Loader2 size={16} className="animate-spin text-brand-muted" /></div>
                  ) : courseTimestamps.length === 0 ? (
                    <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted">No chapters yet. Add the first one below.</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {courseTimestamps.map(t => (
                        <div key={t.id ?? `pending-${t.sortOrder}-${t.timeSeconds}-${t.label}`} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border text-xs">
                          <span className="font-mono font-semibold text-primary-500 flex-shrink-0">{formatSeconds(t.timeSeconds)}</span>
                          <span className="flex-1 truncate text-brand-text dark:text-brand-dark-text">{t.label}</span>
                          <button
                            type="button"
                            disabled={deletingTimestampId === t.id}
                            onClick={async () => {
                              if (!t.id) {
                                setCourseTimestamps(prev => prev.filter(x => x !== t))
                                return
                              }
                              setDeletingTimestampId(t.id)
                              try {
                                await deleteTimestampApi(t.id)
                                setCourseTimestamps(prev => prev.filter(x => x.id !== t.id))
                                toast.success('Chapter removed')
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : 'Failed to remove chapter')
                              } finally {
                                setDeletingTimestampId(null)
                              }
                            }}
                            className="p-1 text-red-400 hover:text-red-600 flex-shrink-0 disabled:opacity-50"
                          >
                            {deletingTimestampId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="relative w-24 flex-shrink-0">
                      <Clock size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        value={newTimestampTime}
                        onChange={e => setNewTimestampTime(e.target.value)}
                        placeholder="0.05 / 0:05"
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card text-xs text-brand-text dark:text-brand-dark-text"
                      />
                    </div>
                    <input
                      value={newTimestampLabel}
                      onChange={e => setNewTimestampLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !timestampSaving && handleAddChapter()}
                      placeholder="Chapter label, e.g. Introduction"
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card text-xs text-brand-text dark:text-brand-dark-text"
                    />
                    <button
                      type="button"
                      disabled={timestampSaving || !newTimestampTime || !newTimestampLabel.trim()}
                      onClick={handleAddChapter}
                      className="flex-shrink-0 p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
                    >
                      {timestampSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-brand-muted dark:text-brand-dark-muted">
                    {courseVideoDurationSeconds != null
                      ? `Enter 0.05 for 5 sec, 0.06 for 6 sec, 0.07 for 7 sec, or use 0:05 / 00:05. Video length: ${formatSeconds(courseVideoDurationSeconds)}.`
                      : 'Enter 0.05 for 5 seconds, 0:05, or 00:05 for timestamp positions.'}
                  </p>
                </div>
              </div>

              {/* Thumbnail Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-brand-text dark:text-brand-dark-text">Course Thumbnail</label>
                <div className="border-2 border-dashed border-brand-border dark:border-brand-dark-border rounded-xl p-4 text-center bg-gray-50 dark:bg-brand-dark-bg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) { setCourseThumbFile(file); setCourseThumbUploadStatus('idle') }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <p className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">
                    {courseThumbFile ? courseThumbFile.name : courseExistingThumbUrl ? 'Replace Thumbnail Image' : 'Choose Thumbnail Image'}
                  </p>
                </div>
                {courseThumbUploadStatus === 'success' && <p className="text-xs text-green-600 font-semibold">✔ Thumbnail uploaded successfully!</p>}
                {courseThumbUploadStatus === 'error' && <p className="text-xs text-red-600 font-semibold">❌ Thumbnail upload failed.</p>}
              </div>

              <Field label="Description"><textarea value={editItem.description || ''} onChange={e => setEditItem((p: any) => ({ ...p, description: e.target.value }))} rows={3} className={inputCls + ' resize-none'} placeholder="Course description" /></Field>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} disabled={uploadBusy} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text disabled:opacity-60">Cancel</button>
              <button onClick={handleSave} disabled={uploadBusy} className="flex-1 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-60 flex items-center justify-center gap-2">
                {uploadBusy && <Loader2 size={14} className="animate-spin" />}
                {editItem.id ? 'Update' : 'Add'} Course
              </button>
            </div>
          </motion.div>
        </div>
      )
    }

    // Dedicated modal for mentor Sessions — admin can fully create/edit any session
    if (type === 'session') {
      const handleSessionSave = async () => {
        if (!editItem.studentName || !editItem.mentorId || !editItem.date) {
          toast.error('Student name, mentor and date are required')
          return
        }
        const payload = {
          studentName: editItem.studentName,
          studentEmail: editItem.studentEmail || '',
          mentorId: editItem.mentorId,
          serviceType: editItem.serviceType || 'Career Guidance',
          date: editItem.date,
          time: editItem.time || '',
          duration: editItem.duration || '',
          fee: Number(editItem.fee) || 0,
          status: editItem.status || 'Pending',
          notes: editItem.notes || '',
        }
        setMentorSaving(true)
        try {
          if (editItem.id) {
            const updated = await updateSessionApi(editItem.id, payload)
            setDbSessions(prev => prev.map(s => s.id === editItem.id ? updated : s))
            toast.success('Session updated!')
          } else {
            const created = await createSessionApi(payload)
            setDbSessions(prev => [created, ...prev])
            toast.success('Session added!')
          }
          closeModal()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to save session')
        } finally {
          setMentorSaving(false)
        }
      }
      return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-lg w-full shadow-xl my-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{editItem.id ? 'Edit' : 'Add'} Session</h3>
              <button onClick={closeModal}><X size={18} className="text-brand-muted" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Student Name *">
                  <input value={editItem.studentName || ''} onChange={e => setEditItem((p: any) => ({ ...p, studentName: e.target.value }))} className={inputCls} placeholder="Student name" />
                </Field>
                <Field label="Student Email">
                  <input value={editItem.studentEmail || ''} onChange={e => setEditItem((p: any) => ({ ...p, studentEmail: e.target.value }))} className={inputCls} placeholder="student@email.com" />
                </Field>
              </div>
              <Field label="Mentor *">
                <select value={editItem.mentorId || ''} onChange={e => setEditItem((p: any) => ({ ...p, mentorId: e.target.value }))} className={inputCls}>
                  <option value="">Select mentor</option>
                  {dbMentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
              <Field label="Service Type">
                <select value={editItem.serviceType || 'Career Guidance'} onChange={e => setEditItem((p: any) => ({ ...p, serviceType: e.target.value }))} className={inputCls}>
                  {['One-to-One Mentorship', 'Career Guidance', 'Resume Review', 'LinkedIn Profile Review', 'Mock Interview', 'Placement Preparation', 'Study Roadmap'].map(st => <option key={st}>{st}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date *">
                  <input type="date" value={editItem.date || ''} onChange={e => setEditItem((p: any) => ({ ...p, date: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Time">
                  <input type="time" value={editItem.time || ''} onChange={e => setEditItem((p: any) => ({ ...p, time: e.target.value }))} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Duration">
                  <input value={editItem.duration || ''} onChange={e => setEditItem((p: any) => ({ ...p, duration: e.target.value }))} className={inputCls} placeholder="e.g. 30 mins" />
                </Field>
                <Field label="Fee (₹)">
                  <input type="number" value={editItem.fee ?? ''} onChange={e => setEditItem((p: any) => ({ ...p, fee: e.target.value }))} className={inputCls} placeholder="0" />
                </Field>
              </div>
              <Field label="Status">
                <select value={editItem.status || 'Pending'} onChange={e => setEditItem((p: any) => ({ ...p, status: e.target.value }))} className={inputCls}>
                  {['Pending', 'Confirmed', 'Completed', 'Cancelled'].map(st => <option key={st}>{st}</option>)}
                </select>
              </Field>
              <Field label="Notes">
                <textarea value={editItem.notes || ''} onChange={e => setEditItem((p: any) => ({ ...p, notes: e.target.value }))} rows={3} className={inputCls + ' resize-none'} placeholder="Session notes..." />
              </Field>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} disabled={mentorSaving} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text disabled:opacity-60">Cancel</button>
              <button onClick={handleSessionSave} disabled={mentorSaving} className="flex-1 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                {mentorSaving && <Loader2 size={14} className="animate-spin" />}
                {editItem.id ? 'Update' : 'Add'} Session
              </button>
            </div>
          </motion.div>
        </div>
      )
    }

    // Dedicated Mentor modal — full profile, saved to Supabase
    if (type === 'mentor') {
      const ALL_SERVICES: MentorshipServiceType[] = ['One-to-One Mentorship', 'Career Guidance', 'Resume Review', 'LinkedIn Profile Review', 'Mock Interview', 'Placement Preparation', 'Study Roadmap']
      const selectedServices: MentorshipServiceType[] = editItem.services || []
      const fees: Record<string, number> = editItem.fees || {}

      const toggleService = (svc: MentorshipServiceType) => {
        setEditItem((p: any) => {
          const cur: MentorshipServiceType[] = p.services || []
          const next = cur.includes(svc) ? cur.filter((s: string) => s !== svc) : [...cur, svc]
          return { ...p, services: next }
        })
      }

      const handleMentorSave = async () => {
        if (!editItem.name) { toast.error('Mentor name is required'); return }
        setMentorSaving(true)
        try {
          let photoUrl = mentorExistingPhotoUrl
          if (mentorPhotoFile) {
            setMentorPhotoUploadStatus('uploading')
            try {
              const path = `${Date.now()}_${mentorPhotoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
              photoUrl = await uploadMentorPhoto(mentorPhotoFile, path)
              setMentorPhotoUploadStatus('success')
              if (editItem.id && mentorExistingPhotoUrl) {
                await deleteMentorPhoto(mentorExistingPhotoUrl).catch(() => { })
              }
            } catch (err) {
              setMentorPhotoUploadStatus('error')
              throw err
            }
          }

          const expertiseArr = typeof editItem.expertiseText === 'string'
            ? editItem.expertiseText.split(',').map((s: string) => s.trim()).filter(Boolean)
            : (editItem.expertise || [])

          const payload = {
            name: editItem.name,
            designation: editItem.designation || '',
            company: editItem.company || '',
            expertise: expertiseArr,
            experience: editItem.experience || '',
            bio: editItem.bio || '',
            services: selectedServices,
            fees,
            linkedIn: editItem.linkedIn || '',
            photo: photoUrl || undefined,
            status: editItem.status || 'Active',
          }

          if (editItem.id) {
            const updated = await updateMentorApi(editItem.id, payload)
            setDbMentors(prev => prev.map(m => m.id === editItem.id ? updated : m))
            toast.success('Mentor updated!')
          } else {
            const created = await createMentor(payload)
            setDbMentors(prev => [created, ...prev])
            toast.success('Mentor added!')
          }
          closeModal()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to save mentor')
        } finally {
          setMentorSaving(false)
        }
      }

      const mentorBusy = mentorSaving || mentorPhotoUploadStatus === 'uploading'

      return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-brand-dark-card rounded-3xl p-6 max-w-lg w-full shadow-2xl my-4 max-h-[90vh] overflow-y-auto border border-violet-200/70 dark:border-violet-900/50 relative overflow-x-hidden">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{editItem.id ? 'Edit Mentor' : 'Add Mentor'}</h3>
              <button onClick={closeModal}><X size={18} className="text-brand-muted" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name *"><input value={editItem.name || ''} onChange={e => setEditItem((p: any) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Mentor name" /></Field>
                <Field label="Designation"><input value={editItem.designation || ''} onChange={e => setEditItem((p: any) => ({ ...p, designation: e.target.value }))} className={inputCls} placeholder="Senior Engineer" /></Field>
                <Field label="Company"><input value={editItem.company || ''} onChange={e => setEditItem((p: any) => ({ ...p, company: e.target.value }))} className={inputCls} placeholder="Google" /></Field>
                <Field label="Experience"><input value={editItem.experience || ''} onChange={e => setEditItem((p: any) => ({ ...p, experience: e.target.value }))} className={inputCls} placeholder="8 years" /></Field>
              </div>
              <Field label="Expertise (comma separated)">
                <input
                  value={editItem.expertiseText ?? (editItem.expertise || []).join(', ')}
                  onChange={e => setEditItem((p: any) => ({ ...p, expertiseText: e.target.value }))}
                  className={inputCls}
                  placeholder="DSA, System Design, Interview Prep"
                />
              </Field>
              <Field label="Bio">
                <textarea value={editItem.bio || ''} onChange={e => setEditItem((p: any) => ({ ...p, bio: e.target.value }))} rows={3} className={inputCls + ' resize-none'} placeholder="Short bio..." />
              </Field>

              <div>
                <label className="block text-sm font-semibold text-brand-text dark:text-brand-dark-text mb-2">Services Offered</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_SERVICES.map(svc => (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => toggleService(svc)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${selectedServices.includes(svc) ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black border-transparent' : 'border-brand-border dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted'}`}
                    >
                      {svc}
                    </button>
                  ))}
                </div>
              </div>

              {selectedServices.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-brand-text dark:text-brand-dark-text">Fees per Service (₹)</label>
                  {selectedServices.map(svc => (
                    <div key={svc} className="flex items-center gap-3">
                      <span className="text-xs text-brand-muted dark:text-brand-dark-muted flex-1">{svc}</span>
                      <input
                        type="number"
                        value={fees[svc] ?? ''}
                        onChange={e => setEditItem((p: any) => ({ ...p, fees: { ...(p.fees || {}), [svc]: Number(e.target.value) || 0 } }))}
                        className={inputCls + ' w-28'}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="LinkedIn URL"><input value={editItem.linkedIn || ''} onChange={e => setEditItem((p: any) => ({ ...p, linkedIn: e.target.value }))} className={inputCls} placeholder="https://linkedin.com/in/..." /></Field>
                <Field label="Status">
                  <select value={editItem.status || 'Active'} onChange={e => setEditItem((p: any) => ({ ...p, status: e.target.value }))} className={inputCls}>
                    <option>Active</option><option>Inactive</option>
                  </select>
                </Field>
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-brand-text dark:text-brand-dark-text">Mentor Photo</label>
                <div className="border-2 border-dashed border-violet-300 dark:border-violet-800 rounded-2xl p-4 bg-gradient-to-br from-violet-50 to-cyan-50 dark:from-violet-950/20 dark:to-cyan-950/20 transition-colors relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) { setMentorPhotoFile(file); setMentorPhotoUploadStatus('idle') }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white dark:bg-brand-dark-bg ring-2 ring-violet-200 dark:ring-violet-800 flex items-center justify-center">
                      {mentorPhotoFile ? (
                        <img src={URL.createObjectURL(mentorPhotoFile)} alt="Selected mentor" className="w-full h-full object-cover" />
                      ) : mentorExistingPhotoUrl ? (
                        <img src={mentorExistingPhotoUrl} alt="Current mentor" className="w-full h-full object-cover" />
                      ) : (
                        <Users size={24} className="text-violet-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-brand-text dark:text-brand-dark-text">
                        {mentorPhotoFile ? mentorPhotoFile.name : mentorExistingPhotoUrl ? 'Replace mentor photo' : 'Add mentor photo'}
                      </p>
                      <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1">Click anywhere here • JPG, PNG, WEBP</p>
                    </div>
                  </div>
                </div>
                {mentorPhotoUploadStatus === 'success' && <p className="text-xs text-green-600 font-semibold">✔ Photo uploaded successfully!</p>}
                {mentorPhotoUploadStatus === 'error' && <p className="text-xs text-red-600 font-semibold">❌ Photo upload failed.</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} disabled={mentorBusy} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text disabled:opacity-60">Cancel</button>
              <button onClick={handleMentorSave} disabled={mentorBusy} className="flex-1 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-60 flex items-center justify-center gap-2">
                {mentorBusy && <Loader2 size={14} className="animate-spin" />}
                {editItem.id ? 'Update' : 'Add'} Mentor
              </button>
            </div>
          </motion.div>
        </div>
      )
    }

    // Generic modal for other types (quiz, roadmap)
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

  // Build a local datetime from the clearly-labelled date + 12-hour time fields.
  const buildWebinarDateTime = (date: string, hour: string, minute: string, period: 'AM' | 'PM') => {
    // Minute defaults to 00 so selecting an hour is a valid time selection.
    // This also prevents the form from incorrectly reporting a missing start
    // time when the admin has selected the hour but left minutes at 00.
    if (!date || !hour) return ''
    let h = Number(hour)
    const m = minute === '' ? 0 : Number(minute)
    if (!Number.isInteger(h) || h < 1 || h > 12) return ''
    if (!Number.isInteger(m) || m < 0 || m > 59) return ''
    if (period === 'AM' && h === 12) h = 0
    if (period === 'PM' && h !== 12) h += 12
    return `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const webinarTimeField = (
    label: string,
    date: string,
    setDate: (v: string) => void,
    hour: string,
    setHour: (v: string) => void,
    minute: string,
    setMinute: (v: string) => void,
    period: 'AM' | 'PM',
    setPeriod: (v: 'AM' | 'PM') => void,
    optional = false
  ) => {
    const selectedPreview = date && hour ? (() => {
      try {
        const d = new Date(`${date}T12:00:00`)
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        const minStr = (minute || '00').padStart(2, '0')
        return `${dateStr} at ${hour}:${minStr} ${period}`
      } catch {
        return null
      }
    })() : null

    return (
      <div className="rounded-xl border border-brand-border dark:border-brand-dark-border p-4 bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2">
            <Clock size={15} className="text-violet-500" />
            {label}
          </label>
          {optional && <span className="text-xs font-medium text-brand-muted bg-gray-200/60 dark:bg-white/10 px-2 py-0.5 rounded-full">Optional</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-brand-muted mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-violet-500" /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm font-medium text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-muted mb-1.5 flex items-center gap-1.5">
              <Clock size={13} className="text-violet-500" /> Time (12-Hour)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <select
                  value={hour}
                  onChange={e => setHour(e.target.value)}
                  className="w-full px-2 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm font-semibold text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 text-center"
                >
                  <option value="">Hour</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                    <option key={h} value={String(h)}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={minute}
                  onChange={e => setMinute(e.target.value)}
                  className="w-full px-2 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm font-semibold text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 text-center"
                >
                  <option value="00">:00</option>
                  <option value="05">:05</option>
                  <option value="10">:10</option>
                  <option value="15">:15</option>
                  <option value="20">:20</option>
                  <option value="25">:25</option>
                  <option value="30">:30</option>
                  <option value="35">:35</option>
                  <option value="40">:40</option>
                  <option value="45">:45</option>
                  <option value="50">:50</option>
                  <option value="55">:55</option>
                </select>
              </div>
              <div>
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value as 'AM' | 'PM')}
                  className="w-full px-2 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm font-bold text-violet-600 dark:text-violet-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-center"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {selectedPreview && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 text-xs text-violet-900 dark:text-violet-200">
            <CheckCircle size={14} className="text-emerald-500 shrink-0" />
            <span>
              Selected Schedule: <strong>{selectedPreview}</strong>
            </span>
          </div>
        )}
      </div>
    )
  }

  const loadWebinarIntoForm = (webinar: LiveWebinar) => {
    const start = new Date(webinar.startsAt)
    const startHour24 = start.getHours()
    const startPeriod: 'AM' | 'PM' = startHour24 >= 12 ? 'PM' : 'AM'
    const startHour12 = startHour24 % 12 || 12

    setEditingWebinarId(webinar.id)
    setShowWebinarEditModal(true)
    setLiveTitle(webinar.title)
    setLiveDescription(webinar.description || '')
    setLiveProvider(webinar.provider)
    setLiveJoinUrl(webinar.joinUrl)
    setLiveAccess(webinar.access)
    setLivePrice(String(webinar.price ?? 0))
    setStartDate(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`)
    setStartHour(String(startHour12))
    setStartMinute(String(start.getMinutes()).padStart(2, '0'))
    setStartPeriod(startPeriod)

    if (webinar.endsAt) {
      const end = new Date(webinar.endsAt)
      const endHour24 = end.getHours()
      setHasEndTime(true)
      setEndDate(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`)
      setEndHour(String(endHour24 % 12 || 12))
      setEndMinute(String(end.getMinutes()).padStart(2, '0'))
      setEndPeriod(endHour24 >= 12 ? 'PM' : 'AM')
    } else {
      setHasEndTime(false)
      setEndDate(''); setEndHour(''); setEndMinute(''); setEndPeriod('AM')
    }
    setWebinarEditVideoFile(null); setWebinarEditVideoUploadStatus('idle'); setWebinarEditVideoUploadProgress(0)
    setWebinarEditVideoAudioCheck(null); setWebinarEditVideoDurationSeconds(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetWebinarForm = () => {
    setEditingWebinarId(null)
    setShowWebinarEditModal(false)
    setLiveTitle(''); setLiveDescription(''); setLiveJoinUrl('')
    setLiveProvider('Google Meet')
    setLiveAccess('free'); setLivePrice('0')
    setStartDate(''); setStartHour(''); setStartMinute('00'); setStartPeriod('AM')
    setHasEndTime(false); setEndDate(''); setEndHour(''); setEndMinute('00'); setEndPeriod('AM')
    setWebinarEditVideoFile(null); setWebinarEditVideoUploadStatus('idle'); setWebinarEditVideoUploadProgress(0)
    setWebinarEditVideoAudioCheck(null); setWebinarEditVideoDurationSeconds(null)
  }

  // ─── Webinars ────────────────────────────────────────────────────────────────
  const renderWebinars = () => {
    const liveNow = liveWebinars.filter(w => new Date(w.startsAt) <= new Date() && (!w.endsAt || new Date(w.endsAt) > new Date()))
    return (
      <div className="space-y-8">
        <SectionHeader title="Manage Webinars" count={webinarRecordings.length} />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5"><Radio size={18} className="text-red-500" /><h3 className="font-bold text-lg">Schedule live webinar</h3></div>
            <div className="space-y-4">
              <Field label="Title *"><input value={liveTitle} onChange={e => setLiveTitle(e.target.value)} className={inputCls} placeholder="Career Q&A — Placement Strategy" /></Field>
              <Field label="Description"><textarea value={liveDescription} onChange={e => setLiveDescription(e.target.value)} className={inputCls + ' resize-none'} rows={3} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Platform"><select value={liveProvider} onChange={e => setLiveProvider(e.target.value as WebinarProvider)} className={inputCls}><option>Google Meet</option><option>Zoom</option></select></Field>
                <Field label="Join URL *"><input value={liveJoinUrl} onChange={e => setLiveJoinUrl(e.target.value)} className={inputCls} placeholder="https://meet.google.com/..." /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Access">
                  <select value={liveAccess} onChange={e => setLiveAccess(e.target.value as WebinarAccess)} className={inputCls}>
                    <option value="free">Free for everyone</option>
                    <option value="paid">Paid for everyone</option>
                    <option value="enrolled_free">Free for enrolled students, paid for others</option>
                  </select>
                </Field>
                <Field label="Price (₹)">
                  <input type="number" min="0" step="1" value={livePrice} disabled={liveAccess === 'free'} onChange={e => setLivePrice(e.target.value)} className={inputCls} placeholder="499" />
                </Field>
              </div>
              {liveAccess === 'enrolled_free' && <p className="text-xs text-violet-600 dark:text-violet-300 -mt-2">Students with any active course enrollment get this webinar free. Everyone else sees the paid price.</p>}
              <div className="space-y-3">
                {webinarTimeField('Start time *', startDate, setStartDate, startHour, setStartHour, startMinute, setStartMinute, startPeriod, setStartPeriod)}
                <div className="rounded-xl border border-brand-border dark:border-brand-dark-border px-3 py-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={hasEndTime} onChange={e => { const checked = e.target.checked; setHasEndTime(checked); if (checked) { setEndDate(endDate || startDate); setEndHour(endHour || startHour || '12'); setEndMinute(endMinute || '00'); setEndPeriod(endHour ? endPeriod : startPeriod) } }} className="h-4 w-4 rounded" />
                    <span className="text-sm font-semibold text-brand-text dark:text-brand-dark-text">Add an end time</span>
                    <span className="text-xs font-medium text-brand-muted">Optional</span>
                  </label>
                  {!hasEndTime && <p className="text-xs text-brand-muted mt-2 ml-7">Leave this off if you want to end the webinar manually.</p>}
                </div>
                {hasEndTime && webinarTimeField('End time', endDate, setEndDate, endHour, setEndHour, endMinute, setEndMinute, endPeriod, setEndPeriod, true)}
              </div>
              <div className="flex gap-3">
                <button disabled={webinarBusy} onClick={async () => {
                  const startValue = buildWebinarDateTime(startDate, startHour, startMinute, startPeriod)
                  const endValue = hasEndTime ? buildWebinarDateTime(endDate, endHour, endMinute, endPeriod) : ''
                  if (!liveTitle || !liveJoinUrl || !startValue) { toast.error('Fill all required webinar fields'); return }
                  if (hasEndTime && !endValue) { toast.error('Complete the optional end time or turn it off'); return }
                  if (hasEndTime && new Date(endValue).getTime() <= new Date(startValue).getTime()) { toast.error('End time must be after the start time'); return }
                  try {
                    setWebinarBusy(true)
                    const payload = { title: liveTitle, description: liveDescription, provider: liveProvider, joinUrl: liveJoinUrl, startsAt: new Date(startValue).toISOString(), endsAt: endValue ? new Date(endValue).toISOString() : null, access: liveAccess, price: liveAccess === 'free' ? 0 : Math.max(0, Number(livePrice) || 0) }
                    const created = await createLiveWebinar(payload)
                    setLiveWebinars(prev => [...prev, created])
                    toast.success('Live webinar scheduled')
                    resetWebinarForm()
                  } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save webinar') } finally { setWebinarBusy(false) }
                }} className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold">Schedule webinar</button>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5"><Video size={18} className="text-violet-500" /><h3 className="font-bold text-lg">Store webinar recording</h3></div>
            <div className="space-y-4">
              <Field label="Recording title *"><input value={recordingTitle} onChange={e => setRecordingTitle(e.target.value)} className={inputCls} /></Field>
              <Field label="Description"><textarea value={recordingDescription} onChange={e => setRecordingDescription(e.target.value)} className={inputCls + ' resize-none'} rows={3} /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Session date"><input type="date" value={recordingDate} onChange={e => setRecordingDate(e.target.value)} className={inputCls} /></Field><Field label="Video duration (automatic)"><input value={recordingDurationLoading ? 'Detecting duration...' : recordingDuration} readOnly className={inputCls + ' bg-gray-50 dark:bg-white/5 cursor-not-allowed'} placeholder="Select a video first" /></Field></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Replay access">
                  <select value={recordingAccess} onChange={e => setRecordingAccess(e.target.value as WebinarAccess)} className={inputCls}>
                    <option value="free">Free for everyone</option>
                    <option value="paid">Paid for everyone</option>
                    <option value="enrolled_free">Free for enrolled students, paid for others</option>
                  </select>
                </Field>
                <Field label="Price (₹)">
                  <input type="number" min="0" step="1" value={recordingPrice} disabled={recordingAccess !== 'paid' && recordingAccess !== 'enrolled_free'} onChange={e => setRecordingPrice(e.target.value)} className={inputCls} placeholder="299" />
                </Field>
              </div>
              {recordingAccess === 'enrolled_free' && <p className="text-xs text-violet-600 dark:text-violet-300 -mt-2">Any active course-enrolled student gets the replay free; everyone else sees the paid price.</p>}
              <Field label="Video file *"><input type="file" accept="video/*" onChange={e => setRecordingFile(e.target.files?.[0] ?? null)} className={inputCls} /></Field>
              {recordingFile && <div className="rounded-xl border border-brand-border dark:border-brand-dark-border p-3 bg-gray-50 dark:bg-white/5"><div className="flex items-center justify-between text-xs mb-1.5"><span className="font-semibold text-brand-text dark:text-brand-dark-text truncate mr-3">{recordingFile.name}</span><span className="text-brand-muted">{(recordingFile.size / 1024 / 1024).toFixed(2)} MB</span></div><div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden"><motion.div className="h-full bg-violet-600 rounded-full" animate={{ width: `${recordingUploadProgress}%` }} /></div>{webinarBusy && <p className="mt-1.5 text-[10px] font-semibold text-brand-muted">Uploading {recordingUploadProgress}%...</p>}</div>}
              <button disabled={webinarBusy || !recordingFile || !recordingTitle.trim()} onClick={async () => { let uploadedWebinarRef: string | null = null; try { setWebinarBusy(true); setRecordingUploadProgress(0); let duration = recordingDuration; if (!duration) { const seconds = await getVideoDurationSeconds(recordingFile!); if (seconds != null) duration = formatDurationHuman(seconds) } if (!duration) { throw new Error('Could not read the video duration. Please choose a valid video file and try again.') } uploadedWebinarRef = await uploadWebinarVideo(recordingFile!, recordingDate, p => setRecordingUploadProgress(p)); const created = await createWebinarRecording({ title: recordingTitle.trim(), description: recordingDescription.trim(), sessionDate: recordingDate, videoUrl: uploadedWebinarRef, duration, access: recordingAccess, price: recordingAccess === 'free' ? 0 : Math.max(0, Number(recordingPrice) || 0) }); setWebinarRecordings(prev => [created, ...prev]); setRecordingTitle(''); setRecordingDescription(''); setRecordingFile(null); setRecordingDuration(''); setRecordingAccess('free'); setRecordingPrice('0'); setRecordingUploadProgress(0); toast.success('Webinar recording published') } catch (e) { if (uploadedWebinarRef && isBackblazeRef(uploadedWebinarRef)) { await deleteBackblazeFile(uploadedWebinarRef).catch(() => { }) } toast.error(e instanceof Error ? e.message : 'Failed to upload recording') } finally { setWebinarBusy(false) } }} className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-50">{webinarBusy ? 'Uploading replay...' : 'Upload & publish replay'}</button>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="p-5 border-b border-brand-border dark:border-brand-dark-border"><h3 className="font-bold">Scheduled sessions</h3></div>
          {liveWebinars.length === 0 ? <p className="p-6 text-sm text-brand-muted">No live sessions scheduled.</p> : <div className="divide-y divide-brand-border dark:divide-brand-dark-border">{liveWebinars.map(w => { const ongoing = new Date(w.startsAt) <= new Date() && (!w.endsAt || new Date(w.endsAt) > new Date()); return <div key={w.id} className="p-4 flex items-center justify-between gap-4"><div><div className="flex items-center gap-2"><span className="font-semibold">{w.title}</span>{ongoing && <StatusBadge status="Ongoing" />}</div><div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-bold border border-violet-200 dark:border-violet-800"><Clock size={12} className="text-violet-500" />{new Date(w.startsAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}{w.endsAt && ` to ${new Date(w.endsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}</span><span className="text-brand-muted">·</span><span className="text-brand-muted">{w.provider}</span><span className="text-brand-muted">·</span><span className={`font-semibold ${w.access === 'free' ? 'text-emerald-600' : 'text-amber-600'}`}>{w.access === 'free' ? 'Free' : w.access === 'enrolled_free' ? `Enrolled free (₹${w.price})` : `Paid · ₹${w.price}`}</span></div></div><div className="flex items-center gap-2">{new Date(w.startsAt).getTime() > Date.now() && <button onClick={() => loadWebinarIntoForm(w)} className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg" title="Edit upcoming webinar"><Edit2 size={15} /></button>}<a href={w.joinUrl} target="_blank" rel="noreferrer" className="p-2 text-primary-500"><ExternalLink size={15} /></a><button onClick={async () => { try { await deleteLiveWebinar(w.id); setLiveWebinars(prev => prev.filter(x => x.id !== w.id)); toast.success('Webinar deleted') } catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed') } }} className="p-2 text-red-500"><Trash2 size={15} /></button></div></div> })}</div>}
        </div>

        <div className="card overflow-hidden">
          <div className="p-5 border-b border-brand-border dark:border-brand-dark-border"><h3 className="font-bold">Published replays</h3></div>
          {webinarRecordings.length === 0 ? <p className="p-6 text-sm text-brand-muted">No recordings yet.</p> : <div className="divide-y divide-brand-border dark:divide-brand-dark-border">{webinarRecordings.map(w => <div key={w.id} className="p-4 flex items-center justify-between gap-4"><div className="min-w-0"><p className="font-semibold truncate">{w.title}</p><p className="text-xs text-brand-muted mt-1">{w.sessionDate} · {w.duration || 'Duration not set'} · {w.access === 'free' ? 'Free' : w.access === 'enrolled_free' ? `Enrolled free · ₹${w.price}` : `Paid · ₹${w.price}`}</p></div><div className="flex items-center gap-3 shrink-0">{w.videoUrl && <a href={w.videoUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-violet-600">Watch</a>}<button onClick={async () => { if (!window.confirm(`Delete replay \"${w.title}\"? This removes the stored video and database entry.`)) return; try { setWebinarBusy(true); await deleteWebinarRecording(w); setWebinarRecordings(prev => prev.filter(x => x.id !== w.id)); toast.success('Webinar recording deleted') } catch (e) { toast.error(e instanceof Error ? e.message : 'Delete failed') } finally { setWebinarBusy(false) } }} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete replay"><Trash2 size={15} /></button></div></div>)}</div>}
        </div>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  // ─── Pricing Sections ─────────────────────────────────────────────────────

  // ── Shared Discount Section (course OR resource) ─────────────────────────
  function DiscountSection({ productType }: { productType: ProductType }) {
    const [discounts, setDiscounts] = useState<ProductDiscount[]>([])
    const [loading, setLoading] = useState(true)
    const [discSearch, setDiscSearch] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingDiscount, setEditingDiscount] = useState<ProductDiscount | null>(null)
    const [deletingDiscount, setDeletingDiscount] = useState<ProductDiscount | null>(null)
    const [saving, setSaving] = useState(false)

    // Form state
    const [formProductId, setFormProductId] = useState('')
    const [formDiscountType, setFormDiscountType] = useState<DiscountType>('percentage')
    const [formDiscountValue, setFormDiscountValue] = useState('')
    const [formMaxDiscount, setFormMaxDiscount] = useState('')
    const [formStartsAt, setFormStartsAt] = useState('')
    const [formExpiresAt, setFormExpiresAt] = useState('')
    const [formIsActive, setFormIsActive] = useState(true)

    useEffect(() => {
      setLoading(true)
      fetchAllDiscounts(productType)
        .then(setDiscounts)
        .catch(() => toast.error('Failed to load discounts'))
        .finally(() => setLoading(false))
    }, [productType])

    const resetForm = () => {
      setEditingDiscount(null)
      setFormProductId(''); setFormDiscountType('percentage')
      setFormDiscountValue(''); setFormMaxDiscount('')
      setFormStartsAt(''); setFormExpiresAt('')
      setFormIsActive(true); setShowForm(false)
    }

    const openEdit = (d: ProductDiscount) => {
      setEditingDiscount(d)
      setFormProductId(d.productId)
      setFormDiscountType(d.discountType)
      setFormDiscountValue(String(d.discountValue))
      setFormMaxDiscount(d.maxDiscountAmount ? String(d.maxDiscountAmount) : '')
      setFormStartsAt(d.startsAt ? d.startsAt.slice(0, 16) : '')
      setFormExpiresAt(d.expiresAt ? d.expiresAt.slice(0, 16) : '')
      setFormIsActive(d.isActive)
      setShowForm(true)
    }

    const handleSave = async () => {
      if (!formProductId.trim() || !formDiscountValue.trim()) {
        toast.error('Product ID and Discount Value are required'); return
      }
      const val = parseFloat(formDiscountValue)
      if (isNaN(val) || val <= 0) { toast.error('Discount value must be positive'); return }

      setSaving(true)
      try {
        const input: CreateProductDiscountInput = {
          productType: productType as ProductType,
          productId: formProductId.trim(),
          discountType: formDiscountType,
          discountValue: val,
          maxDiscountAmount: formMaxDiscount.trim() ? parseFloat(formMaxDiscount) : null,
          startsAt: formStartsAt ? new Date(formStartsAt).toISOString() : null,
          expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
          isActive: formIsActive,
        }

        if (editingDiscount) {
          const updated = await updateDiscount(editingDiscount.id, input)
          setDiscounts(prev => prev.map(d => d.id === updated.id ? updated : d))
          toast.success('Discount updated!')
        } else {
          const created = await createDiscount(input)
          setDiscounts(prev => [created, ...prev])
          toast.success('Discount created!')
        }
        resetForm()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save discount')
      } finally {
        setSaving(false)
      }
    }

    const handleToggle = async (d: ProductDiscount) => {
      try {
        const updated = await toggleDiscountActive(d.id, !d.isActive)
        setDiscounts(prev => prev.map(x => x.id === updated.id ? updated : x))
        toast.success(updated.isActive ? 'Discount enabled' : 'Discount disabled')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to toggle discount')
      }
    }

    const handleDelete = async () => {
      if (!deletingDiscount) return
      try {
        await deleteDiscount(deletingDiscount.id)
        setDiscounts(prev => prev.filter(d => d.id !== deletingDiscount.id))
        toast.success('Discount deleted')
      } finally {
        setDeletingDiscount(null)
      }
    }

    const filtered = discounts.filter(d =>
      !discSearch || d.productId.toLowerCase().includes(discSearch.toLowerCase())
    )

    const statusColor = (status: string) => ({
      Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      Disabled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    }[status] || 'bg-gray-100 text-gray-600')

    const label = productType === 'subject_bundle' ? 'Subject Bundle' : productType === 'resource_bundle' ? 'Resource Bundle' : productType === 'course' ? 'Course' : 'Resource'

    return (
      <div>
        <SectionHeader
          title={`${label} Discounts`}
          count={discounts.length}
          onAdd={() => { resetForm(); setShowForm(true) }}
          addLabel={`Add ${label} Discount`}
        />

        <SearchBar value={discSearch} onChange={setDiscSearch} placeholder={`Search by ${label.toLowerCase()} ID...`} />

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-muted" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-brand-muted text-sm">No discounts yet.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(d => {
              const status = getDiscountStatus(d)
              return (
                <div key={d.id} className="card p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-brand-text dark:text-brand-dark-text">{label} ID: {d.productId}</span>
                      <span className={`badge text-[10px] ${statusColor(status)}`}>{status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-brand-muted dark:text-brand-dark-muted">
                      <span className="font-mono font-bold text-primary-500">{formatDiscountLabel(d)}</span>
                      {d.maxDiscountAmount && <span>Max ₹{d.maxDiscountAmount}</span>}
                      {d.startsAt && <span>From {new Date(d.startsAt).toLocaleDateString()}</span>}
                      {d.expiresAt && <span>Until {new Date(d.expiresAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(d)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${d.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200' : 'bg-gray-100 dark:bg-white/10 text-brand-muted hover:bg-gray-200 dark:hover:bg-white/20'}`}
                    >
                      {d.isActive ? 'Active' : 'Disabled'}
                    </button>
                    <button onClick={() => openEdit(d)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => setDeletingDiscount(d)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add/Edit Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{editingDiscount ? 'Edit' : 'Add'} {label} Discount</h3>
                  <button onClick={resetForm} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><X size={18} /></button>
                </div>

                <div className="space-y-3">
                  <Field label={`${label} ID *`}>
                    <input value={formProductId} onChange={e => setFormProductId(e.target.value)} className={inputCls} placeholder={productType === 'course' ? 'e.g. 12 (the site_courses.id)' : 'e.g. 5 (the resources.id)'} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Discount Type *">
                      <select value={formDiscountType} onChange={e => setFormDiscountType(e.target.value as DiscountType)} className={inputCls}>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </Field>
                    <Field label={`Value (${formDiscountType === 'percentage' ? '%' : '₹'}) *`}>
                      <input type="number" min="0.01" step="0.01" value={formDiscountValue} onChange={e => setFormDiscountValue(e.target.value)} className={inputCls} placeholder={formDiscountType === 'percentage' ? '25' : '200'} />
                    </Field>
                  </div>
                  {formDiscountType === 'percentage' && (
                    <Field label="Max Discount Amount (₹) — Optional cap">
                      <input type="number" min="0" step="1" value={formMaxDiscount} onChange={e => setFormMaxDiscount(e.target.value)} className={inputCls} placeholder="e.g. 500" />
                    </Field>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Starts At (optional)">
                      <input type="datetime-local" value={formStartsAt} onChange={e => setFormStartsAt(e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Expires At (optional)">
                      <input type="datetime-local" value={formExpiresAt} onChange={e => setFormExpiresAt(e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} className="h-4 w-4 rounded" />
                    <span className="text-sm font-medium text-brand-text dark:text-brand-dark-text">Active immediately</span>
                  </label>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={resetForm} className="px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border text-sm font-semibold text-brand-muted hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2 transition-colors">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {editingDiscount ? 'Update Discount' : 'Create Discount'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirm */}
        <AnimatePresence>
          {deletingDiscount && (
            <DeleteModal
              title={`Discount for ${label} ${deletingDiscount.productId}`}
              itemType="discount"
              onConfirm={handleDelete}
              onCancel={() => setDeletingDiscount(null)}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── Coupons Section ────────────────────────────────────────────────────────
  function CouponsSection() {
    const [coupons, setCoupons] = useState<Coupon[]>([])
    const [loadingCoupons, setLoadingCoupons] = useState(true)
    const [couponSearch, setCouponSearch] = useState('')
    const [showCouponForm, setShowCouponForm] = useState(false)
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
    const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null)
    const [savingCoupon, setSavingCoupon] = useState(false)

    // Form state
    const [fCode, setFCode] = useState('')
    const [fDescription, setFDescription] = useState('')
    const [fDiscountType, setFDiscountType] = useState<DiscountType>('percentage')
    const [fDiscountValue, setFDiscountValue] = useState('')
    const [fMinOrder, setFMinOrder] = useState('0')
    const [fMaxDiscount, setFMaxDiscount] = useState('')
    const [fAllowOnDiscounted, setFAllowOnDiscounted] = useState(false)
    const [fStartsAt, setFStartsAt] = useState('')
    const [fExpiresAt, setFExpiresAt] = useState('')
    const [fUsageLimit, setFUsageLimit] = useState('')
    const [fPerUserLimit, setFPerUserLimit] = useState('1')
    const [fIsActive, setFIsActive] = useState(true)

    useEffect(() => {
      setLoadingCoupons(true)
      fetchAllCoupons()
        .then(setCoupons)
        .catch(() => toast.error('Failed to load coupons'))
        .finally(() => setLoadingCoupons(false))
    }, [])

    const resetCouponForm = () => {
      setEditingCoupon(null)
      setFCode(''); setFDescription(''); setFDiscountType('percentage')
      setFDiscountValue(''); setFMinOrder('0'); setFMaxDiscount('')
      setFAllowOnDiscounted(false); setFStartsAt(''); setFExpiresAt('')
      setFUsageLimit(''); setFPerUserLimit('1'); setFIsActive(true)
      setShowCouponForm(false)
    }

    const openEditCoupon = (c: Coupon) => {
      setEditingCoupon(c)
      setFCode(c.code); setFDescription(c.description)
      setFDiscountType(c.discountType); setFDiscountValue(String(c.discountValue))
      setFMinOrder(String(c.minimumOrderAmount)); setFMaxDiscount(c.maximumDiscountAmount ? String(c.maximumDiscountAmount) : '')
      setFAllowOnDiscounted(c.allowOnDiscounted)
      setFStartsAt(c.startsAt ? c.startsAt.slice(0, 16) : '')
      setFExpiresAt(c.expiresAt ? c.expiresAt.slice(0, 16) : '')
      setFUsageLimit(c.usageLimit ? String(c.usageLimit) : '')
      setFPerUserLimit(c.perUserLimit ? String(c.perUserLimit) : '1')
      setFIsActive(c.isActive)
      setShowCouponForm(true)
    }

    const handleSaveCoupon = async () => {
      if (!fCode.trim()) { toast.error('Coupon code is required'); return }
      const val = parseFloat(fDiscountValue)
      if (isNaN(val) || val <= 0) { toast.error('Discount value must be positive'); return }

      setSavingCoupon(true)
      try {
        const input: CreateCouponInput = {
          code: fCode.trim().toUpperCase(),
          description: fDescription,
          discountType: fDiscountType,
          discountValue: val,
          minimumOrderAmount: parseFloat(fMinOrder) || 0,
          maximumDiscountAmount: fMaxDiscount.trim() ? parseFloat(fMaxDiscount) : null,
          allowOnDiscounted: fAllowOnDiscounted,
          startsAt: fStartsAt ? new Date(fStartsAt).toISOString() : null,
          expiresAt: fExpiresAt ? new Date(fExpiresAt).toISOString() : null,
          usageLimit: fUsageLimit.trim() ? parseInt(fUsageLimit) : null,
          perUserLimit: parseInt(fPerUserLimit) || 1,
          isActive: fIsActive,
        }

        if (editingCoupon) {
          const updated = await updateCoupon(editingCoupon.id, input as UpdateCouponInput)
          setCoupons(prev => prev.map(c => c.id === updated.id ? updated : c))
          toast.success('Coupon updated!')
        } else {
          const created = await createCoupon(input)
          setCoupons(prev => [created, ...prev])
          toast.success(`Coupon "${created.code}" created!`)
        }
        resetCouponForm()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save coupon')
      } finally {
        setSavingCoupon(false)
      }
    }

    const handleToggleCoupon = async (c: Coupon) => {
      try {
        const updated = await toggleCouponActive(c.id, !c.isActive)
        setCoupons(prev => prev.map(x => x.id === updated.id ? updated : x))
        toast.success(updated.isActive ? 'Coupon enabled' : 'Coupon disabled')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to toggle coupon')
      }
    }

    const handleDeleteCoupon = async () => {
      if (!deletingCoupon) return
      try {
        await deleteCoupon(deletingCoupon.id)
        setCoupons(prev => prev.filter(c => c.id !== deletingCoupon.id))
        toast.success('Coupon deleted')
      } finally {
        setDeletingCoupon(null)
      }
    }

    const filteredCoupons = coupons.filter(c =>
      !couponSearch ||
      c.code.toLowerCase().includes(couponSearch.toLowerCase()) ||
      c.description.toLowerCase().includes(couponSearch.toLowerCase())
    )

    const statusColor: Record<CouponStatus, string> = {
      Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      Disabled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      Exhausted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    }

    return (
      <div>
        <SectionHeader title="Coupon Codes" count={coupons.length} onAdd={() => { resetCouponForm(); setShowCouponForm(true) }} addLabel="Create Coupon" />
        <SearchBar value={couponSearch} onChange={setCouponSearch} placeholder="Search by code or description..." />

        {loadingCoupons ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-muted" /></div>
        ) : filteredCoupons.length === 0 ? (
          <div className="text-center py-12 text-brand-muted text-sm">No coupons yet.</div>
        ) : (
          <div className="space-y-3">
            {filteredCoupons.map(c => {
              const status = getCouponStatus(c)
              return (
                <div key={c.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-black text-sm text-brand-text dark:text-brand-dark-text bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-lg">{c.code}</span>
                        <span className={`badge text-[10px] ${statusColor[status] || ''}`}>{status}</span>
                        <span className="text-xs font-bold text-primary-500">{formatCouponDiscount(c)}</span>
                      </div>
                      {c.description && <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-1">{c.description}</p>}
                      <div className="flex items-center gap-3 text-[11px] text-brand-muted dark:text-brand-dark-muted flex-wrap">
                        {c.minimumOrderAmount > 0 && <span>Min ₹{c.minimumOrderAmount}</span>}
                        {c.maximumDiscountAmount && <span>Max ₹{c.maximumDiscountAmount}</span>}
                        <span>Used {c.usedCount}/{c.usageLimit ?? '∞'}</span>
                        {c.perUserLimit && <span>Per user: {c.perUserLimit}x</span>}
                        {c.allowOnDiscounted && <span className="text-violet-500 font-medium">Stackable</span>}
                        {c.expiresAt && <span>Expires {new Date(c.expiresAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleCoupon(c)}
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors ${c.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-white/10 text-brand-muted'}`}
                      >
                        {c.isActive ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => openEditCoupon(c)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><Edit2 size={14} /></button>
                      <button onClick={() => setDeletingCoupon(c)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Create/Edit Coupon Modal */}
        <AnimatePresence>
          {showCouponForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4 my-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h3>
                  <button onClick={resetCouponForm} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><X size={18} /></button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Coupon Code *">
                      <input value={fCode} onChange={e => setFCode(e.target.value.toUpperCase())} className={inputCls + ' font-mono uppercase'} placeholder="SKILLS50" maxLength={50} />
                    </Field>
                    <Field label="Discount Type *">
                      <select value={fDiscountType} onChange={e => setFDiscountType(e.target.value as DiscountType)} className={inputCls}>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label={`Discount Value (${fDiscountType === 'percentage' ? '%' : '₹'}) *`}>
                      <input type="number" min="0.01" step="0.01" value={fDiscountValue} onChange={e => setFDiscountValue(e.target.value)} className={inputCls} placeholder={fDiscountType === 'percentage' ? '25' : '200'} />
                    </Field>
                    <Field label="Min Order Amount (₹)">
                      <input type="number" min="0" step="1" value={fMinOrder} onChange={e => setFMinOrder(e.target.value)} className={inputCls} placeholder="0" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {fDiscountType === 'percentage' && (
                      <Field label="Max Discount (₹) cap">
                        <input type="number" min="0" step="1" value={fMaxDiscount} onChange={e => setFMaxDiscount(e.target.value)} className={inputCls} placeholder="500" />
                      </Field>
                    )}
                    <Field label="Total Usage Limit">
                      <input type="number" min="1" step="1" value={fUsageLimit} onChange={e => setFUsageLimit(e.target.value)} className={inputCls} placeholder="Unlimited" />
                    </Field>
                    <Field label="Per User Limit">
                      <input type="number" min="1" step="1" value={fPerUserLimit} onChange={e => setFPerUserLimit(e.target.value)} className={inputCls} placeholder="1" />
                    </Field>
                  </div>

                  <Field label="Description">
                    <input value={fDescription} onChange={e => setFDescription(e.target.value)} className={inputCls} placeholder="e.g. 25% off all courses — festive sale" />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Valid From (optional)">
                      <input type="datetime-local" value={fStartsAt} onChange={e => setFStartsAt(e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Expires At (optional)">
                      <input type="datetime-local" value={fExpiresAt} onChange={e => setFExpiresAt(e.target.value)} className={inputCls} />
                    </Field>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={fIsActive} onChange={e => setFIsActive(e.target.checked)} className="h-4 w-4 rounded" />
                      <span className="text-sm font-medium text-brand-text dark:text-brand-dark-text">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={fAllowOnDiscounted} onChange={e => setFAllowOnDiscounted(e.target.checked)} className="h-4 w-4 rounded" />
                      <span className="text-sm font-medium text-brand-text dark:text-brand-dark-text">Allow stacking with product discounts</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={resetCouponForm} className="px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border text-sm font-semibold text-brand-muted hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
                  <button onClick={handleSaveCoupon} disabled={savingCoupon} className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2 transition-colors">
                    {savingCoupon ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {deletingCoupon && (
            <DeleteModal
              title={deletingCoupon.code}
              itemType="coupon"
              onConfirm={handleDeleteCoupon}
              onCancel={() => setDeletingCoupon(null)}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── Coupon Usage Section ────────────────────────────────────────────────────
  function CouponUsageSection() {
    const [redemptions, setRedemptions] = useState<CouponRedemption[]>([])
    const [loadingRedemptions, setLoadingRedemptions] = useState(true)
    const [redemptionSearch, setRedemptionSearch] = useState('')

    useEffect(() => {
      setLoadingRedemptions(true)
      fetchAllCouponRedemptionsWithDetails()
        .then(setRedemptions)
        .catch(() => toast.error('Failed to load coupon usage data'))
        .finally(() => setLoadingRedemptions(false))
    }, [])

    const filteredRedemptions = redemptions.filter(r =>
      !redemptionSearch ||
      (r.couponCode?.toLowerCase().includes(redemptionSearch.toLowerCase())) ||
      (r.userId?.toLowerCase().includes(redemptionSearch.toLowerCase()))
    )

    const totalSaved = redemptions.reduce((sum, r) => sum + r.discountAmount, 0)

    return (
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Coupon Usage</h2>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
              {redemptions.length} redemptions · Total savings issued: ₹{totalSaved.toLocaleString('en-IN')}
            </p>
          </div>
          <button
            onClick={() => {
              setLoadingRedemptions(true)
              fetchAllCouponRedemptionsWithDetails()
                .then(setRedemptions)
                .finally(() => setLoadingRedemptions(false))
            }}
            className="flex items-center gap-2 text-xs font-semibold text-brand-muted hover:text-brand-text transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <SearchBar value={redemptionSearch} onChange={setRedemptionSearch} placeholder="Search by coupon code or user ID..." />

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Redemptions', value: redemptions.length, color: 'text-primary-500' },
            { label: 'Total Savings Issued', value: `₹${totalSaved.toLocaleString('en-IN')}`, color: 'text-green-500' },
            { label: 'Unique Coupons Used', value: new Set(redemptions.map(r => r.couponId)).size, color: 'text-violet-500' },
            { label: 'Unique Users', value: new Set(redemptions.map(r => r.userId)).size, color: 'text-amber-500' },
          ].map(stat => (
            <div key={stat.label} className="card p-4">
              <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-1">{stat.label}</p>
              <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {loadingRedemptions ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-muted" /></div>
        ) : filteredRedemptions.length === 0 ? (
          <div className="text-center py-12 text-brand-muted text-sm">No coupon redemptions yet.</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border dark:border-brand-dark-border">
                  <th className="px-4 py-3 text-left text-xs font-bold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider">Coupon</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider">User ID</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider">Saved</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {filteredRedemptions.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-violet-600 dark:text-violet-400 text-xs bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded">
                        {r.couponCode || r.couponId.slice(0, 8) + '…'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-muted dark:text-brand-dark-muted">
                      {r.productType} #{r.productId}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-brand-muted dark:text-brand-dark-muted truncate max-w-[120px]">
                      {r.userId.slice(0, 12)}…
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-green-600 dark:text-green-400">
                      −₹{r.discountAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-brand-text dark:text-brand-dark-text">
                      ₹{r.finalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-muted dark:text-brand-dark-muted">
                      {new Date(r.redeemedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // ── Subject Bundles Section ───────────────────────────────────────────────
  function SubjectBundlesSection() {
    const [bundles, setBundles] = useState<SubjectBundle[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

    // Modals
    const [showBundleModal, setShowBundleModal] = useState(false)
    const [editingBundle, setEditingBundle] = useState<SubjectBundle | null>(null)
    const [deletingBundle, setDeletingBundle] = useState<SubjectBundle | null>(null)
    const [curriculumBundle, setCurriculumBundle] = useState<SubjectBundle | null>(null)

    // Form fields for Bundle modal
    const [formSubjectId, setFormSubjectId] = useState<number | null>(null)
    const [formSixMonthPrice, setFormSixMonthPrice] = useState('499')
    const [formLifetimePrice, setFormLifetimePrice] = useState('999')
    const [formSixMonthEnabled, setFormSixMonthEnabled] = useState(true)
    const [formLifetimeEnabled, setFormLifetimeEnabled] = useState(true)
    const [formIsActive, setFormIsActive] = useState(true)
    const [formThumbnailUrl, setFormThumbnailUrl] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formThumbFile, setFormThumbFile] = useState<File | null>(null)
    const [formThumbPreview, setFormThumbPreview] = useState<string | null>(null)
    const [savingBundle, setSavingBundle] = useState(false)

    // Available subjects for dropdown
    const [subjectOptions, setSubjectOptions] = useState<any[]>([])
    const [loadingSubjects, setLoadingSubjects] = useState(false)
    const [subjectSearchQuery, setSubjectSearchQuery] = useState('')

    // Curriculum manager state
    const [curriculumUnits, setCurriculumUnits] = useState<SubjectUnit[]>([])
    const [curriculumVideos, setCurriculumVideos] = useState<SubjectVideo[]>([])
    const [curriculumResources, setCurriculumResources] = useState<SubjectUnitResource[]>([])
    const [loadingCurriculum, setLoadingCurriculum] = useState(false)
    const [activeCurriculumUnitId, setActiveCurriculumUnitId] = useState<string | null>(null)

    // Unit modal
    const [showUnitModal, setShowUnitModal] = useState(false)
    const [editingUnit, setEditingUnit] = useState<SubjectUnit | null>(null)
    const [unitNumber, setUnitNumber] = useState(1)
    const [unitTitle, setUnitTitle] = useState('')
    const [unitDescription, setUnitDescription] = useState('')
    const [savingUnit, setSavingUnit] = useState(false)

    // Video modal
    const [showVideoModal, setShowVideoModal] = useState(false)
    const [editingVideo, setEditingVideo] = useState<SubjectVideo | null>(null)
    const [videoTitle, setVideoTitle] = useState('')
    const [videoDescription, setVideoDescription] = useState('')
    const [videoUrl, setVideoUrl] = useState('')
    const [videoDuration, setVideoDuration] = useState('')
    const [videoSortOrder, setVideoSortOrder] = useState(0)
    const [videoIsFreePreview, setVideoIsFreePreview] = useState(false)
    const [savingVideo, setSavingVideo] = useState(false)

    const loadBundles = useCallback(async () => {
      setLoading(true)
      try {
        const data = await fetchAllSubjectBundles()
        setBundles(data)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load subject bundles')
      } finally {
        setLoading(false)
      }
    }, [])

    useEffect(() => {
      loadBundles()
    }, [loadBundles])

    const openCreateModal = async () => {
      setEditingBundle(null)
      setFormSubjectId(null)
      setFormSixMonthPrice('499')
      setFormLifetimePrice('999')
      setFormSixMonthEnabled(true)
      setFormLifetimeEnabled(true)
      setFormIsActive(true)
      setFormThumbnailUrl('')
      setFormDescription('')
      setFormThumbFile(null)
      setFormThumbPreview(null)
      setSubjectSearchQuery('')
      setShowBundleModal(true)

      if (subjectOptions.length === 0) {
        setLoadingSubjects(true)
        try {
          const list = await fetchAllSubjectsWithDetails()
          setSubjectOptions(list)
        } catch {
          toast.error('Failed to load subjects list')
        } finally {
          setLoadingSubjects(false)
        }
      }
    }

    const openEditModal = (b: SubjectBundle) => {
      setEditingBundle(b)
      setFormSubjectId(b.subjectId)
      setFormSixMonthPrice(String(b.sixMonthPrice))
      setFormLifetimePrice(String(b.lifetimePrice))
      setFormSixMonthEnabled(b.sixMonthEnabled)
      setFormLifetimeEnabled(b.lifetimeEnabled)
      setFormIsActive(b.isActive)
      setFormThumbnailUrl(b.thumbnailUrl || '')
      setFormDescription(b.description || '')
      setFormThumbFile(null)
      setFormThumbPreview(b.thumbnailUrl || null)
      setShowBundleModal(true)
    }

    const handleSaveBundle = async () => {
      if (!formSubjectId) {
        toast.error('Please select a subject')
        return
      }
      const smPrice = parseFloat(formSixMonthPrice)
      const ltPrice = parseFloat(formLifetimePrice)

      if (isNaN(smPrice) || smPrice < 0 || isNaN(ltPrice) || ltPrice < 0) {
        toast.error('Prices must be non-negative numbers')
        return
      }
      if (!formSixMonthEnabled && !formLifetimeEnabled) {
        toast.error('At least one plan (6-Month or Lifetime) must be enabled')
        return
      }

      setSavingBundle(true)
      try {
        let finalThumbnailUrl = formThumbnailUrl.trim()
        if (formThumbFile) {
          const cleanName = formThumbFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
          const path = `bundle_${Date.now()}_${cleanName}`
          finalThumbnailUrl = await uploadCourseThumbnail(formThumbFile, path)
        }

        if (editingBundle) {
          const updated = await updateSubjectBundle(editingBundle.id, {
            sixMonthPrice: smPrice,
            lifetimePrice: ltPrice,
            sixMonthEnabled: formSixMonthEnabled,
            lifetimeEnabled: formLifetimeEnabled,
            isActive: formIsActive,
            thumbnailUrl: finalThumbnailUrl || undefined,
            description: formDescription.trim() || null,
          })
          setBundles(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b))
          toast.success('Subject bundle updated!')
        } else {
          const created = await createSubjectBundle({
            subjectId: formSubjectId,
            sixMonthPrice: smPrice,
            lifetimePrice: ltPrice,
            sixMonthEnabled: formSixMonthEnabled,
            lifetimeEnabled: formLifetimeEnabled,
            isActive: formIsActive,
            thumbnailUrl: finalThumbnailUrl || undefined,
            description: formDescription.trim() || null,
          })
          setBundles(prev => [created, ...prev])
          toast.success('Subject bundle created!')
        }
        setShowBundleModal(false)
        await loadBundles()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save subject bundle')
      } finally {
        setSavingBundle(false)
      }
    }

    const handleToggleActive = async (b: SubjectBundle) => {
      try {
        const next = !b.isActive
        await toggleSubjectBundleActive(b.id, next)
        setBundles(prev => prev.map(x => x.id === b.id ? { ...x, isActive: next } : x))
        toast.success(next ? 'Bundle activated' : 'Bundle deactivated')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to toggle bundle status')
      }
    }

    const handleDeleteBundle = async () => {
      if (!deletingBundle) return
      try {
        await deleteSubjectBundle(deletingBundle.id)
        setBundles(prev => prev.filter(b => b.id !== deletingBundle.id))
        toast.success('Subject bundle deleted')
        setDeletingBundle(null)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete bundle')
      }
    }

    // Load curriculum for subject
    const openCurriculumManager = async (b: SubjectBundle) => {
      setCurriculumBundle(b)
      setLoadingCurriculum(true)
      setActiveCurriculumUnitId(null)
      try {
        const curr = await fetchSubjectCurriculum(b.subjectId)
        setCurriculumUnits(curr.units)
        setCurriculumVideos(curr.videos)
        setCurriculumResources(curr.resources)
        if (curr.units.length > 0) {
          setActiveCurriculumUnitId(curr.units[0].id)
        }
      } catch {
        toast.error('Failed to load subject curriculum')
      } finally {
        setLoadingCurriculum(false)
      }
    }

    const reloadCurriculum = async () => {
      if (!curriculumBundle) return
      try {
        const curr = await fetchSubjectCurriculum(curriculumBundle.subjectId)
        setCurriculumUnits(curr.units)
        setCurriculumVideos(curr.videos)
        setCurriculumResources(curr.resources)
        if (!activeCurriculumUnitId && curr.units.length > 0) {
          setActiveCurriculumUnitId(curr.units[0].id)
        }
      } catch (err) {
        console.error('Failed to reload curriculum:', err)
      }
    }

    const handleSaveUnit = async () => {
      if (!curriculumBundle || !unitTitle.trim()) {
        toast.error('Unit title is required')
        return
      }
      setSavingUnit(true)
      try {
        if (editingUnit) {
          await updateSubjectUnit(editingUnit.id, {
            unitNumber,
            title: unitTitle.trim(),
            description: unitDescription.trim(),
          })
          toast.success('Unit updated')
        } else {
          const newUnit = await createSubjectUnit({
            subjectId: curriculumBundle.subjectId,
            unitNumber,
            title: unitTitle.trim(),
            description: unitDescription.trim(),
          })
          setActiveCurriculumUnitId(newUnit.id)
          toast.success('Unit created')
        }
        setShowUnitModal(false)
        await reloadCurriculum()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save unit')
      } finally {
        setSavingUnit(false)
      }
    }

    const handleDeleteUnit = async (uId: string) => {
      if (!window.confirm('Delete this unit and all its lecture videos?')) return
      try {
        await deleteSubjectUnit(uId)
        toast.success('Unit deleted')
        if (activeCurriculumUnitId === uId) setActiveCurriculumUnitId(null)
        await reloadCurriculum()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete unit')
      }
    }

    const handleSaveVideo = async () => {
      if (!curriculumBundle || !activeCurriculumUnitId || !videoTitle.trim() || !videoUrl.trim()) {
        toast.error('Lecture title and Video URL are required')
        return
      }
      setSavingVideo(true)
      try {
        if (editingVideo) {
          await updateSubjectVideo(editingVideo.id, {
            title: videoTitle.trim(),
            description: videoDescription.trim(),
            videoUrl: videoUrl.trim(),
            duration: videoDuration.trim(),
            sortOrder: videoSortOrder,
            isFreePreview: videoIsFreePreview,
            unitId: activeCurriculumUnitId,
          })
          toast.success('Lecture updated')
        } else {
          await createSubjectVideo({
            subjectId: curriculumBundle.subjectId,
            unitId: activeCurriculumUnitId,
            title: videoTitle.trim(),
            description: videoDescription.trim(),
            videoUrl: videoUrl.trim(),
            duration: videoDuration.trim(),
            sortOrder: videoSortOrder,
            isFreePreview: videoIsFreePreview,
          })
          toast.success('Lecture video added')
        }
        setShowVideoModal(false)
        await reloadCurriculum()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save video')
      } finally {
        setSavingVideo(false)
      }
    }

    const handleDeleteVideo = async (vId: string) => {
      if (!window.confirm('Delete this lecture video?')) return
      try {
        await deleteSubjectVideo(vId)
        toast.success('Lecture deleted')
        await reloadCurriculum()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete video')
      }
    }

    // Filter bundles
    const filteredBundles = bundles.filter(b => {
      const q = search.toLowerCase()
      const matchesSearch = !q ||
        (b.subjectName?.toLowerCase() || '').includes(q) ||
        (b.subjectCode?.toLowerCase() || '').includes(q) ||
        (b.branchName?.toLowerCase() || '').includes(q) ||
        (b.collegeName?.toLowerCase() || '').includes(q)

      const matchesStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? b.isActive :
        !b.isActive

      return matchesSearch && matchesStatus
    })

    // Aggregates
    const totalBundles = bundles.length
    const activeBundles = bundles.filter(b => b.isActive).length
    const totalPurchasers = bundles.reduce((acc, b) => acc + (b.totalPurchases || 0), 0)
    const totalRevenue = bundles.reduce((acc, b) => acc + (b.totalRevenue || 0), 0)

    const activeUnit = curriculumUnits.find(u => u.id === activeCurriculumUnitId)
    const activeUnitVideos = curriculumVideos.filter(v => v.unitId === activeCurriculumUnitId)
    const activeUnitResources = curriculumResources.filter(r => r.unitId === activeCurriculumUnitId)

    const availableSubjectList = subjectOptions.filter(s => {
      if (!subjectSearchQuery.trim()) return true
      const q = subjectSearchQuery.toLowerCase()
      const sName = (s.name || '').toLowerCase()
      const sCode = (s.code || '').toLowerCase()
      const crsName = (s.semesters?.branches?.courses?.name || '').toLowerCase()
      const brName = (s.semesters?.branches?.name || '').toLowerCase()
      return sName.includes(q) || sCode.includes(q) || crsName.includes(q) || brName.includes(q)
    })

    return (
      <div className="space-y-6">
        <SectionHeader
          title="Subject Bundles"
          count={bundles.length}
          onAdd={openCreateModal}
          addLabel="Create Subject Bundle"
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Bundles', value: totalBundles, color: 'text-brand-text dark:text-brand-dark-text' },
            { label: 'Active Bundles', value: activeBundles, color: 'text-emerald-500' },
            { label: 'Active Students', value: totalPurchasers, color: 'text-primary-500' },
            { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: 'text-violet-500' },
          ].map(stat => (
            <div key={stat.label} className="card p-4">
              <p className="text-xs text-brand-muted dark:text-brand-dark-muted font-medium">{stat.label}</p>
              <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search subjects, codes, colleges..."
          />
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Table of Bundles */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="animate-spin text-primary-500" />
          </div>
        ) : filteredBundles.length === 0 ? (
          <div className="card p-12 text-center text-sm text-brand-muted">
            <Package size={40} className="mx-auto mb-3 opacity-30 text-primary-500" />
            <p className="font-semibold text-brand-text dark:text-brand-dark-text">No Subject Bundles found</p>
            <p className="text-xs mt-1">Create your first subject bundle to offer 6-Month and Lifetime complete curriculum access.</p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-xl text-xs font-bold hover:bg-primary-600 transition-colors"
            >
              Create Subject Bundle
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-brand-border dark:border-brand-dark-border">
                  <tr>
                    {['Subject & Academic Path', '6-Month Plan', 'Lifetime Plan', 'Status', 'Sales & Revenue', 'Actions'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                  {filteredBundles.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      {/* Subject info */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {b.thumbnailUrl ? (
                            <img
                              src={b.thumbnailUrl}
                              alt={b.subjectName || 'Bundle'}
                              className="w-10 h-10 rounded-xl object-cover border border-brand-border dark:border-brand-dark-border flex-shrink-0 shadow-xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary-200/50">
                              <BookOpen size={18} />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-brand-text dark:text-brand-dark-text">
                              {b.subjectName || `Subject #${b.subjectId}`}
                            </p>
                            <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted flex items-center gap-1.5 flex-wrap mt-0.5">
                              {b.subjectCode && (
                                <span className="font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-semibold text-[10px]">
                                  {b.subjectCode}
                                </span>
                              )}
                              <span>
                                {[b.collegeName, b.academicCourseName, b.branchName, b.semesterNumber != null ? `Sem ${b.semesterNumber}` : null]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 6-Month Plan */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span className="font-bold text-brand-text dark:text-brand-dark-text text-sm">
                            ₹{b.sixMonthPrice}
                          </span>
                          <div>
                            {b.sixMonthEnabled ? (
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                                Enabled
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400">
                                Disabled
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Lifetime Plan */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span className="font-bold text-brand-text dark:text-brand-dark-text text-sm">
                            ₹{b.lifetimePrice}
                          </span>
                          <div>
                            {b.lifetimeEnabled ? (
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400">
                                Enabled
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400">
                                Disabled
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleActive(b)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                            b.isActive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${b.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {b.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Sales Stats */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5 text-xs">
                          <p className="font-bold text-brand-text dark:text-brand-dark-text">
                            {b.activePurchases ?? 0} active users
                          </p>
                          <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted font-medium">
                            {b.totalPurchases ?? 0} sales · ₹{(b.totalRevenue ?? 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openCurriculumManager(b)}
                            className="px-2.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Manage Units & Video Lectures"
                          >
                            <Layers size={13} /> Curriculum
                          </button>
                          <button
                            onClick={() => openEditModal(b)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted hover:text-brand-text transition-colors"
                            title="Edit Pricing & Plans"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingBundle(b)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors"
                            title="Delete Bundle"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Modal: Create / Edit Subject Bundle ─────────────────────────── */}
        <AnimatePresence>
          {showBundleModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => !savingBundle && setShowBundleModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-brand-border dark:border-brand-dark-border pb-4">
                  <div className="flex items-center gap-2.5">
                    <Package className="text-primary-500" size={20} />
                    <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">
                      {editingBundle ? 'Edit Subject Bundle' : 'Create Subject Bundle'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowBundleModal(false)}
                    className="p-1.5 rounded-lg text-brand-muted hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Subject Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-1.5">
                    Subject *
                  </label>
                  {editingBundle ? (
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border">
                      <p className="font-bold text-sm text-brand-text dark:text-brand-dark-text">
                        {editingBundle.subjectName}
                      </p>
                      <p className="text-xs text-brand-muted mt-0.5">
                        {editingBundle.subjectCode} · {[editingBundle.collegeName, editingBundle.academicCourseName, editingBundle.branchName].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        value={subjectSearchQuery}
                        onChange={e => setSubjectSearchQuery(e.target.value)}
                        placeholder="Search subject by name or code..."
                        className={inputCls}
                      />
                      <select
                        value={formSubjectId ?? ''}
                        onChange={e => setFormSubjectId(e.target.value ? Number(e.target.value) : null)}
                        className={inputCls}
                      >
                        <option value="">-- Select Subject ({availableSubjectList.length} available) --</option>
                        {availableSubjectList.map(s => {
                          const crs = s.semesters?.branches?.courses?.name
                          const sem = s.semesters?.semester_number
                          const br = s.semesters?.branches?.name
                          return (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.code || 'NO-CODE'}) {crs ? `— ${crs} ${br ? `· ${br}` : ''} Sem ${sem}` : ''}
                            </option>
                          )
                        })}
                      </select>
                      {loadingSubjects && (
                        <p className="text-xs text-primary-500 flex items-center gap-1.5">
                          <Loader2 size={12} className="animate-spin" /> Loading subjects from catalog...
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bundle Thumbnail */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted">
                    Bundle Thumbnail
                  </label>
                  <div className="flex items-center gap-3.5 p-3 rounded-xl border border-brand-border dark:border-brand-dark-border bg-gray-50/60 dark:bg-white/5">
                    {/* Thumbnail preview */}
                    <div className="w-24 h-16 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card flex items-center justify-center overflow-hidden flex-shrink-0 relative group shadow-xs">
                      {formThumbPreview ? (
                        <img
                          src={formThumbPreview}
                          alt="Bundle thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-brand-muted p-1 text-center">
                          <ImageIcon size={20} className="opacity-40 mb-0.5" />
                          <span className="text-[9px]">No image</span>
                        </div>
                      )}
                      {formThumbPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormThumbFile(null)
                            setFormThumbnailUrl('')
                            setFormThumbPreview(null)
                          }}
                          className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold cursor-pointer"
                          title="Remove thumbnail"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* File upload + URL input */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 hover:bg-primary-100 text-xs font-semibold cursor-pointer transition-colors border border-primary-200 dark:border-primary-800/40">
                        <Upload size={12} />
                        <span className="truncate max-w-[170px]">
                          {formThumbFile ? formThumbFile.name : formThumbPreview ? 'Change Thumbnail File' : 'Upload Thumbnail File'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setFormThumbFile(file)
                              setFormThumbPreview(URL.createObjectURL(file))
                            }
                          }}
                        />
                      </label>
                      <input
                        type="url"
                        value={formThumbnailUrl}
                        onChange={e => {
                          setFormThumbnailUrl(e.target.value)
                          if (!formThumbFile) {
                            setFormThumbPreview(e.target.value.trim() || null)
                          }
                        }}
                        placeholder="Or paste image URL (https://...)"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-card text-brand-text dark:text-brand-dark-text placeholder:text-brand-muted"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-brand-muted">
                    16:9 banner (e.g. 1280×720 or 640×360) displayed on course cards and bundle details page.
                  </p>
                </div>

                {/* Bundle Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted">
                      Bundle Description
                    </label>
                    <span className="text-[10px] text-brand-muted">Optional</span>
                  </div>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Enter custom curriculum summary, highlights, or leave empty for default description..."
                    className={inputCls + ' resize-none'}
                  />
                  <p className="text-[11px] text-brand-muted">
                    Displays below the subject title on the public course & bundle overview page.
                  </p>
                </div>

                {/* 6-Month Plan */}
                <div className="p-4 rounded-xl border border-brand-border dark:border-brand-dark-border bg-gray-50/50 dark:bg-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-text dark:text-brand-dark-text">
                      6-Month Plan
                    </span>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSixMonthEnabled}
                        onChange={e => setFormSixMonthEnabled(e.target.checked)}
                        className="rounded text-primary-500 focus:ring-primary-500"
                      />
                      Enable Plan
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-brand-muted mb-1">Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formSixMonthPrice}
                      onChange={e => setFormSixMonthPrice(e.target.value)}
                      disabled={!formSixMonthEnabled}
                      className={inputCls}
                      placeholder="499"
                    />
                  </div>
                </div>

                {/* Lifetime Plan */}
                <div className="p-4 rounded-xl border border-brand-border dark:border-brand-dark-border bg-gray-50/50 dark:bg-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-text dark:text-brand-dark-text">
                      Lifetime Plan
                    </span>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formLifetimeEnabled}
                        onChange={e => setFormLifetimeEnabled(e.target.checked)}
                        className="rounded text-primary-500 focus:ring-primary-500"
                      />
                      Enable Plan
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-brand-muted mb-1">Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formLifetimePrice}
                      onChange={e => setFormLifetimePrice(e.target.value)}
                      disabled={!formLifetimeEnabled}
                      className={inputCls}
                      placeholder="999"
                    />
                  </div>
                </div>

                {/* Bundle Status */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={e => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-brand-text dark:text-brand-dark-text">Bundle Active</p>
                    <p className="text-xs text-brand-muted">Visible for students to purchase on Courses & Subject Bundle pages</p>
                  </div>
                </label>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowBundleModal(false)}
                    disabled={savingBundle}
                    className="flex-1 py-2.5 rounded-xl border border-brand-border text-sm font-semibold hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBundle}
                    disabled={savingBundle}
                    className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 flex items-center justify-center gap-2"
                  >
                    {savingBundle && <Loader2 size={14} className="animate-spin" />}
                    {editingBundle ? 'Update Bundle' : 'Create Bundle'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Modal: Curriculum Manager (Units & Videos) ────────────────── */}
        <AnimatePresence>
          {curriculumBundle && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setCurriculumBundle(null)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-4xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-brand-border dark:border-brand-dark-border pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers className="text-primary-500" size={20} />
                      <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">
                        Curriculum: {curriculumBundle.subjectName}
                      </h3>
                      {curriculumBundle.subjectCode && (
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-bold">
                          {curriculumBundle.subjectCode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brand-muted mt-1">
                      {[curriculumBundle.collegeName, curriculumBundle.academicCourseName, curriculumBundle.branchName, curriculumBundle.semesterNumber != null ? `Sem ${curriculumBundle.semesterNumber}` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button
                    onClick={() => setCurriculumBundle(null)}
                    className="p-1.5 rounded-lg text-brand-muted hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    <X size={18} />
                  </button>
                </div>

                {loadingCurriculum ? (
                  <div className="flex justify-center py-16">
                    <Loader2 size={32} className="animate-spin text-primary-500" />
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Unit Tabs & Add Unit */}
                    <div className="flex items-center justify-between gap-3 overflow-x-auto pb-2 border-b border-brand-border dark:border-brand-dark-border">
                      <div className="flex items-center gap-2 overflow-x-auto">
                        {curriculumUnits.map(u => (
                          <button
                            key={u.id}
                            onClick={() => setActiveCurriculumUnitId(u.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                              activeCurriculumUnitId === u.id
                                ? 'bg-primary-500 text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-white/5 text-brand-text dark:text-brand-dark-text hover:bg-gray-200'
                            }`}
                          >
                            <span>Unit {u.unitNumber}</span>
                            <span className="text-[10px] opacity-75">
                              ({curriculumVideos.filter(v => v.unitId === u.id).length})
                            </span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setEditingUnit(null)
                          setUnitNumber(curriculumUnits.length + 1)
                          setUnitTitle('')
                          setUnitDescription('')
                          setShowUnitModal(true)
                        }}
                        className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 text-xs font-bold hover:bg-gray-200 flex items-center gap-1 text-primary-600 dark:text-primary-400"
                      >
                        <Plus size={14} /> Add Unit
                      </button>
                    </div>

                    {/* Active Unit Details */}
                    {activeUnit ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-primary-500">
                              Unit {activeUnit.unitNumber}
                            </p>
                            <h4 className="text-base font-bold text-brand-text dark:text-brand-dark-text mt-0.5">
                              {activeUnit.title}
                            </h4>
                            {activeUnit.description && (
                              <p className="text-xs text-brand-muted mt-1">{activeUnit.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingUnit(activeUnit)
                                setUnitNumber(activeUnit.unitNumber)
                                setUnitTitle(activeUnit.title)
                                setUnitDescription(activeUnit.description || '')
                                setShowUnitModal(true)
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-brand-muted"
                              title="Edit Unit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteUnit(activeUnit.id)}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-red-500"
                              title="Delete Unit"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Lecture Videos in this unit */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-brand-text dark:text-brand-dark-text flex items-center gap-1.5">
                              <Video size={14} className="text-primary-500" />
                              Lecture Videos ({activeUnitVideos.length})
                            </h5>
                            <button
                              onClick={() => {
                                setEditingVideo(null)
                                setVideoTitle('')
                                setVideoDescription('')
                                setVideoUrl('')
                                setVideoDuration('')
                                setVideoSortOrder(activeUnitVideos.length + 1)
                                setVideoIsFreePreview(false)
                                setShowVideoModal(true)
                              }}
                              className="px-2.5 py-1 rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 text-xs font-bold flex items-center gap-1 hover:bg-primary-100"
                            >
                              <Plus size={13} /> Add Lecture
                            </button>
                          </div>

                          {activeUnitVideos.length === 0 ? (
                            <div className="p-6 rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-center text-xs text-brand-muted">
                              No video lectures added to this unit yet.
                            </div>
                          ) : (
                            <div className="divide-y divide-brand-border dark:divide-brand-dark-border border border-brand-border dark:border-brand-dark-border rounded-xl overflow-hidden">
                              {activeUnitVideos.map(v => (
                                <div key={v.id} className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 flex items-center justify-center flex-shrink-0">
                                      <PlayCircle size={18} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-brand-text dark:text-brand-dark-text truncate">
                                        {v.title}
                                      </p>
                                      <p className="text-[11px] text-brand-muted flex items-center gap-2 mt-0.5">
                                        {v.duration && <span>{v.duration}</span>}
                                        {v.isFreePreview && (
                                          <span className="px-1.5 py-0.2 rounded bg-green-100 text-green-700 text-[10px] font-bold">
                                            Free Preview
                                          </span>
                                        )}
                                        <span className="font-mono text-[10px] truncate max-w-[200px] opacity-70">
                                          {v.videoUrl}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                      onClick={() => {
                                        setEditingVideo(v)
                                        setVideoTitle(v.title)
                                        setVideoDescription(v.description || '')
                                        setVideoUrl(v.videoUrl)
                                        setVideoDuration(v.duration || '')
                                        setVideoSortOrder(v.sortOrder)
                                        setVideoIsFreePreview(v.isFreePreview)
                                        setShowVideoModal(true)
                                      }}
                                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"
                                      title="Edit Lecture"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteVideo(v.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500"
                                      title="Delete Lecture"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Associated Notes & Resources for this unit */}
                        {activeUnitResources.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-brand-text dark:text-brand-dark-text flex items-center gap-1.5">
                              <FileText size={14} className="text-violet-500" />
                              Associated Notes & Resources ({activeUnitResources.length})
                            </h5>
                            <div className="divide-y divide-brand-border dark:divide-brand-dark-border border border-brand-border dark:border-brand-dark-border rounded-xl overflow-hidden">
                              {activeUnitResources.map(r => (
                                <div key={r.id} className="p-3 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <FileText size={15} className="text-brand-muted" />
                                    <span className="font-bold text-brand-text dark:text-brand-dark-text">{r.title}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-medium">
                                      {r.typeName}
                                    </span>
                                  </div>
                                  <span className="text-brand-muted text-[11px]">{r.downloads} downloads</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-12 text-center text-xs text-brand-muted border border-dashed rounded-xl">
                        No units created yet. Click "+ Add Unit" above to add Unit 1.
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Modal: Add / Edit Unit ──────────────────────────────────────── */}
        <AnimatePresence>
          {showUnitModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4"
              onClick={() => !savingUnit && setShowUnitModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b pb-3 border-brand-border">
                  <h4 className="font-bold text-brand-text dark:text-brand-dark-text text-sm">
                    {editingUnit ? 'Edit Unit' : 'Add New Unit'}
                  </h4>
                  <button onClick={() => setShowUnitModal(false)} className="text-brand-muted">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1">Unit Number</label>
                    <input
                      type="number"
                      min="1"
                      value={unitNumber}
                      onChange={e => setUnitNumber(Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1">Unit Title *</label>
                    <input
                      value={unitTitle}
                      onChange={e => setUnitTitle(e.target.value)}
                      placeholder="e.g. Unit 1: Introduction to Data Structures"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1">Description (Optional)</label>
                    <textarea
                      value={unitDescription}
                      onChange={e => setUnitDescription(e.target.value)}
                      placeholder="Topics covered in this unit..."
                      rows={3}
                      className={inputCls + ' resize-none'}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowUnitModal(false)}
                    disabled={savingUnit}
                    className="flex-1 py-2 rounded-xl border border-brand-border text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveUnit}
                    disabled={savingUnit}
                    className="flex-1 py-2 rounded-xl bg-primary-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    {savingUnit && <Loader2 size={12} className="animate-spin" />}
                    {editingUnit ? 'Update Unit' : 'Create Unit'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Modal: Add / Edit Video ─────────────────────────────────────── */}
        <AnimatePresence>
          {showVideoModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4"
              onClick={() => !savingVideo && setShowVideoModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b pb-3 border-brand-border">
                  <h4 className="font-bold text-brand-text dark:text-brand-dark-text text-sm">
                    {editingVideo ? 'Edit Lecture Video' : 'Add Lecture Video'}
                  </h4>
                  <button onClick={() => setShowVideoModal(false)} className="text-brand-muted">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1">Lecture Title *</label>
                    <input
                      value={videoTitle}
                      onChange={e => setVideoTitle(e.target.value)}
                      placeholder="e.g. Lecture 1: Arrays & Memory Representation"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1">
                      Video URL (or Backblaze b2:// ref) *
                    </label>
                    <input
                      value={videoUrl}
                      onChange={e => setVideoUrl(e.target.value)}
                      placeholder="b2://courses/videos/lecture1.mp4 or https://..."
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-brand-muted mb-1">Duration</label>
                      <input
                        value={videoDuration}
                        onChange={e => setVideoDuration(e.target.value)}
                        placeholder="e.g. 45 mins"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-muted mb-1">Sort Order</label>
                      <input
                        type="number"
                        value={videoSortOrder}
                        onChange={e => setVideoSortOrder(Number(e.target.value))}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1">Description (Optional)</label>
                    <textarea
                      value={videoDescription}
                      onChange={e => setVideoDescription(e.target.value)}
                      rows={2}
                      className={inputCls + ' resize-none'}
                      placeholder="Lecture overview..."
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={videoIsFreePreview}
                      onChange={e => setVideoIsFreePreview(e.target.checked)}
                      className="rounded text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">
                      Free Preview (allow all visitors to watch without bundle)
                    </span>
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowVideoModal(false)}
                    disabled={savingVideo}
                    className="flex-1 py-2 rounded-xl border border-brand-border text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveVideo}
                    disabled={savingVideo}
                    className="flex-1 py-2 rounded-xl bg-primary-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    {savingVideo && <Loader2 size={12} className="animate-spin" />}
                    {editingVideo ? 'Update Lecture' : 'Add Lecture'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Modal */}
        <AnimatePresence>
          {deletingBundle && (
            <DeleteModal
              title={`Subject Bundle for ${deletingBundle.subjectName || `Subject #${deletingBundle.subjectId}`}`}
              itemType="bundle"
              onConfirm={handleDeleteBundle}
              onCancel={() => setDeletingBundle(null)}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ─── Resource Bundles Section (Notes & PDFs only, never videos) ───────────
  function ResourceBundlesSection() {
    const [bundles, setBundles] = useState<ResourceBundle[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

    // Modals
    const [showBundleModal, setShowBundleModal] = useState(false)
    const [editingBundle, setEditingBundle] = useState<ResourceBundle | null>(null)
    const [deletingBundle, setDeletingBundle] = useState<ResourceBundle | null>(null)
    const [managingBundle, setManagingBundle] = useState<ResourceBundle | null>(null)

    // Form fields for Bundle modal
    const [formSubjectId, setFormSubjectId] = useState<number | null>(null)
    const [formTitle, setFormTitle] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formSixMonthPrice, setFormSixMonthPrice] = useState('299')
    const [formLifetimePrice, setFormLifetimePrice] = useState('599')
    const [formSixMonthEnabled, setFormSixMonthEnabled] = useState(true)
    const [formLifetimeEnabled, setFormLifetimeEnabled] = useState(true)
    const [formIsActive, setFormIsActive] = useState(true)
    const [savingBundle, setSavingBundle] = useState(false)

    // Available subjects for dropdown
    const [subjectOptions, setSubjectOptions] = useState<any[]>([])
    const [loadingSubjects, setLoadingSubjects] = useState(false)
    const [subjectSearchQuery, setSubjectSearchQuery] = useState('')

    // Resource selector modal state (Notes & PDFs only)
    const [availableResources, setAvailableResources] = useState<any[]>([])
    const [selectedResourceIds, setSelectedResourceIds] = useState<Set<number>>(new Set())
    const [loadingResources, setLoadingResources] = useState(false)
    const [savingResources, setSavingResources] = useState(false)
    const [resourceSearch, setResourceSearch] = useState('')

    const loadBundles = useCallback(async () => {
      setLoading(true)
      try {
        const data = await fetchAllResourceBundles()
        setBundles(data)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load resource bundles')
      } finally {
        setLoading(false)
      }
    }, [])

    useEffect(() => {
      loadBundles()
    }, [loadBundles])

    const openCreateModal = async () => {
      setEditingBundle(null)
      setFormSubjectId(null)
      setFormTitle('')
      setFormDescription('')
      setFormSixMonthPrice('299')
      setFormLifetimePrice('599')
      setFormSixMonthEnabled(true)
      setFormLifetimeEnabled(true)
      setFormIsActive(true)
      setSubjectSearchQuery('')
      setShowBundleModal(true)

      if (subjectOptions.length === 0) {
        setLoadingSubjects(true)
        try {
          const list = await fetchAllSubjectsWithDetails()
          setSubjectOptions(list)
        } catch {
          toast.error('Failed to load subjects list')
        } finally {
          setLoadingSubjects(false)
        }
      }
    }

    const openEditModal = (b: ResourceBundle) => {
      setEditingBundle(b)
      setFormSubjectId(b.subjectId)
      setFormTitle(b.title)
      setFormDescription(b.description)
      setFormSixMonthPrice(String(b.sixMonthPrice))
      setFormLifetimePrice(String(b.lifetimePrice))
      setFormSixMonthEnabled(b.sixMonthEnabled)
      setFormLifetimeEnabled(b.lifetimeEnabled)
      setFormIsActive(b.isActive)
      setShowBundleModal(true)
    }

    const handleSaveBundle = async () => {
      if (!formSubjectId) {
        toast.error('Please select a subject')
        return
      }
      const smPrice = parseFloat(formSixMonthPrice)
      const ltPrice = parseFloat(formLifetimePrice)

      if (isNaN(smPrice) || smPrice < 0) {
        toast.error('Please enter a valid 6-month price')
        return
      }
      if (isNaN(ltPrice) || ltPrice < 0) {
        toast.error('Please enter a valid lifetime price')
        return
      }
      if (!formSixMonthEnabled && !formLifetimeEnabled) {
        toast.error('At least one duration plan (6-Month or Lifetime) must be enabled')
        return
      }

      setSavingBundle(true)
      try {
        if (editingBundle) {
          const input: UpdateResourceBundleInput = {
            title: formTitle.trim() || undefined,
            description: formDescription.trim() || undefined,
            sixMonthPrice: smPrice,
            lifetimePrice: ltPrice,
            sixMonthEnabled: formSixMonthEnabled,
            lifetimeEnabled: formLifetimeEnabled,
            isActive: formIsActive,
          }
          await updateResourceBundle(editingBundle.id, input)
          toast.success('Resource bundle updated successfully!')
        } else {
          const selectedSubj = subjectOptions.find(s => s.id === formSubjectId)
          const defaultTitle = formTitle.trim() || `${selectedSubj?.name || 'Subject'} Complete Notes`

          const input: CreateResourceBundleInput = {
            subjectId: formSubjectId,
            title: defaultTitle,
            description: formDescription.trim() || 'Complete notes, previous year solved questions, and study material.',
            sixMonthPrice: smPrice,
            lifetimePrice: ltPrice,
            sixMonthEnabled: formSixMonthEnabled,
            lifetimeEnabled: formLifetimeEnabled,
            isActive: formIsActive,
          }
          await createResourceBundle(input)
          toast.success('Resource bundle created successfully!')
        }

        setShowBundleModal(false)
        loadBundles()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save resource bundle')
      } finally {
        setSavingBundle(false)
      }
    }

    const handleToggleActive = async (b: ResourceBundle) => {
      try {
        await toggleResourceBundleActive(b.id, !b.isActive)
        setBundles(prev => prev.map(item => item.id === b.id ? { ...item, isActive: !item.isActive } : item))
        toast.success(`Bundle ${!b.isActive ? 'activated' : 'deactivated'}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update bundle status')
      }
    }

    const handleDeleteBundle = async () => {
      if (!deletingBundle) return
      try {
        await deleteResourceBundle(deletingBundle.id)
        toast.success('Resource bundle deleted')
        setDeletingBundle(null)
        loadBundles()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete bundle')
      }
    }

    // Open Resource Selector Modal
    const openManageResources = async (b: ResourceBundle) => {
      setManagingBundle(b)
      setLoadingResources(true)
      setResourceSearch('')
      try {
        const currentItems = await fetchResourceBundleItems(b.id)
        setSelectedResourceIds(new Set(currentItems.map(item => item.resourceId)))

        const { data, error } = await supabase
          .from('resources')
          .select(`
            id,
            title,
            description,
            file_url,
            is_premium,
            subject_id,
            resource_types ( name )
          `)
          .order('title', { ascending: true })

        if (error) throw error
        setAvailableResources(data || [])
      } catch (err) {
        toast.error('Failed to load resources for bundle')
      } finally {
        setLoadingResources(false)
      }
    }

    const handleSaveResourceMappings = async () => {
      if (!managingBundle) return
      setSavingResources(true)
      try {
        await updateResourceBundleMappings(managingBundle.id, Array.from(selectedResourceIds))
        toast.success(`Updated included notes (${selectedResourceIds.size} notes saved)!`)
        setManagingBundle(null)
        loadBundles()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save resource mappings')
      } finally {
        setSavingResources(false)
      }
    }

    const toggleResourceSelect = (resId: number) => {
      setSelectedResourceIds(prev => {
        const next = new Set(prev)
        if (next.has(resId)) next.delete(resId)
        else next.add(resId)
        return next
      })
    }

    const filtered = bundles.filter(b => {
      const matchText =
        (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.subjectName || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.subjectCode || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.courseName || '').toLowerCase().includes(search.toLowerCase())
      if (!matchText) return false
      if (statusFilter === 'active') return b.isActive
      if (statusFilter === 'inactive') return !b.isActive
      return true
    })

    const totalBundles = bundles.length
    const activeBundles = bundles.filter(b => b.isActive).length
    const totalPurchasers = bundles.reduce((sum, b) => sum + (b.totalPurchasers || 0), 0)
    const totalRevenue = bundles.reduce((sum, b) => sum + (b.revenue || 0), 0)

    const filteredSubjects = subjectOptions.filter(s =>
      (s.name || '').toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
      (s.code || '').toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
      (s.course_name || '').toLowerCase().includes(subjectSearchQuery.toLowerCase())
    )

    const filteredResources = availableResources.filter(r => {
      const matchSearch =
        (r.title || '').toLowerCase().includes(resourceSearch.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(resourceSearch.toLowerCase()) ||
        (r.resource_types?.name || '').toLowerCase().includes(resourceSearch.toLowerCase())
      return matchSearch
    })

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2.5">
              <Layers className="text-indigo-500" size={24} />
              <span>Resource Bundles (Notes & Documents Only)</span>
            </h2>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
              Curate standalone PDF notes, formula cheat sheets, and question banks. Videos are strictly excluded.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Plus size={16} /> Create Resource Bundle
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4 border border-brand-border dark:border-brand-dark-border">
            <p className="text-xs text-brand-muted font-medium">Total Resource Bundles</p>
            <p className="text-2xl font-bold text-brand-text dark:text-brand-dark-text mt-1">{totalBundles}</p>
          </div>
          <div className="card p-4 border border-brand-border dark:border-brand-dark-border">
            <p className="text-xs text-brand-muted font-medium">Active Bundles</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeBundles}</p>
          </div>
          <div className="card p-4 border border-brand-border dark:border-brand-dark-border">
            <p className="text-xs text-brand-muted font-medium">Total Purchasers</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{totalPurchasers}</p>
          </div>
          <div className="card p-4 border border-brand-border dark:border-brand-dark-border">
            <p className="text-xs text-brand-muted font-medium">Verified Revenue</p>
            <p className="text-2xl font-bold text-primary-500 mt-1">₹{totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} placeholder="Search resource bundles by title, subject, code..." />
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border text-xs font-semibold">
            {(['all', 'active', 'inactive'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  statusFilter === tab
                    ? 'bg-white dark:bg-brand-dark-card shadow-xs text-brand-text dark:text-brand-dark-text font-bold'
                    : 'text-brand-muted hover:text-brand-text dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center border border-brand-border dark:border-brand-dark-border">
            <Layers size={40} className="mx-auto mb-3 text-brand-muted opacity-40" />
            <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text">No resource bundles found</h3>
            <p className="text-xs text-brand-muted mt-1 mb-4">
              {search ? 'Try adjusting your search criteria.' : 'Create your first notes & resource bundle to get started.'}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              <Plus size={14} /> Create Resource Bundle
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden border border-brand-border dark:border-brand-dark-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 dark:bg-white/5 border-b border-brand-border dark:border-brand-dark-border text-[11px] font-bold text-brand-muted uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Bundle & Academic Subject</th>
                    <th className="px-4 py-3.5">Included Notes</th>
                    <th className="px-4 py-3.5">6-Month Price</th>
                    <th className="px-4 py-3.5">Lifetime Price</th>
                    <th className="px-4 py-3.5">Purchasers</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                  {filtered.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      {/* Bundle Name & Subject */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1 max-w-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-brand-text dark:text-brand-dark-text">
                              {b.title || `${b.subjectName} Complete Notes`}
                            </span>
                            {b.subjectCode && (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-brand-muted">
                                {b.subjectCode}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-brand-muted line-clamp-1">
                            {[b.collegeName, b.courseName, b.branchName, b.semesterNumber != null ? `Sem ${b.semesterNumber}` : null].filter(Boolean).join(' › ')}
                          </p>
                        </div>
                      </td>

                      {/* Included Notes */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openManageResources(b)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] transition-colors"
                          >
                            <FileText size={13} />
                            <span>{b.itemCount ?? b.items?.length ?? 0} notes included</span>
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </td>

                      {/* 6-Month Price */}
                      <td className="px-4 py-3.5 font-medium text-brand-text dark:text-brand-dark-text">
                        {b.sixMonthEnabled ? (
                          <span className="font-bold font-mono">₹{b.sixMonthPrice}</span>
                        ) : (
                          <span className="text-brand-muted italic text-[11px]">Disabled</span>
                        )}
                      </td>

                      {/* Lifetime Price */}
                      <td className="px-4 py-3.5 font-medium text-brand-text dark:text-brand-dark-text">
                        {b.lifetimeEnabled ? (
                          <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">₹{b.lifetimePrice}</span>
                        ) : (
                          <span className="text-brand-muted italic text-[11px]">Disabled</span>
                        )}
                      </td>

                      {/* Purchasers */}
                      <td className="px-4 py-3.5 font-medium text-brand-muted">
                        <span className="font-bold text-brand-text dark:text-brand-dark-text">{b.totalPurchasers || 0}</span>
                        <span className="text-[10px] ml-1">students</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleActive(b)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            b.isActive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                              : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
                          }`}
                        >
                          {b.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openManageResources(b)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted hover:text-brand-text"
                            title="Manage Notes & Resources"
                          >
                            <FileText size={15} />
                          </button>
                          <button
                            onClick={() => openEditModal(b)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted hover:text-brand-text"
                            title="Edit Bundle Pricing"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeletingBundle(b)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-brand-muted hover:text-rose-500"
                            title="Delete Bundle"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Modal: Create / Edit Resource Bundle ─────────────────────────── */}
        <AnimatePresence>
          {showBundleModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => !savingBundle && setShowBundleModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 my-8"
              >
                <div className="flex items-center justify-between border-b pb-3 border-brand-border">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-indigo-500" />
                    <h3 className="font-bold text-brand-text dark:text-brand-dark-text text-base">
                      {editingBundle ? 'Edit Resource Bundle' : 'Create Resource Bundle'}
                    </h3>
                  </div>
                  <button onClick={() => setShowBundleModal(false)} className="text-brand-muted hover:text-brand-text">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Subject Selection (when creating) */}
                  {!editingBundle ? (
                    <div>
                      <label className="block text-xs font-bold text-brand-muted mb-1">
                        Select Academic Subject *
                      </label>
                      <input
                        type="text"
                        placeholder="Search subject by name, code, or course..."
                        value={subjectSearchQuery}
                        onChange={e => setSubjectSearchQuery(e.target.value)}
                        className={inputCls + ' mb-2 text-xs'}
                      />
                      <div className="max-h-40 overflow-y-auto rounded-xl border border-brand-border dark:border-brand-dark-border divide-y divide-brand-border dark:divide-brand-dark-border">
                        {loadingSubjects ? (
                          <div className="p-4 text-center text-xs text-brand-muted">Loading subjects...</div>
                        ) : filteredSubjects.length === 0 ? (
                          <div className="p-4 text-center text-xs text-brand-muted">No matching subjects found</div>
                        ) : (
                          filteredSubjects.slice(0, 50).map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setFormSubjectId(s.id)
                                if (!formTitle) setFormTitle(`${s.name} Complete Notes`)
                              }}
                              className={`w-full p-2.5 text-left text-xs transition-colors flex items-center justify-between ${
                                formSubjectId === s.id
                                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                                  : 'hover:bg-gray-50 dark:hover:bg-white/5'
                              }`}
                            >
                              <div>
                                <p className="font-semibold">{s.name}</p>
                                <p className="text-[10px] text-brand-muted">
                                  {[s.course_name, s.branch_name, s.semester_number != null ? `Sem ${s.semester_number}` : null].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                              {formSubjectId === s.id && <Check size={14} className="text-indigo-600" />}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border">
                      <p className="text-[10px] uppercase font-bold text-brand-muted">Academic Subject</p>
                      <p className="text-sm font-bold text-brand-text dark:text-brand-dark-text mt-0.5">
                        {editingBundle.subjectName}
                      </p>
                      <p className="text-xs text-brand-muted">
                        {[editingBundle.courseName, editingBundle.branchName, editingBundle.semesterNumber != null ? `Sem ${editingBundle.semesterNumber}` : null].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  )}

                  {/* Bundle Title */}
                  <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1">Bundle Title *</label>
                    <input
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="e.g. DBMS Complete Notes & Cheat Sheets"
                      className={inputCls}
                    />
                  </div>

                  {/* Bundle Description */}
                  <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1">Description (Optional)</label>
                    <textarea
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                      rows={2}
                      placeholder="Includes all chapter notes, previous years questions, formula sheets..."
                      className={inputCls + ' resize-none'}
                    />
                  </div>

                  {/* Pricing Matrix */}
                  <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border">
                    {/* 6-Month Plan */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formSixMonthEnabled}
                          onChange={e => setFormSixMonthEnabled(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text">6-Month Plan</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-brand-muted font-bold">₹</span>
                        <input
                          type="number"
                          disabled={!formSixMonthEnabled}
                          value={formSixMonthPrice}
                          onChange={e => setFormSixMonthPrice(e.target.value)}
                          className={inputCls + ' pl-7 text-xs disabled:opacity-50'}
                          placeholder="299"
                        />
                      </div>
                    </div>

                    {/* Lifetime Plan */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formLifetimeEnabled}
                          onChange={e => setFormLifetimeEnabled(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span className="text-xs font-bold text-brand-text dark:text-brand-dark-text">Lifetime Plan</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-brand-muted font-bold">₹</span>
                        <input
                          type="number"
                          disabled={!formLifetimeEnabled}
                          value={formLifetimePrice}
                          onChange={e => setFormLifetimePrice(e.target.value)}
                          className={inputCls + ' pl-7 text-xs disabled:opacity-50'}
                          placeholder="599"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={e => setFormIsActive(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">
                      Active (visible to students for purchase)
                    </span>
                  </label>
                </div>

                <div className="flex gap-2 pt-3 border-t border-brand-border">
                  <button
                    onClick={() => setShowBundleModal(false)}
                    disabled={savingBundle}
                    className="flex-1 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBundle}
                    disabled={savingBundle}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs"
                  >
                    {savingBundle && <Loader2 size={13} className="animate-spin" />}
                    {editingBundle ? 'Update Bundle' : 'Create Bundle'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Modal: Manage Included Notes (PDFs/Resources only) ───────────── */}
        <AnimatePresence>
          {managingBundle && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => !savingResources && setManagingBundle(null)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 my-8"
              >
                <div className="flex items-center justify-between border-b pb-3 border-brand-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-indigo-500" />
                      <h3 className="font-bold text-brand-text dark:text-brand-dark-text text-base">
                        Manage Included Notes & PDFs
                      </h3>
                    </div>
                    <p className="text-xs text-brand-muted mt-0.5">
                      {managingBundle.title} · {managingBundle.subjectName}
                    </p>
                  </div>
                  <button onClick={() => setManagingBundle(null)} className="text-brand-muted hover:text-brand-text">
                    <X size={18} />
                  </button>
                </div>

                {/* Important notice: Videos are strictly excluded */}
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-xs text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                  <Shield size={16} className="text-indigo-600 flex-shrink-0" />
                  <span>
                    This selector lists only documents, handwritten notes, and PDF materials. Videos cannot be included in Resource Bundles.
                  </span>
                </div>

                {/* Search & Bulk Select */}
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    placeholder="Search notes by title or type..."
                    value={resourceSearch}
                    onChange={e => setResourceSearch(e.target.value)}
                    className={inputCls + ' text-xs py-2'}
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = new Set(filteredResources.map(r => Number(r.id)))
                        setSelectedResourceIds(allIds)
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-brand-border text-xs font-semibold text-brand-muted hover:text-brand-text"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedResourceIds(new Set())}
                      className="px-2.5 py-1.5 rounded-lg border border-brand-border text-xs font-semibold text-brand-muted hover:text-brand-text"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Resource List with Checkboxes */}
                <div className="max-h-72 overflow-y-auto rounded-xl border border-brand-border dark:border-brand-dark-border divide-y divide-brand-border dark:divide-brand-dark-border">
                  {loadingResources ? (
                    <div className="p-8 text-center text-xs text-brand-muted">Loading available notes...</div>
                  ) : filteredResources.length === 0 ? (
                    <div className="p-8 text-center text-xs text-brand-muted">
                      No resources found in the library matching your search.
                    </div>
                  ) : (
                    filteredResources.map(res => {
                      const isSelected = selectedResourceIds.has(Number(res.id))
                      const isSubjectMatch = res.subject_id === managingBundle.subjectId

                      return (
                        <div
                          key={res.id}
                          onClick={() => toggleResourceSelect(Number(res.id))}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50/50 dark:bg-indigo-950/30'
                              : 'hover:bg-gray-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleResourceSelect(Number(res.id))}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-brand-text dark:text-brand-dark-text truncate">
                                  {res.title}
                                </p>
                                {isSubjectMatch && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    Subject Match
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-brand-muted">
                                {res.resource_types?.name || 'Document'} {res.description && `· ${res.description}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex-shrink-0 text-right">
                            {isSelected ? (
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                ✓ Included
                              </span>
                            ) : (
                              <span className="text-[10px] text-brand-muted">Excluded</span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-brand-border">
                  <span className="text-xs font-semibold text-brand-muted">
                    {selectedResourceIds.size} note(s) selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setManagingBundle(null)}
                      disabled={savingResources}
                      className="px-4 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-muted"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveResourceMappings}
                      disabled={savingResources}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs"
                    >
                      {savingResources && <Loader2 size={13} className="animate-spin" />}
                      Save Included Notes
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deletingBundle && (
            <DeleteModal
              title={`Resource Bundle "${deletingBundle.title || deletingBundle.subjectName}"`}
              itemType="bundle"
              onConfirm={handleDeleteBundle}
              onCancel={() => setDeletingBundle(null)}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview()
      case 'hackathons': return renderHackathons()
      case 'courses': return renderCourses()
      case 'resources': return renderResources()
      case 'quizzes': return renderQuizzes()
      case 'roadmaps': return renderRoadmaps()
      case 'mentorship': return renderMentorship()
      case 'career-applications': return renderCareerApplications()
      case 'youtube-videos': return <YoutubeVideosTab search={search} setSearch={setSearch} />
      case 'webinars': return renderWebinars()
      case 'hierarchy': return renderHierarchy()
      case 'pathfinder-careers': return renderPathfinderCareers()
      case 'pathfinder-exams': return renderPathfinderExams()
      case 'pathfinder-mappings': return renderPathfinderMappings()
      case 'subject-bundles': return <SubjectBundlesSection />
      case 'resource-bundles': return <ResourceBundlesSection />
      case 'course-discounts': return <DiscountSection productType="subject_bundle" />
      case 'resource-discounts': return <DiscountSection productType="resource_bundle" />
      case 'coupons': return <CouponsSection />
      case 'coupon-usage': return <CouponUsageSection />
      case 'payment-approvals': return renderPaymentApprovals()
      case 'users': return renderUsers()
      case 'settings': return renderSettings()
      default: return null
    }
  }

  const groups = Array.from(new Set(sidebarItems.map(i => i.group || 'Main')))
  const pendingPaymentsCount = paymentRequests.filter(p => p.status === 'pending').length

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">

          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col w-64 flex-shrink-0">
            <div className="card p-4 sticky top-24">
              <div className="flex items-center justify-between px-2 py-2 mb-4 border-b border-brand-border dark:border-brand-dark-border pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                    <Shield size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-brand-text dark:text-brand-dark-text">Admin Panel</p>
                    <p className="text-[10px] text-primary-500 font-bold truncate max-w-[110px]">{adminUser?.email || 'admin@skills021.com'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdminLogoutModal(true)}
                  className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Sign out of Admin Dashboard"
                >
                  <LogOut size={14} />
                </button>
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
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${activeTab === item.id
                            ? 'bg-primary-500 text-white'
                            : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <item.icon size={16} />
                            <span>{item.label}</span>
                          </div>
                          {item.id === 'payment-approvals' && pendingPaymentsCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                              {pendingPaymentsCount}
                            </span>
                          )}
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
                className={`flex-shrink-0 relative flex flex-col items-center gap-1 px-3 py-3 text-xs transition-colors ${activeTab === item.id ? 'text-primary-500' : 'text-brand-muted dark:text-brand-dark-muted'
                  }`}
              >
                <div className="relative">
                  <item.icon size={18} />
                  {item.id === 'payment-approvals' && pendingPaymentsCount > 0 && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                      {pendingPaymentsCount}
                    </span>
                  )}
                </div>
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

      {/* Webinar Edit Modal — uses the same centered modal treatment as other admin edit actions */}
      <AnimatePresence>
        {showWebinarEditModal && editingWebinarId && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 overflow-y-auto overscroll-contain" onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-2xl w-full shadow-xl my-4 max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary-500 mb-1">Webinar</p>
                  <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">Edit upcoming webinar</h3>
                </div>
                <button onClick={resetWebinarForm} disabled={webinarBusy} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10" aria-label="Close edit webinar">
                  <X size={18} className="text-brand-muted" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <Field label="Title *"><input value={liveTitle} onChange={e => setLiveTitle(e.target.value)} className={inputCls} placeholder="Career Q&A — Placement Strategy" /></Field>
                <Field label="Description"><textarea value={liveDescription} onChange={e => setLiveDescription(e.target.value)} className={inputCls + ' resize-none'} rows={4} placeholder="Tell students what they will learn..." /></Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Platform"><select value={liveProvider} onChange={e => setLiveProvider(e.target.value as WebinarProvider)} className={inputCls}><option>Google Meet</option><option>Zoom</option></select></Field>
                  <Field label="Join URL *"><input value={liveJoinUrl} onChange={e => setLiveJoinUrl(e.target.value)} className={inputCls} placeholder="https://meet.google.com/..." /></Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Access">
                    <select value={liveAccess} onChange={e => setLiveAccess(e.target.value as WebinarAccess)} className={inputCls}>
                      <option value="free">Free for everyone</option>
                      <option value="paid">Paid for everyone</option>
                      <option value="enrolled_free">Free for enrolled students, paid for others</option>
                    </select>
                  </Field>
                  <Field label="Price (₹)">
                    <input type="number" min="0" step="1" value={livePrice} disabled={liveAccess !== 'paid' && liveAccess !== 'enrolled_free'} onChange={e => setLivePrice(e.target.value)} className={inputCls} placeholder="499" />
                  </Field>
                </div>
                {liveAccess === 'enrolled_free' && <p className="text-xs text-violet-600 dark:text-violet-300 -mt-2">Students with any active course enrollment get this webinar free. Everyone else sees the paid price.</p>}
                <div className="space-y-3">
                  {webinarTimeField('Start time *', startDate, setStartDate, startHour, setStartHour, startMinute, setStartMinute, startPeriod, setStartPeriod)}
                  <div className="rounded-xl border border-brand-border dark:border-brand-dark-border px-3 py-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={hasEndTime} onChange={e => { const checked = e.target.checked; setHasEndTime(checked); if (checked) { setEndDate(endDate || startDate); setEndHour(endHour || startHour || '12'); setEndMinute(endMinute || '00'); setEndPeriod(endHour ? endPeriod : startPeriod) } }} className="h-4 w-4 rounded" />
                      <span className="text-sm font-semibold text-brand-text dark:text-brand-dark-text">Add an end time</span>
                      <span className="text-xs font-medium text-brand-muted">Optional</span>
                    </label>
                    {!hasEndTime && <p className="text-xs text-brand-muted mt-2 ml-7">Leave this off if you want to end the webinar manually.</p>}
                  </div>
                  {hasEndTime && webinarTimeField('End time', endDate, setEndDate, endHour, setEndHour, endMinute, setEndMinute, endPeriod, setEndPeriod, true)}
                </div>

                {/* Video card — same upload function (file picker, audio check, duration
                      check, progress bar) as the Courses panel's video card. */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-brand-text dark:text-brand-dark-text">Webinar Video (optional)</label>
                  <div className="border-2 border-dashed border-brand-border dark:border-brand-dark-border rounded-xl p-5 text-center bg-gray-50 dark:bg-brand-dark-bg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors relative group">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setWebinarEditVideoFile(file)
                          setWebinarEditVideoUploadStatus('idle')
                          setWebinarEditVideoUploadProgress(0)
                          setWebinarEditVideoAudioCheck('checking')
                          checkVideoHasAudio(file).then(result => {
                            setWebinarEditVideoAudioCheck(result === 'yes' ? 'has-audio' : result === 'no' ? 'no-audio' : null)
                          })
                          setWebinarEditVideoDurationSeconds(null)
                          getVideoDurationSeconds(file).then(setWebinarEditVideoDurationSeconds)
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Video className="text-brand-muted dark:text-brand-dark-muted group-hover:scale-105 transition-transform" size={24} />
                      <p className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">
                        {webinarEditVideoFile ? 'Change Selected Video' : 'Choose Video File'}
                      </p>
                      <p className="text-[10px] text-brand-muted">MP4, WebM, MOV — keeps original audio track</p>
                    </div>
                  </div>
                  {webinarEditVideoAudioCheck === 'checking' && (
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Checking video for an audio track...</p>
                  )}
                  {webinarEditVideoAudioCheck === 'no-audio' && (
                    <p className="text-xs text-amber-600 font-semibold flex items-start gap-1.5">
                      <span>⚠</span>
                      <span>Couldn't detect sound in this video in a quick browser check. If you're confident the file has audio, it's likely fine — just verify sound plays after uploading.</span>
                    </p>
                  )}
                  {webinarEditVideoAudioCheck === 'has-audio' && (
                    <p className="text-xs text-green-600 font-semibold flex items-center gap-1.5"><span>✔</span> Audio track detected — this video has sound.</p>
                  )}
                  {webinarEditVideoFile && (
                    <div className="p-3 bg-gray-50 dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border rounded-xl flex items-center justify-between text-xs text-brand-text dark:text-brand-dark-text">
                      <div className="flex items-center gap-2 truncate max-w-[70%]">
                        <span className="text-green-500 font-bold">✔</span>
                        <div className="truncate text-left">
                          <p className="font-semibold truncate">{webinarEditVideoFile.name}</p>
                          <p className="text-[10px] text-brand-muted">{(webinarEditVideoFile.size / 1024 / 1024).toFixed(2)} MB{webinarEditVideoDurationSeconds != null ? ` · ${formatSeconds(webinarEditVideoDurationSeconds)}` : ''}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {webinarEditVideoUploadStatus === 'uploading' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-brand-muted uppercase">
                        <span>Uploading Video...</span><span>{webinarEditVideoUploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${webinarEditVideoUploadProgress}%` }} transition={{ duration: 0.1 }} className="bg-primary-500 h-full rounded-full" />
                      </div>
                    </div>
                  )}
                  {webinarEditVideoUploadStatus === 'success' && <p className="text-xs text-green-600 font-semibold flex items-center gap-1.5"><span>✔</span> Video uploaded successfully!</p>}
                  {webinarEditVideoUploadStatus === 'error' && <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5"><span>❌</span> Video upload failed. Please try again.</p>}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={resetWebinarForm} disabled={webinarBusy} className="flex-1 py-3 rounded-xl border border-brand-border dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5">Cancel</button>
                <button type="button" disabled={webinarBusy} onClick={async () => {
                  const startValue = buildWebinarDateTime(startDate, startHour, startMinute, startPeriod)
                  const endValue = hasEndTime ? buildWebinarDateTime(endDate, endHour, endMinute, endPeriod) : ''
                  if (!liveTitle.trim() || !liveJoinUrl.trim() || !startValue) { toast.error('Fill all required webinar fields'); return }
                  if (hasEndTime && !endValue) { toast.error('Complete the optional end time or turn it off'); return }
                  if (hasEndTime && new Date(endValue).getTime() <= new Date(startValue).getTime()) { toast.error('End time must be after the start time'); return }
                  try {
                    setWebinarBusy(true)
                    const updated = await updateLiveWebinar(editingWebinarId, { title: liveTitle.trim(), description: liveDescription, provider: liveProvider, joinUrl: liveJoinUrl.trim(), startsAt: new Date(startValue).toISOString(), endsAt: endValue ? new Date(endValue).toISOString() : null, access: liveAccess, price: liveAccess === 'free' ? 0 : Math.max(0, Number(livePrice) || 0) })
                    setLiveWebinars(prev => prev.map(w => w.id === updated.id ? updated : w))
                    toast.success('Webinar updated successfully')
                    resetWebinarForm()
                  } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to update webinar') } finally { setWebinarBusy(false) }
                }} className="flex-1 py-3 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50">Save changes</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <DeleteModal
            title={deleteId.title}
            itemType={deleteId.type}
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>

      {/* Resume Preview Modal */}
      <AnimatePresence>
        {previewResume && (
          <ResumePreviewModal
            url={previewResume.url}
            name={previewResume.name}
            onClose={() => setPreviewResume(null)}
          />
        )}
      </AnimatePresence>

      {/* Guidance Request Detail Modal */}
      <AnimatePresence>
        {viewGuidanceRequest && (
          <GuidanceRequestModal
            request={viewGuidanceRequest}
            onClose={() => setViewGuidanceRequest(null)}
            onStatusChange={async (status) => {
              try {
                const updated = await updateGuidanceRequestStatusApi(viewGuidanceRequest.id, status)
                setDbGuidanceRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to update status')
              }
              setViewGuidanceRequest((prev) => prev ? { ...prev, status } : prev)
            }}
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-brand-dark-card rounded-3xl p-6 max-w-lg w-full shadow-2xl my-4 max-h-[90vh] overflow-y-auto border border-violet-200/70 dark:border-violet-900/50 relative overflow-x-hidden">
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

        {/* Hackathon Modal */}
        {showHackathonModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-xl w-full shadow-xl my-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5 border-b border-brand-border dark:border-brand-dark-border pb-3">
                <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">
                  {editingHackathonId ? 'Edit Hackathon' : 'Create New Hackathon'}
                </h3>
                <button onClick={() => setShowHackathonModal(false)}><X size={18} className="text-brand-muted" /></button>
              </div>

              <form onSubmit={handleSaveHackathonForm} className="space-y-4">
                <Field label="Hackathon Title *">
                  <input required value={hTitleInput} onChange={e => setHTitleInput(e.target.value)} className={inputCls} placeholder="e.g. Skills021 Innovation Hackathon 2026" />
                </Field>

                <Field label="Description">
                  <textarea rows={3} value={hDescInput} onChange={e => setHDescInput(e.target.value)} className={inputCls + ' resize-none'} placeholder="Detailed description of the hackathon..." />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Date">
                    <input type="datetime-local" required value={hStartInput} onChange={e => setHStartInput(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="End Date">
                    <input type="datetime-local" required value={hEndInput} onChange={e => setHEndInput(e.target.value)} className={inputCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Registration Deadline">
                    <input type="datetime-local" required value={hDeadlineInput} onChange={e => setHDeadlineInput(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Venue / Location">
                    <input value={hVenueInput} onChange={e => setHVenueInput(e.target.value)} className={inputCls} placeholder="Auditorium / Online Discord" />
                  </Field>
                </div>

                <Field label="Banner Image URL">
                  <input value={hBannerInput} onChange={e => setHBannerInput(e.target.value)} className={inputCls} placeholder="https://..." />
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="Min Team Size">
                    <input type="number" min={1} value={hMinTeamInput} onChange={e => setHMinTeamInput(Number(e.target.value))} className={inputCls} />
                  </Field>
                  <Field label="Max Team Size">
                    <input type="number" min={1} value={hMaxTeamInput} onChange={e => setHMaxTeamInput(Number(e.target.value))} className={inputCls} />
                  </Field>
                  <Field label="Max Teams Capacity">
                    <input type="number" min={1} value={hMaxTeamsInput} onChange={e => setHMaxTeamsInput(Number(e.target.value))} className={inputCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="Total Days">
                    <input type="number" min={1} value={hDaysInput} onChange={e => setHDaysInput(Number(e.target.value))} className={inputCls} />
                  </Field>
                  <Field label="Total Rounds">
                    <input type="number" min={1} value={hRoundsInput} onChange={e => setHRoundsInput(Number(e.target.value))} className={inputCls} />
                  </Field>
                  <Field label="Status">
                    <select value={hStatusInput} onChange={e => setHStatusInput(e.target.value as any)} className={inputCls}>
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </Field>
                </div>

                <Field label="Official Rules & Guidelines">
                  <textarea rows={3} value={hRulesInput} onChange={e => setHRulesInput(e.target.value)} className={inputCls + ' resize-none'} placeholder="Rules list..." />
                </Field>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="regOpenCheck"
                    checked={hRegOpenInput}
                    onChange={e => setHRegOpenInput(e.target.checked)}
                    className="w-4 h-4 text-primary-500 rounded border-gray-300"
                  />
                  <label htmlFor="regOpenCheck" className="text-sm font-semibold text-brand-text dark:text-brand-dark-text">
                    Registration Open Currently
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-brand-border dark:border-brand-dark-border">
                  <button type="button" onClick={() => setShowHackathonModal(false)} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold">
                    Cancel
                  </button>
                  <button type="submit" disabled={hackathonSaving} className="flex-1 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600">
                    {hackathonSaving ? 'Saving...' : editingHackathonId ? 'Update Hackathon' : 'Create Hackathon'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Hackathon Deletion Confirmation Modal (GitHub / Render style text match) */}
        {deletingHackathon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-[#131926] rounded-3xl max-w-md w-full p-6 sm:p-8 border border-red-500/30 shadow-2xl space-y-5 relative">
              <button
                onClick={() => setDeletingHackathon(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 text-red-500">
                <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Delete Hackathon</h3>
                  <p className="text-xs text-red-500 font-semibold uppercase tracking-wider">Irreversible Action</p>
                </div>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs sm:text-sm text-red-700 dark:text-red-300 leading-relaxed">
                <p className="font-bold mb-1">⚠️ Danger Zone Warning:</p>
                This action <strong>cannot be undone</strong>. This will permanently delete the hackathon{' '}
                <span className="font-extrabold text-gray-900 dark:text-white">"{deletingHackathon.title}"</span>, all registered teams, member records, and round qualifications.
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  To confirm deletion, type <span className="select-all font-mono font-extrabold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">"{deletingHackathon.title}"</span> in the box below:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder={`Type "${deletingHackathon.title}"`}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingHackathon(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmText.trim() !== deletingHackathon.title.trim() || isDeletingHackathon}
                  onClick={handleConfirmDeleteHackathon}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isDeletingHackathon ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Deleting...
                    </>
                  ) : (
                    'Delete this hackathon'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* Admin Logout Confirmation Modal */}
        <LogoutConfirmModal
          isOpen={showAdminLogoutModal}
          isAdmin={true}
          userNameOrEmail={adminUser?.email || 'admin@skills021.com'}
          onConfirm={handleConfirmAdminLogout}
          onCancel={() => setShowAdminLogoutModal(false)}
        />
      </AnimatePresence>
    </div>
  )
}
