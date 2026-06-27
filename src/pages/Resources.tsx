import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import {
  FileText, Download, Bookmark, Share2, Lock, Search,
  Clock, BookOpen, ChevronDown, Eye
} from 'lucide-react'
import { useContentStore, ResourceType, ResourceCategory } from '../store/contentStore'
import toast from 'react-hot-toast'

const RESOURCE_TYPES: { label: ResourceType; icon: typeof FileText }[] = [
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

const CATEGORY_GROUPS = [
  {
    label: 'School Resources',
    categories: ['Class 1-5', 'Class 6-8', 'Class 9-10', 'Class 11-12'] as ResourceCategory[],
  },
  {
    label: 'Competitive Exams',
    categories: ['JEE', 'NEET', 'CUET', 'Olympiads'] as ResourceCategory[],
  },
  {
    label: 'Tech & Coding',
    categories: ['DSA', 'Web Development', 'Flutter', 'AI/ML', 'Data Science', 'Cyber Security', 'Cloud Computing'] as ResourceCategory[],
  },
  {
    label: 'Counseling Guides',
    categories: ['JoSAA', 'AKTU', 'IPU', 'JAC Delhi', 'NEET Counseling', 'LPU', 'VIT', 'BITS'] as ResourceCategory[],
  },
]

function ResourceCard({ resource }: { resource: ReturnType<typeof useContentStore>['resources'][0] }) {
  const [bookmarked, setBookmarked] = useState(false)

  const handleDownload = () => {
    if (resource.isPremium) {
      toast.error('This is a premium resource. Please purchase to download.')
      return
    }
    toast.success(`Downloading: ${resource.title}`)
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => toast.success('Link copied to clipboard!'))
  }

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
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
          <FileText size={22} className="text-brand-muted dark:text-brand-dark-muted" />
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
        <span className="flex items-center gap-1"><Download size={11} />{resource.downloads.toLocaleString()}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {resource.isPremium ? (
          <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#0A0A0A] text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors">
            <Lock size={13} /> Unlock for ₹{resource.price}
          </button>
        ) : (
          <button
            onClick={handleDownload}
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
  const { resources } = useContentStore()
  const [searchParams] = useSearchParams()
  const initType = searchParams.get('type') as ResourceType | null

  const [activeType, setActiveType] = useState<ResourceType | null>(initType)
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | null>(null)
  const [search, setSearch] = useState('')
  const [showPremium, setShowPremium] = useState<'all' | 'free' | 'premium'>('all')
  const [expandedGroup, setExpandedGroup] = useState<string | null>('School Resources')

  const published = resources.filter(r => r.status === 'Published')

  const filtered = useMemo(() => {
    return published.filter(r => {
      if (activeType && r.type !== activeType) return false
      if (activeCategory && r.category !== activeCategory) return false
      if (showPremium === 'free' && r.isPremium) return false
      if (showPremium === 'premium' && !r.isPremium) return false
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [published, activeType, activeCategory, search, showPremium])

  const totalDownloads = published.reduce((acc, r) => acc + r.downloads, 0)

  return (
    <div className="min-h-screen bg-white dark:bg-brand-dark-bg pt-16">
      {/* Hero — clean */}
      <div className="bg-gray-50 dark:bg-brand-dark-card border-b border-gray-100 dark:border-brand-dark-border py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block px-3 py-1 text-xs font-semibold text-brand-muted dark:text-brand-dark-muted border border-gray-200 dark:border-brand-dark-border rounded-full mb-4 uppercase tracking-widest">
              Learning Library
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-brand-text dark:text-brand-dark-text mb-4 tracking-tight">
              The Ultimate Learning Library
            </h1>
            <p className="text-brand-muted dark:text-brand-dark-muted max-w-2xl mx-auto mb-6">
              {published.length}+ resources across notes, PYQs, roadmaps, cheat sheets and more — curated for every student.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-brand-muted dark:text-brand-dark-muted mb-8">
              <span className="flex items-center gap-2"><Download size={14} />{(totalDownloads / 1000).toFixed(0)}K+ downloads</span>
              <span className="flex items-center gap-2"><Eye size={14} />Expert verified</span>
              <span className="flex items-center gap-2"><FileText size={14} />Free & Premium</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative max-w-lg mx-auto"
          >
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search resources..."
              className="input pl-12"
            />
          </motion.div>
        </div>
      </div>

      {/* Resource Type Tabs */}
      <div className="sticky top-16 z-30 bg-white dark:bg-brand-dark-bg border-b border-gray-100 dark:border-brand-dark-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
            <button
              onClick={() => setActiveType(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${!activeType ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              All ({published.length})
            </button>
            {RESOURCE_TYPES.map(t => {
              const cnt = published.filter(r => r.type === t.label).length
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

            {/* Categories */}
            <div className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-3">Category</h3>
              <button
                onClick={() => setActiveCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${!activeCategory ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}
              >
                All Categories
              </button>
              {CATEGORY_GROUPS.map(grp => (
                <div key={grp.label} className="mb-2">
                  <button
                    onClick={() => setExpandedGroup(expandedGroup === grp.label ? null : grp.label)}
                    className="w-full text-left px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between text-brand-muted dark:text-brand-dark-muted"
                  >
                    {grp.label}
                    <ChevronDown size={11} className={`transition-transform ${expandedGroup === grp.label ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {expandedGroup === grp.label && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        {grp.categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`w-full text-left pl-4 pr-2 py-1.5 text-sm rounded-lg transition-colors ${activeCategory === cat ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold' : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text">
                {activeType || (activeCategory ? activeCategory + ' Resources' : 'All Resources')}
              </h2>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">{filtered.length} resource{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <FileText size={48} className="mx-auto text-gray-200 dark:text-brand-dark-muted mb-4" />
              <h3 className="text-lg font-semibold text-brand-text dark:text-brand-dark-text mb-2">No resources found</h3>
              <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Try changing filters or search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {filtered.map(r => <ResourceCard key={r.id} resource={r} />)}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
