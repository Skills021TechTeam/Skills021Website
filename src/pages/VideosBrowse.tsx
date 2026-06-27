import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Play, Calendar, Clock, ChevronDown, Filter, X
} from 'lucide-react'
import { useVideoStore, VideoCategory } from '../store/videoStore'
import YouTubeVideoCard from '../components/YouTubeVideoCard'

const VIDEO_CATEGORIES: VideoCategory[] = [
  'DSA', 'JEE', 'NEET', 'AI/ML', 'Counseling', 'Career Guidance',
  'Interview Prep', 'Web Development', 'Python', 'Aptitude', 'Study Tips'
]

export default function VideosPage() {
  const videoStore = useVideoStore()
  const videos = videoStore.getPublishedVideos()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | 'All'>('All')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<any>(null)

  const filtered = useMemo(() => {
    return videos.filter(video => {
      const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || video.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [videos, searchQuery, selectedCategory])

  const stats = {
    total: videos.length,
    byCategory: VIDEO_CATEGORIES.map(cat => ({
      category: cat,
      count: videos.filter(v => v.category === cat).length
    }))
  }

  return (
    <div className="min-h-screen bg-white dark:bg-brand-dark-bg pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-black text-brand-text dark:text-brand-dark-text mb-3">
            All Educational Videos
          </h1>
          <p className="text-lg text-brand-muted dark:text-brand-dark-muted">
            Browse our complete library of {videos.length}+ video tutorials, guidance sessions, and learning resources.
          </p>
        </motion.div>

        {/* Search & Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex gap-3 flex-col sm:flex-row">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                type="text"
                placeholder="Search by title, topic, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text placeholder:text-brand-muted dark:placeholder:text-brand-dark-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <Filter size={18} />
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-brand-text dark:text-brand-dark-text">Filter by Category</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      selectedCategory === 'All'
                        ? 'bg-primary-500 text-white'
                        : 'bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text border border-brand-border dark:border-brand-dark-border hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    All Categories
                  </button>

                  {VIDEO_CATEGORIES.map((cat) => {
                    const count = videos.filter(v => v.category === cat).length
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          selectedCategory === cat
                            ? 'bg-primary-500 text-white'
                            : 'bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text border border-brand-border dark:border-brand-dark-border hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        {cat}
                        <span className="ml-1 text-xs opacity-70">({count})</span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8 p-4 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-700/50"
        >
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="font-bold text-primary-600 dark:text-primary-400 text-lg">{filtered.length}</span>
              <span className="text-brand-text dark:text-brand-dark-text ml-2">Videos Found</span>
            </div>
            <div className="w-px h-6 bg-primary-200 dark:bg-primary-700"></div>
            <div className="text-brand-muted dark:text-brand-dark-muted">
              {selectedCategory === 'All'
                ? `Showing all ${videos.length} videos`
                : `Showing ${filtered.length} ${selectedCategory} videos`}
            </div>
          </div>
        </motion.div>

        {/* Videos Grid */}
        {filtered.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((video, idx) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedVideo(video)}
                  className="cursor-pointer"
                >
                  <YouTubeVideoCard
                    video={video}
                    onPlay={() => setSelectedVideo(video)}
                    layout="grid"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Play size={48} className="mx-auto text-brand-muted dark:text-brand-dark-muted mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-2">
              No videos found
            </h3>
            <p className="text-brand-muted dark:text-brand-dark-muted mb-6">
              Try adjusting your search or filters
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('All')
              }}
              className="px-6 py-2.5 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
            >
              Clear Filters
            </button>
          </motion.div>
        )}

        {/* Video Modal */}
        <AnimatePresence>
          {selectedVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVideo(null)}
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={24} className="text-white" />
                </button>

                {/* Video Container */}
                <div className="aspect-video">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${selectedVideo.videoId}`}
                    title={selectedVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>

                {/* Video Info */}
                <div className="bg-gray-900 p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{selectedVideo.title}</h3>
                  <p className="text-gray-300 text-sm mb-4">{selectedVideo.description}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-semibold text-white bg-red-600 px-3 py-1 rounded-full">
                      {selectedVideo.category}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(selectedVideo.uploadDate).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={12} />
                      {selectedVideo.duration}
                    </span>
                    <a
                      href={selectedVideo.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors ml-auto"
                    >
                      Watch on YouTube →
                    </a>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
