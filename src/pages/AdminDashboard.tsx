import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, FileText, HelpCircle, Map, Trophy, Briefcase,
  Users, GraduationCap, Star, Settings, Plus, Edit2, Trash2, Search,
  X, Shield, UserCheck, UserX, TrendingUp, Eye, Download, EyeOff,
  CheckCircle, Clock, MoreVertical, ChevronDown, Globe, Award, BookMarked,
  MessageSquare, BarChart3, DollarSign, Zap, Video
} from 'lucide-react'
import { useContentStore, Course, Resource, Quiz, Roadmap } from '../store/contentStore'
import { useEventStore, Hackathon } from '../store/eventStore'
import { useCounselingStore } from '../store/counselingStore'
import { useTrainingStore } from '../store/trainingStore'
import { useMentorStore } from '../store/mentorStore'
import { useTestimonialsStore } from '../store/testimonialsStore'
import { useGuidanceStore } from '../store/guidanceStore'
import { useCounselingRequestStore } from '../store/counselingRequestStore'
import { useVideoStore, YouTubeVideo } from '../store/videoStore'
import toast from 'react-hot-toast'

type AdminTab =
  | 'overview' | 'courses' | 'resources' | 'quizzes' | 'roadmaps'
  | 'hackathons' | 'internships' | 'counseling' | 'mentorship'
  | 'guidance-requests' | 'counseling-requests'
  | 'testimonials' | 'youtube-videos' | 'users' | 'settings'

const sidebarItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'courses', label: 'Courses', icon: BookOpen, group: 'Content' },
  { id: 'resources', label: 'Resources', icon: FileText, group: 'Content' },
  { id: 'quizzes', label: 'Quizzes', icon: HelpCircle, group: 'Content' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, group: 'Content' },
  { id: 'youtube-videos', label: 'YouTube Videos', icon: Video, group: 'Content' },
  { id: 'hackathons', label: 'Hackathons', icon: Trophy, group: 'Events' },
  { id: 'internships', label: 'Internships', icon: Briefcase, group: 'Events' },
  { id: 'counseling', label: 'Counseling', icon: GraduationCap, group: 'Services' },
  { id: 'mentorship', label: 'Mentorship', icon: Users, group: 'Services' },
  { id: 'guidance-requests', label: 'Guidance Requests', icon: MessageSquare, group: 'CRM' },
  { id: 'counseling-requests', label: 'Counseling Requests', icon: BarChart3, group: 'CRM' },
  { id: 'testimonials', label: 'Testimonials', icon: Star, group: 'Content' },
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
    New: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Contacted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Session Scheduled': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Counseling Scheduled': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Counseling Completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
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

// ─── Admin Dashboard ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<{ id: string; title: string; type: string } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)

  // Stores
  const content = useContentStore()
  const events = useEventStore()
  const counseling = useCounselingStore()
  const training = useTrainingStore()
  const mentors = useMentorStore()
  const testimonialStore = useTestimonialsStore()
  const guidanceStore = useGuidanceStore()
  const counselingReqStore = useCounselingRequestStore()
  const [noteEdit, setNoteEdit] = useState<{ id: string; type: 'guidance' | 'counseling'; val: string } | null>(null)

  // Users from localStorage
  const users = JSON.parse(localStorage.getItem('skills021_users') || '[]')

  const openAdd = (type?: string) => { setEditItem({ _type: type }); setShowModal(true) }
  const openEdit = (item: any) => { setEditItem(item); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  // ─── Overview ───────────────────────────────────────────────────────────────
  const renderOverview = () => {
    const newGuidance = guidanceStore.requests.filter(r => r.status === 'New').length
    const newCounseling = counselingReqStore.requests.filter(r => r.status === 'New').length
    const statsCards = [
      { label: 'Total Courses', val: content.courses.length, icon: BookOpen, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
      { label: 'Resources', val: content.resources.length, icon: FileText, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
      { label: 'Quizzes', val: content.quizzes.length, icon: HelpCircle, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
      { label: 'Hackathons', val: events.hackathons.length, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
      { label: 'Internships', val: training.internships.length, icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
      { label: 'Guidance Requests', val: guidanceStore.requests.length, icon: MessageSquare, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
      { label: 'Counseling Requests', val: counselingReqStore.requests.length, icon: BarChart3, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
      { label: 'Total Users', val: users.length, icon: Users, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    ]

    const totalDownloads = content.resources.reduce((a, r) => a + r.downloads, 0)
    const totalEnrolled = content.courses.reduce((a, c) => a + c.enrolled, 0)
    const totalQuizParticipants = content.quizzes.reduce((a, q) => a + q.participants, 0)
    const totalBookings = counseling.bookings.length + mentors.sessions.length

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Admin Overview</h2>
          <p className="text-brand-muted dark:text-brand-dark-muted mt-1">Skill021 Super Admin Panel — Full Control</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* CRM Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-0">
          {[
            { val: guidanceStore.requests.filter(r => r.status === 'New').length, label: 'New Guidance Requests', color: 'bg-blue-500', click: () => setActiveTab('guidance-requests') },
            { val: counselingReqStore.requests.filter(r => r.status === 'New').length, label: 'New Counseling Requests', color: 'bg-green-500', click: () => setActiveTab('counseling-requests') },
            { val: guidanceStore.requests.filter(r => r.status === 'Completed').length + counselingReqStore.requests.filter(r => r.status === 'Counseling Completed').length, label: 'Completed This Month', color: 'bg-teal-500', click: undefined },
            { val: guidanceStore.requests.length + counselingReqStore.requests.length, label: 'Total Requests', color: 'bg-primary-500', click: undefined },
          ].map(m => (
            <div key={m.label} className={`card p-4 flex items-center gap-3 cursor-pointer hover:shadow-card-hover`} onClick={m.click}>
              <div className={`w-2.5 h-8 ${m.color} rounded-full flex-shrink-0`} />
              <div>
                <div className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">{m.val}</div>
                <div className="text-[11px] text-brand-muted dark:text-brand-dark-muted">{m.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { val: totalDownloads.toLocaleString(), label: 'Resource Downloads', icon: Download, color: 'text-teal-500' },
            { val: totalEnrolled.toLocaleString(), label: 'Course Enrollments', icon: BookOpen, color: 'text-primary-500' },
            { val: totalQuizParticipants.toLocaleString(), label: 'Quiz Participants', icon: HelpCircle, color: 'text-purple-500' },
            { val: totalBookings.toString(), label: 'Total Bookings', icon: CheckCircle, color: 'text-green-500' },
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
              { label: 'Add Hackathon', tab: 'hackathons', color: 'bg-amber-500' },
              { label: 'Add Internship', tab: 'internships', color: 'bg-blue-500' },
              { label: 'Add Counseling', tab: 'counseling', color: 'bg-green-500' },
              { label: 'Add Mentor', tab: 'mentorship', color: 'bg-indigo-500' },
              { label: 'Add Testimonial', tab: 'testimonials', color: 'bg-pink-500' },
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

        {/* Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-brand-border dark:border-brand-dark-border">
              <h3 className="font-bold text-brand-text dark:text-brand-dark-text text-sm flex items-center gap-2">
                <BookOpen size={15} className="text-primary-500" /> Recent Courses
              </h3>
            </div>
            <div className="divide-y divide-brand-border dark:divide-brand-dark-border">
              {content.courses.slice(0, 4).map(c => (
                <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-text dark:text-brand-dark-text truncate">{c.title}</p>
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted">{c.enrolled.toLocaleString()} enrolled</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-brand-border dark:border-brand-dark-border">
              <h3 className="font-bold text-brand-text dark:text-brand-dark-text text-sm flex items-center gap-2">
                <CheckCircle size={15} className="text-green-500" /> Recent Bookings
              </h3>
            </div>
            <div className="divide-y divide-brand-border dark:divide-brand-dark-border">
              {[...counseling.bookings, ...mentors.sessions.map(s => ({ ...s, studentName: s.studentName, program: s.serviceType, status: s.status }))].slice(0, 4).map((b: any) => (
                <div key={b.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-brand-text dark:text-brand-dark-text">{b.studentName}</p>
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted">{b.serviceType || b.program || 'Service'}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
              {counseling.bookings.length === 0 && mentors.sessions.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-brand-muted dark:text-brand-dark-muted">No bookings yet</div>
              )}
            </div>
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
                    <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted">{c.enrolled.toLocaleString()}</td>
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
    const filtered = content.resources.filter(r => r.title.toLowerCase().includes(search.toLowerCase()))
    return (
      <div>
        <SectionHeader title="Manage Resources" count={content.resources.length} onAdd={() => openAdd('resource')} addLabel="Add Resource" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search resources..." />
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Title', 'Type', 'Category', 'Author', 'Downloads', 'Premium', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text max-w-[180px] truncate">{r.title}</td>
                    <td className="px-4 py-3"><span className="badge bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-xs">{r.type}</span></td>
                    <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{r.category}</td>
                    <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted text-xs">{r.author}</td>
                    <td className="px-4 py-3 text-brand-muted dark:text-brand-dark-muted">{r.downloads.toLocaleString()}</td>
                    <td className="px-4 py-3">{r.isPremium ? <span className="badge bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-xs">₹{r.price}</span> : <span className="badge bg-green-50 dark:bg-green-900/20 text-green-600 text-xs">Free</span>}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => content.toggleResourceStatus(r.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><EyeOff size={14} /></button>
                        <button onClick={() => openEdit({ ...r, _type: 'resource' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteId({ id: r.id, title: r.title, type: 'resource' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
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
                    <td className="px-4 py-3 text-brand-muted">{q.participants.toLocaleString()}</td>
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
                    <td className="px-4 py-3 text-brand-muted">{r.views.toLocaleString()}</td>
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

  // ─── Hackathons ─────────────────────────────────────────────────────────────
  const renderHackathons = () => {
    const filtered = events.hackathons.filter(h => h.name.toLowerCase().includes(search.toLowerCase()))
    return (
      <div>
        <SectionHeader title="Manage Hackathons" count={events.hackathons.length} onAdd={() => openAdd('hackathon')} addLabel="Add Hackathon" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search hackathons..." />
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Name', 'Category', 'Date', 'Prize', 'Registrations', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {filtered.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text max-w-[180px] truncate">{h.name}</td>
                    <td className="px-4 py-3"><span className="badge bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-xs">{h.category}</span></td>
                    <td className="px-4 py-3 text-brand-muted text-xs">{h.startDate}</td>
                    <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400 text-xs">{h.prize}</td>
                    <td className="px-4 py-3 text-brand-muted">{h.registrations.toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={h.publishStatus} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => events.toggleHackathonStatus(h.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><EyeOff size={14} /></button>
                        <button onClick={() => openEdit({ ...h, _type: 'hackathon' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteId({ id: h.id, title: h.name, type: 'hackathon' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
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

  // ─── Internships ────────────────────────────────────────────────────────────
  const renderInternships = () => {
    const filtered = training.internships.filter(i => i.title.toLowerCase().includes(search.toLowerCase()))
    return (
      <div>
        <SectionHeader title="Manage Internships" count={training.internships.length} onAdd={() => openAdd('internship')} addLabel="Add Internship" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search internships..." />
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Title', 'Company', 'Category', 'Stipend', 'Mode', 'Applications', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {filtered.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text max-w-[160px] truncate">{i.title}</td>
                    <td className="px-4 py-3 text-brand-muted text-xs">{i.company}</td>
                    <td className="px-4 py-3"><span className="badge bg-teal-50 dark:bg-teal-900/20 text-teal-600 text-xs">{i.category}</span></td>
                    <td className="px-4 py-3 text-xs font-medium">{i.stipend === 'Unpaid' ? <span className="text-gray-400">Unpaid</span> : <span className="text-green-600">{i.stipend}</span>}</td>
                    <td className="px-4 py-3 text-brand-muted text-xs">{i.mode}</td>
                    <td className="px-4 py-3 text-brand-muted">{i.applications}</td>
                    <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => training.toggleInternshipStatus(i.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><EyeOff size={14} /></button>
                        <button onClick={() => openEdit({ ...i, _type: 'internship' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteId({ id: i.id, title: i.title, type: 'internship' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
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

  // ─── Counseling ─────────────────────────────────────────────────────────────
  const renderCounseling = () => (
    <div className="space-y-6">
      <SectionHeader title="Counseling Services" count={counseling.services.length} onAdd={() => openAdd('counseling')} addLabel="Add Service" />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>{['Service', 'Category', 'Price', 'Duration', 'Bookings', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
              {counseling.services.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text max-w-[200px] truncate">{s.title}</td>
                  <td className="px-4 py-3"><span className="badge bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-xs">{s.category}</span></td>
                  <td className="px-4 py-3 font-medium">{s.price === 'FREE' ? <span className="text-green-500">FREE</span> : `₹${s.price}`}</td>
                  <td className="px-4 py-3 text-brand-muted text-xs">{s.duration}</td>
                  <td className="px-4 py-3 text-brand-muted">{s.bookings}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => counseling.toggleServiceStatus(s.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><EyeOff size={14} /></button>
                      <button onClick={() => openEdit({ ...s, _type: 'counseling' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteId({ id: s.id, title: s.title, type: 'counseling' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bookings */}
      <div>
        <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-4">Counseling Bookings ({counseling.bookings.length})</h3>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Student', 'Email', 'Service', 'Date', 'Time', 'Status', 'Update'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {counseling.bookings.map(b => {
                  const svc = counseling.services.find(s => s.id === b.serviceId)
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text">{b.studentName}</td>
                      <td className="px-4 py-3 text-brand-muted text-xs">{b.studentEmail}</td>
                      <td className="px-4 py-3 text-brand-muted text-xs max-w-[140px] truncate">{svc?.title || 'N/A'}</td>
                      <td className="px-4 py-3 text-brand-muted text-xs">{b.date}</td>
                      <td className="px-4 py-3 text-brand-muted text-xs">{b.time}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                      <td className="px-4 py-3">
                        <select
                          value={b.status}
                          onChange={e => counseling.updateBookingStatus(b.id, e.target.value as any)}
                          className="text-xs px-2 py-1 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text focus:outline-none"
                        >
                          {['Pending', 'Confirmed', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  )
                })}
                {counseling.bookings.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-brand-muted text-sm">No bookings yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── Guidance Requests (CRM) ─────────────────────────────────────────────────
  const renderGuidanceRequests = () => {
    const filtered = guidanceStore.requests.filter(r =>
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.mobile.includes(search)
    )
    const statuses = ['New', 'Contacted', 'Session Scheduled', 'Completed', 'Closed'] as const
    const totals = {
      all: guidanceStore.requests.length,
      new: guidanceStore.requests.filter(r => r.status === 'New').length,
      contacted: guidanceStore.requests.filter(r => r.status === 'Contacted').length,
      completed: guidanceStore.requests.filter(r => r.status === 'Completed').length,
    }
    return (
      <div className="space-y-5">
        <SectionHeader title="Guidance Requests" count={guidanceStore.requests.length} />

        {/* CRM stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', val: totals.all, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
            { label: 'New', val: totals.new, color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' },
            { label: 'Contacted', val: totals.contacted, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
            { label: 'Completed', val: totals.completed, color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
              <div className="text-2xl font-bold">{s.val}</div>
              <div className="text-xs font-semibold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, mobile..." />

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Student', 'Contact', 'Guidance Needed', 'Submitted', 'Status', 'Assigned Mentor', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-text dark:text-brand-dark-text">{r.fullName}</p>
                      <p className="text-xs text-brand-muted">{r.city}{r.state ? `, ${r.state}` : ''}</p>
                      {r.notes && <p className="text-[10px] mt-0.5 text-amber-600 dark:text-amber-400 italic truncate max-w-[160px]" title={r.notes}>📝 {r.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-brand-text dark:text-brand-dark-text font-medium">{r.mobile}</p>
                      <p className="text-xs text-brand-muted">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <div className="flex flex-wrap gap-1">
                        {r.guidanceTypes.slice(0, 2).map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full">{t}</span>
                        ))}
                        {r.guidanceTypes.length > 2 && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 text-brand-muted rounded-full">+{r.guidanceTypes.length - 2}</span>}
                      </div>
                      {r.additionalQuery && <p className="text-[10px] text-brand-muted mt-1 line-clamp-1">{r.additionalQuery}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-muted whitespace-nowrap">{r.createdAt}</td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        onChange={e => guidanceStore.updateStatus(r.id, e.target.value as any)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        {statuses.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={r.assignedMentor}
                        onChange={e => guidanceStore.assignMentor(r.id, e.target.value)}
                        placeholder="Assign mentor..."
                        className="text-xs px-2 py-1.5 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text focus:outline-none w-32"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setNoteEdit({ id: r.id, type: 'guidance', val: r.notes })}
                          className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500"
                          title="Add Note"
                        >
                          <MessageSquare size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId({ id: r.id, title: r.fullName, type: 'guidance-request' })}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-brand-muted text-sm">No guidance requests found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Note Edit Modal */}
        <AnimatePresence>
          {noteEdit?.type === 'guidance' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <h3 className="font-bold text-brand-text dark:text-brand-dark-text mb-3">Internal Note</h3>
                <textarea
                  value={noteEdit.val}
                  onChange={e => setNoteEdit(n => n ? { ...n, val: e.target.value } : n)}
                  rows={4}
                  placeholder="Add internal note about this student..."
                  className="w-full px-4 py-3 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none mb-4"
                />
                <div className="flex gap-3">
                  <button onClick={() => setNoteEdit(null)} className="flex-1 py-2.5 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text">Cancel</button>
                  <button onClick={() => { guidanceStore.addNote(noteEdit.id, noteEdit.val); setNoteEdit(null); toast.success('Note saved') }} className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold">Save Note</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ─── Counseling Requests (CRM) ────────────────────────────────────────────────
  const renderCounselingRequests = () => {
    const filtered = counselingReqStore.requests.filter(r =>
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.mobile.includes(search)
    )
    const statuses = ['New', 'Contacted', 'Counseling Scheduled', 'Counseling Completed', 'Closed'] as const
    const totals = {
      all: counselingReqStore.requests.length,
      new: counselingReqStore.requests.filter(r => r.status === 'New').length,
      contacted: counselingReqStore.requests.filter(r => r.status === 'Contacted').length,
      completed: counselingReqStore.requests.filter(r => r.status === 'Counseling Completed').length,
    }
    return (
      <div className="space-y-5">
        <SectionHeader title="Counseling Requests" count={counselingReqStore.requests.length} />

        {/* CRM stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', val: totals.all, color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' },
            { label: 'New', val: totals.new, color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' },
            { label: 'Contacted', val: totals.contacted, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
            { label: 'Completed', val: totals.completed, color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
              <div className="text-2xl font-bold">{s.val}</div>
              <div className="text-xs font-semibold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, mobile..." />

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Student', 'Contact', 'Exam / Counseling', 'Submitted', 'Status', 'Assigned Counselor', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-text dark:text-brand-dark-text">{r.fullName}</p>
                      <p className="text-xs text-brand-muted">{r.city}{r.state ? `, ${r.state}` : ''}</p>
                      {r.notes && <p className="text-[10px] mt-0.5 text-amber-600 dark:text-amber-400 italic truncate max-w-[160px]" title={r.notes}>📝 {r.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-brand-text dark:text-brand-dark-text font-medium">{r.mobile}</p>
                      <p className="text-xs text-brand-muted">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full font-medium">{r.counselingType}</span>
                      {r.examName && <p className="text-[10px] text-brand-muted mt-1">{r.examName}{r.rank ? ` · Rank ${r.rank}` : ''}</p>}
                      {r.preferredBranch && <p className="text-[10px] text-brand-muted">{r.preferredBranch}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-muted whitespace-nowrap">{r.createdAt}</td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        onChange={e => counselingReqStore.updateStatus(r.id, e.target.value as any)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        {statuses.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={r.assignedCounselor}
                        onChange={e => counselingReqStore.assignCounselor(r.id, e.target.value)}
                        placeholder="Assign counselor..."
                        className="text-xs px-2 py-1.5 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text focus:outline-none w-32"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setNoteEdit({ id: r.id, type: 'counseling', val: r.notes })}
                          className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500"
                          title="Add Note"
                        >
                          <MessageSquare size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId({ id: r.id, title: r.fullName, type: 'counseling-request' })}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-brand-muted text-sm">No counseling requests found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Note Edit Modal */}
        <AnimatePresence>
          {noteEdit?.type === 'counseling' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <h3 className="font-bold text-brand-text dark:text-brand-dark-text mb-3">Internal Note</h3>
                <textarea
                  value={noteEdit.val}
                  onChange={e => setNoteEdit(n => n ? { ...n, val: e.target.value } : n)}
                  rows={4}
                  placeholder="Add internal note about this student..."
                  className="w-full px-4 py-3 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none mb-4"
                />
                <div className="flex gap-3">
                  <button onClick={() => setNoteEdit(null)} className="flex-1 py-2.5 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text">Cancel</button>
                  <button onClick={() => { counselingReqStore.addNote(noteEdit.id, noteEdit.val); setNoteEdit(null); toast.success('Note saved') }} className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold">Save Note</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
                  <td className="px-4 py-3 text-brand-muted">{m.sessions.toLocaleString()}</td>
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

  // ─── Testimonials ────────────────────────────────────────────────────────────
  const renderTestimonials = () => (
    <div className="space-y-6">
      <SectionHeader title="Testimonials & Success Stories" count={testimonialStore.testimonials.length + testimonialStore.stories.length} onAdd={() => openAdd('testimonial')} addLabel="Add Testimonial" />

      <div>
        <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text mb-3">Testimonials ({testimonialStore.testimonials.length})</h3>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Student', 'Type', 'Achievement', 'Rating', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {testimonialStore.testimonials.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-brand-text dark:text-brand-dark-text">{t.studentName}</p>
                        <p className="text-xs text-brand-muted">{t.designation}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="badge bg-primary-50 dark:bg-primary-900/20 text-primary-600 text-xs">{t.type}</span></td>
                    <td className="px-4 py-3 text-xs text-brand-muted max-w-[180px] truncate">{t.achievement || '—'}</td>
                    <td className="px-4 py-3 text-amber-500">{'⭐'.repeat(t.rating)}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => testimonialStore.toggleTestimonialStatus(t.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><EyeOff size={14} /></button>
                        <button onClick={() => openEdit({ ...t, _type: 'testimonial' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteId({ id: t.id, title: t.studentName, type: 'testimonial' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text">Success Stories ({testimonialStore.stories.length})</h3>
          <button onClick={() => openAdd('story')} className="flex items-center gap-1.5 text-xs font-semibold text-primary-500 hover:underline"><Plus size={13} /> Add Story</button>
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>{['Student', 'From', 'To', 'Package', 'Type', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                {testimonialStore.stories.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text">{s.studentName}</td>
                    <td className="px-4 py-3 text-brand-muted text-xs">{s.fromCollege}</td>
                    <td className="px-4 py-3 text-brand-muted text-xs">{s.toCompany || s.toCollege || '—'}</td>
                    <td className="px-4 py-3 text-green-600 font-semibold text-xs">{s.package || '—'}</td>
                    <td className="px-4 py-3"><span className="badge bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-xs">{s.type}</span></td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => testimonialStore.toggleStoryStatus(s.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"><EyeOff size={14} /></button>
                        <button onClick={() => openEdit({ ...s, _type: 'story' })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteId({ id: s.id, title: s.studentName, type: 'story' })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )

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
    const [deleteId, setDeleteId] = useState<string | null>(null)

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
      setDeleteId(null)
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
                        <button onClick={() => setDeleteId(video.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
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
          {deleteId && (
            <DeleteModal
              title={videos.find(v => v.id === deleteId)?.title || ''}
              onConfirm={() => handleDelete(deleteId)}
              onCancel={() => setDeleteId(null)}
            />
          )}
        </AnimatePresence>
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
          { label: 'Counseling Form URL', val: 'forms.gle/BpcgGfoKjG1SVgFPA' },
          { label: 'Total Content Items', val: `${content.courses.length + content.resources.length + content.quizzes.length + content.roadmaps.length}` },
          { label: 'Total Active Users', val: users.filter((u: any) => !u.disabled).length.toString() },
          { label: 'Total Bookings', val: (counseling.bookings.length + mentors.sessions.length).toString() },
        ].map(s => (
          <div key={s.label} className="flex items-center justify-between py-3 border-b border-brand-border dark:border-brand-dark-border">
            <span className="text-sm font-medium text-brand-text dark:text-brand-dark-text">{s.label}</span>
            <span className="text-sm text-brand-muted dark:text-brand-dark-muted font-mono">{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // ─── Delete handler ──────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!deleteId) return
    const { id, type } = deleteId
    switch (type) {
      case 'course': content.deleteCourse(id); break
      case 'resource': content.deleteResource(id); break
      case 'quiz': content.deleteQuiz(id); break
      case 'roadmap': content.deleteRoadmap(id); break
      case 'hackathon': events.deleteHackathon(id); break
      case 'internship': training.deleteInternship(id); break
      case 'counseling': counseling.deleteService(id); break
      case 'mentor': mentors.deleteMentor(id); break
      case 'testimonial': testimonialStore.deleteTestimonial(id); break
      case 'story': testimonialStore.deleteStory(id); break
      case 'guidance-request': guidanceStore.deleteRequest(id); break
      case 'counseling-request': counselingReqStore.deleteRequest(id); break
    }
    toast.success(`${deleteId.title} deleted successfully`)
    setDeleteId(null)
  }

  // ─── Quick Add Modal ─────────────────────────────────────────────────────────
  const renderModal = () => {
    if (!editItem) return null
    const type = editItem._type

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

    // Generic modal for other types (resource, quiz, hackathon, etc.)
    const handleGenericSave = () => {
      const title = editItem.title || editItem.name || editItem.studentName || 'Item'
      if (!title || title === 'Item') { toast.error('Required fields missing'); return }

      switch (type) {
        case 'resource':
          if (editItem.id) content.updateResource(editItem.id, editItem)
          else content.addResource({ ...editItem, status: editItem.status || 'Draft' })
          break
        case 'quiz':
          if (editItem.id) content.updateQuiz(editItem.id, editItem)
          else content.addQuiz({ ...editItem, questions: [], status: 'Draft', maxScore: 100 })
          break
        case 'roadmap':
          if (editItem.id) content.updateRoadmap(editItem.id, editItem)
          else content.addRoadmap({ ...editItem, steps: [], status: 'Draft' })
          break
        case 'hackathon':
          if (editItem.id) events.updateHackathon(editItem.id, editItem)
          else events.addHackathon({ ...editItem, publishStatus: 'Draft', tags: [] })
          break
        case 'internship':
          if (editItem.id) training.updateInternship(editItem.id, editItem)
          else training.addInternship({ ...editItem, status: 'Draft', skills: [] })
          break
        case 'counseling':
          if (editItem.id) counseling.updateService(editItem.id, editItem)
          else counseling.addService({ ...editItem, status: 'Draft', features: [], counselorIds: [] })
          break
        case 'mentor':
          if (editItem.id) mentors.updateMentor(editItem.id, editItem)
          else mentors.addMentor({ ...editItem, services: [], fees: {}, expertise: [], status: 'Active', rating: 5, reviews: 0, sessions: 0 })
          break
        case 'testimonial':
          if (editItem.id) testimonialStore.updateTestimonial(editItem.id, editItem)
          else testimonialStore.addTestimonial({ ...editItem, status: 'Draft', featured: false })
          break
        case 'story':
          if (editItem.id) testimonialStore.updateStory(editItem.id, editItem)
          else testimonialStore.addStory({ ...editItem, status: 'Draft', featured: false })
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
      case 'hackathons': return renderHackathons()
      case 'internships': return renderInternships()
      case 'counseling': return renderCounseling()
      case 'mentorship': return renderMentorship()
      case 'guidance-requests': return renderGuidanceRequests()
      case 'counseling-requests': return renderCounselingRequests()
      case 'testimonials': return renderTestimonials()
      case 'youtube-videos': return renderYoutubeVideos()
      case 'users': return renderUsers()
      case 'settings': return renderSettings()
      default: return null
    }
  }

  const groups = Array.from(new Set(sidebarItems.map(i => i.group || 'Main')))

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-5">
          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col w-60 flex-shrink-0">
            <div className="card p-4 sticky top-24">
              <div className="flex items-center gap-2.5 mb-5 pb-5 border-b border-brand-border dark:border-brand-dark-border">
                <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
                  <Shield size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-text dark:text-brand-dark-text text-sm">Admin Panel</h3>
                  <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted">Skill021</p>
                </div>
              </div>
              <nav className="space-y-0.5">
                {sidebarItems.map((item, idx) => {
                  const prevGroup = idx > 0 ? (sidebarItems[idx - 1].group || 'Main') : null
                  const currGroup = item.group || 'Main'
                  const showDivider = prevGroup && prevGroup !== currGroup
                  return (
                    <div key={item.id}>
                      {showDivider && (
                        <div className="pt-2 pb-1 px-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted">{currGroup}</p>
                        </div>
                      )}
                      <button
                        onClick={() => { setActiveTab(item.id); setSearch('') }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          activeTab === item.id ? 'bg-primary-500 text-white shadow-sm' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <item.icon size={16} />
                        {item.label}
                      </button>
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
                onClick={() => { setActiveTab(item.id); setSearch('') }}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] transition-colors ${activeTab === item.id ? 'text-primary-500' : 'text-brand-muted dark:text-brand-dark-muted'}`}
              >
                <item.icon size={17} />
                <span className="whitespace-nowrap">{item.label.split(' ').slice(-1)}</span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <main className="flex-1 min-w-0 pb-24 lg:pb-0">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              {renderContent()}
            </motion.div>
          </main>
        </div>
      </div>

      {/* Delete Modal */}
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
        {showModal && editItem && renderModal()}
      </AnimatePresence>
    </div>
  )
}
