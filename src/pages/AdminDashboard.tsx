import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, FileText, HelpCircle, Map,
  Users, Settings, Plus, Edit2, Trash2, Search,
  X, Shield, TrendingUp, Eye, Download, EyeOff,
  CheckCircle, Zap, Video
} from 'lucide-react'
import { useContentStore, Course, Resource, Quiz, Roadmap } from '../store/contentStore'
import { useMentorStore } from '../store/mentorStore'
import { useVideoStore, YouTubeVideo } from '../store/videoStore'
import toast from 'react-hot-toast'

type AdminTab =
  | 'overview' | 'courses' | 'resources' | 'quizzes' | 'roadmaps'
  | 'mentorship' | 'youtube-videos' | 'users' | 'settings'

const sidebarItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'courses', label: 'Courses', icon: BookOpen, group: 'Content' },
  { id: 'resources', label: 'Resources', icon: FileText, group: 'Content' },
  { id: 'quizzes', label: 'Quizzes', icon: HelpCircle, group: 'Content' },
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, group: 'Content' },
  { id: 'youtube-videos', label: 'YouTube Videos', icon: Video, group: 'Content' },
  { id: 'mentorship', label: 'Mentorship', icon: Users, group: 'Services' },
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
  const mentors = useMentorStore()

  // Users from localStorage
  const users = JSON.parse(localStorage.getItem('skills021_users') || '[]')

  const openAdd = (type?: string) => { setEditItem({ _type: type }); setShowModal(true) }
  const openEdit = (item: any) => { setEditItem(item); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  // ─── Overview ───────────────────────────────────────────────────────────────
  const renderOverview = () => {
    const statsCards = [
      { label: 'Total Courses', val: content.courses.length, icon: BookOpen, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
      { label: 'Resources', val: content.resources.length, icon: FileText, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
      { label: 'Quizzes', val: content.quizzes.length, icon: HelpCircle, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
      { label: 'Roadmaps', val: content.roadmaps.length, icon: Map, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
      { label: 'Active Mentors', val: mentors.mentors.filter(m => m.status === 'Active').length, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
      { label: 'Total Users', val: users.length, icon: Users, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    ]

    const totalDownloads = content.resources.reduce((a, r) => a + r.downloads, 0)
    const totalEnrolled = content.courses.reduce((a, c) => a + c.enrolled, 0)
    const totalQuizParticipants = content.quizzes.reduce((a, q) => a + q.participants, 0)
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
            { val: totalDownloads.toLocaleString(), label: 'Resource Downloads', icon: Download, color: 'text-teal-500' },
            { val: totalEnrolled.toLocaleString(), label: 'Course Enrollments', icon: BookOpen, color: 'text-primary-500' },
            { val: totalQuizParticipants.toLocaleString(), label: 'Quiz Participants', icon: HelpCircle, color: 'text-purple-500' },
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
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted">{c.enrolled.toLocaleString()} enrolled</p>
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
          { label: 'Total Content Items', val: `${content.courses.length + content.resources.length + content.quizzes.length + content.roadmaps.length}` },
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

  // ─── Delete handler ──────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!deleteId) return
    const { id, type } = deleteId
    switch (type) {
      case 'course': content.deleteCourse(id); break
      case 'resource': content.deleteResource(id); break
      case 'quiz': content.deleteQuiz(id); break
      case 'roadmap': content.deleteRoadmap(id); break
      case 'mentor': mentors.deleteMentor(id); break
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

    // Generic modal for other types
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
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                            activeTab === item.id
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
            {sidebarItems.slice(0, 6).map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-3 text-xs transition-colors ${
                  activeTab === item.id ? 'text-primary-500' : 'text-brand-muted dark:text-brand-dark-muted'
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
    </div>
  )
}
