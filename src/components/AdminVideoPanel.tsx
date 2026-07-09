// ─────────────────────────────────────────────────────────────────────────────
// FILE: src/components/AdminVideoPanel.tsx
// Replace `renderYoutubeVideos` in AdminDashboard.tsx with:
//   import AdminVideoPanel from '../components/AdminVideoPanel'
// Then inside renderContent switch: case 'youtube-videos': return <AdminVideoPanel />
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Search, Clock, X, Check
} from 'lucide-react'
import { useVideoStore, YouTubeVideo, VideoTimestamp } from '../store/videoStore'
import toast from 'react-hot-toast'

// ── Shared helpers (copy from AdminDashboard or import) ──────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    Published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function SectionHeader({
  title, count, onAdd, addLabel = 'Add New',
}: {
  title: string; count?: number; onAdd?: () => void; addLabel?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">{title}</h2>
        {count !== undefined && (
          <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">{count} items</p>
        )}
      </div>
      {onAdd && (
        <button onClick={onAdd} className="flex items-center gap-2 btn-primary text-sm py-2.5 px-4">
          <Plus size={15} /> {addLabel}
        </button>
      )}
    </div>
  )
}

const inputCls =
  'w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500'

function DeleteModal({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-sm w-full shadow-xl"
      >
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text text-center mb-2">
          Delete "{title}"?
        </h3>
        <p className="text-sm text-brand-muted dark:text-brand-dark-muted text-center mb-6">
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600">Delete</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Format seconds → mm:ss ───────────────────────────────────────────────────
function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}
function parseTime(str: string): number {
  const parts = str.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

// ─── Timestamp Manager Modal ──────────────────────────────────────────────────
function TimestampManager({
  video,
  onClose,
}: {
  video: YouTubeVideo
  onClose: () => void
}) {
  const store = useVideoStore()
  const [newTime, setNewTime] = useState('')
  const [newLabel, setNewLabel] = useState('')

  const add = () => {
    if (!newLabel.trim() || !newTime.trim()) {
      toast.error('Enter both time and label')
      return
    }
    const seconds = parseTime(newTime.trim())
    store.addTimestamp(video.id, { time: seconds, label: newLabel.trim() })
    setNewTime('')
    setNewLabel('')
    toast.success('Timestamp added')
  }

  const del = (tsId: string) => {
    store.deleteTimestamp(video.id, tsId)
    toast.success('Timestamp removed')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-brand-text dark:text-brand-dark-text">Manage Timestamps</h3>
            <p className="text-xs text-brand-muted dark:text-brand-dark-muted truncate max-w-[260px] mt-0.5">{video.title}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-brand-muted" /></button>
        </div>

        {/* Existing timestamps */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
          {video.timestamps.length === 0 && (
            <p className="text-sm text-center text-brand-muted dark:text-brand-dark-muted py-6">No timestamps yet.</p>
          )}
          {video.timestamps.map(ts => (
            <div key={ts.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
              <span className="text-xs font-mono font-bold text-primary-500 min-w-[48px]">{formatTime(ts.time)}</span>
              <span className="flex-1 text-sm text-brand-text dark:text-brand-dark-text">{ts.label}</span>
              <button onClick={() => del(ts.id)} className="p-1 text-red-400 hover:text-red-500">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Add new */}
        <div className="border-t border-brand-border dark:border-brand-dark-border pt-4">
          <p className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-2 uppercase tracking-wide">
            Add Timestamp
          </p>
          <div className="flex gap-2 mb-2">
            <input
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              placeholder="mm:ss (e.g. 2:30)"
              className="w-32 px-3 py-2 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="Chapter label..."
              className="flex-1 px-3 py-2 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button onClick={add} className="p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600">
              <Check size={16} />
            </button>
          </div>
          <p className="text-[10px] text-brand-muted">Format: m:ss or h:mm:ss · e.g. 1:30 = 1 min 30 sec</p>
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2.5 bg-gray-100 dark:bg-white/10 text-brand-text dark:text-brand-dark-text rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-white/20">
          Done
        </button>
      </motion.div>
    </motion.div>
  )
}

// ─── Video Form Modal ─────────────────────────────────────────────────────────
const VIDEO_CATEGORIES = [
  'DSA', 'JEE', 'NEET', 'AI/ML', 'Counseling', 'Career Guidance',
  'Interview Prep', 'Web Development', 'Python', 'Aptitude', 'Study Tips',
] as const

function VideoFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<YouTubeVideo>
  onSave: (data: Partial<YouTubeVideo>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<YouTubeVideo>>({
    youtubeUrl: '',
    title: '',
    description: '',
    category: 'DSA',
    duration: '',
    featured: false,
    status: 'Draft',
    ...initial,
  })

  const save = () => {
    if (!form.youtubeUrl?.trim() || !form.title?.trim()) {
      toast.error('YouTube URL and Title are required')
      return
    }
    onSave(form)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-lg w-full shadow-xl my-4"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">
            {initial?.id ? 'Edit Video' : 'Add Video'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-brand-muted" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">YouTube URL *</label>
            <input
              type="url"
              value={form.youtubeUrl || ''}
              onChange={e => setForm(f => ({ ...f, youtubeUrl: e.target.value }))}
              placeholder="https://www.youtube.com/watch?v=..."
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">Video Title *</label>
            <input
              value={form.title || ''}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Enter video title"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">Description</label>
            <textarea
              value={form.description || ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Video description"
              className={inputCls + ' resize-none'}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">Category</label>
              <select
                value={form.category || 'DSA'}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
                className={inputCls}
              >
                {VIDEO_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">Duration</label>
              <input
                value={form.duration || ''}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                placeholder="e.g. 45:30"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">Status</label>
              <select
                value={form.status || 'Draft'}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                className={inputCls}
              >
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.featured || false}
                  onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-medium text-brand-text dark:text-brand-dark-text">Featured Video</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5">
            Cancel
          </button>
          <button onClick={save} className="flex-1 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600">
            {initial?.id ? 'Update' : 'Add'} Video
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Admin Video Panel ───────────────────────────────────────────────────
export default function AdminVideoPanel() {
  const store = useVideoStore()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editVideo, setEditVideo] = useState<YouTubeVideo | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [tsVideo, setTsVideo] = useState<YouTubeVideo | null>(null)

  const filtered = store.videos.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = (data: Partial<YouTubeVideo>) => {
    if (editVideo) {
      store.updateVideo(editVideo.id, data)
      toast.success('Video updated!')
    } else {
      store.addVideo(data as Omit<YouTubeVideo, 'id' | 'createdAt' | 'videoId' | 'thumbnail' | 'timestamps'>)
      toast.success('Video added!')
    }
    setShowForm(false)
    setEditVideo(null)
  }

  const handleDelete = () => {
    if (!deleteId) return
    store.deleteVideo(deleteId)
    toast.success('Video deleted!')
    setDeleteId(null)
  }

  return (
    <div>
      <SectionHeader
        title="Manage Videos"
        count={store.videos.length}
        onAdd={() => { setEditVideo(null); setShowForm(true) }}
        addLabel="Add Video"
      />

      {/* Search */}
      <div className="relative w-full max-w-xs mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search videos..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                {['Thumbnail', 'Title', 'Category', 'Duration', 'Status', 'Featured', 'Timestamps', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
              {filtered.map(video => (
                <tr key={video.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-16 h-9 rounded object-cover bg-gray-100"
                      onError={e => { e.currentTarget.src = 'https://via.placeholder.com/64x36?text=Video' }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-text dark:text-brand-dark-text line-clamp-1 max-w-[200px]">{video.title}</p>
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted">{video.uploadDate}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {video.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-muted text-xs">{video.duration || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={video.status} /></td>
                  <td className="px-4 py-3 text-center">{video.featured ? '⭐' : '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setTsVideo(video)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-colors"
                    >
                      <Clock size={11} /> {video.timestamps.length} chapters
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => store.toggleFeatured(video.id)}
                        title="Toggle featured"
                        className="p-1.5 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/20 text-yellow-500"
                      >⭐</button>
                      <button
                        onClick={() => store.toggleVideoStatus(video.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted"
                      ><EyeOff size={14} /></button>
                      <button
                        onClick={() => { setEditVideo(video); setShowForm(true) }}
                        className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500"
                      ><Edit2 size={14} /></button>
                      <button
                        onClick={() => setDeleteId(video.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                      ><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-brand-muted dark:text-brand-dark-muted">
                    No videos found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <VideoFormModal
            initial={editVideo || undefined}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditVideo(null) }}
          />
        )}
        {deleteId && (
          <DeleteModal
            title={store.videos.find(v => v.id === deleteId)?.title || ''}
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
          />
        )}
        {tsVideo && (
          <TimestampManager
            video={tsVideo}
            onClose={() => setTsVideo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
