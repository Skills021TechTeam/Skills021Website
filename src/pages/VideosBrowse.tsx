import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Play, Clock, Filter, X, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useVideoStore, VideoCategory } from '../store/videoStore'

const VIDEO_CATEGORIES: VideoCategory[] = [
  'DSA', 'JEE', 'NEET', 'AI/ML', 'Counseling', 'Career Guidance',
  'Interview Prep', 'Web Development', 'Python', 'Aptitude', 'Study Tips',
]

export default function VideosPage() {
  const navigate = useNavigate()
  const videoStore = useVideoStore()
  const videos = videoStore.getPublishedVideos()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | 'All'>('All')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    return videos.filter(video => {
      const matchesSearch =
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || video.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [videos, searchQuery, selectedCategory])

  return (
    <div className="min-h-screen bg-white dark:bg-brand-dark-bg pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-brand-text dark:text-brand-dark-text mb-3">
            Educational Videos
          </h1>
          <p className="text-lg text-brand-muted dark:text-brand-dark-muted">
            Browse {videos.length}+ video tutorials, guidance sessions, and learning resources.
          </p>
          {/* Protected notice */}
          <div className="flex items-center gap-2 mt-3 text-xs text-brand-muted dark:text-brand-dark-muted">
            <Shield size={13} className="text-primary-500" />
            All videos are DRM-protected. Screen recording is disabled.
          </div>
        </motion.div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-6 flex-col sm:flex-row">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text font-semibold hover:bg-gray-50 dark:hover:bg-white/5"
          >
            {showFilters ? <X size={16} /> : <Filter size={16} />}
            {selectedCategory !== 'All' ? selectedCategory : 'Filter'}
          </button>
        </div>

        {/* Category Pills */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                selectedCategory === 'All'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-brand-muted dark:text-brand-dark-muted hover:bg-gray-200 dark:hover:bg-white/20'
              }`}
            >
              All ({videos.length})
            </button>
            {VIDEO_CATEGORIES.map(cat => {
              const cnt = videos.filter(v => v.category === cat).length
              if (cnt === 0) return null
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-white/10 text-brand-muted dark:text-brand-dark-muted hover:bg-gray-200 dark:hover:bg-white/20'
                  }`}
                >
                  {cat} ({cnt})
                </button>
              )
            })}
          </div>
        )}

        {/* Results count */}
        <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-5">
          {filtered.length} video{filtered.length !== 1 ? 's' : ''} found
        </p>

        {/* Video Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <Play size={48} className="mx-auto text-gray-200 dark:text-brand-dark-muted mb-4" />
            <h3 className="text-lg font-semibold text-brand-text dark:text-brand-dark-text mb-2">No videos found</h3>
            <p className="text-brand-muted dark:text-brand-dark-muted text-sm">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(video => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/videos/${video.id}`)}
                className="bg-white dark:bg-brand-dark-card rounded-2xl border border-brand-border dark:border-brand-dark-border overflow-hidden cursor-pointer group hover:shadow-card-hover transition-all"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-900 overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                    onError={e => { e.currentTarget.src = 'https://via.placeholder.com/320x180?text=Video' }}
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  {/* Play */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40">
                      <Play size={18} className="text-white ml-0.5" />
                    </div>
                  </div>
                  {/* Duration badge */}
                  {video.duration && (
                    <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded font-mono">
                      {video.duration}
                    </span>
                  )}
                  {/* Featured */}
                  {video.featured && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                      ⭐ Featured
                    </span>
                  )}
                  {/* Chapter count */}
                  {video.timestamps?.length > 0 && (
                    <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                      <Clock size={9} /> {video.timestamps.length} chapters
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {video.category}
                  </span>
                  <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text mt-2 line-clamp-2 leading-snug group-hover:text-primary-500 transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1 line-clamp-1">
                    {video.uploadDate}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
