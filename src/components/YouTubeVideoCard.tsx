import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Calendar, Clock } from 'lucide-react'
import { YouTubeVideo } from '../store/videoStore'

interface YouTubeVideoCardProps {
  video: YouTubeVideo
  onPlay: (video: YouTubeVideo) => void
  layout?: 'carousel' | 'grid'
}

export default function YouTubeVideoCard({ video, onPlay, layout = 'carousel' }: YouTubeVideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Category colors
  const categoryColors: Record<string, { bg: string; text: string }> = {
    'DSA': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'JEE': { bg: 'bg-purple-100', text: 'text-purple-700' },
    'NEET': { bg: 'bg-green-100', text: 'text-green-700' },
    'AI/ML': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    'Counseling': { bg: 'bg-pink-100', text: 'text-pink-700' },
    'Career Guidance': { bg: 'bg-orange-100', text: 'text-orange-700' },
    'Interview Prep': { bg: 'bg-red-100', text: 'text-red-700' },
    'Web Development': { bg: 'bg-teal-100', text: 'text-teal-700' },
    'Python': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    'Aptitude': { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    'Study Tips': { bg: 'bg-amber-100', text: 'text-amber-700' },
  }

  const colors = categoryColors[video.category] || { bg: 'bg-gray-100', text: 'text-gray-700' }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3 }}
      className="flex-shrink-0 h-full"
    >
      <div
        className={`group relative h-full rounded-2xl overflow-hidden bg-white dark:bg-brand-dark-card border border-gray-100 dark:border-brand-dark-border transition-all duration-300 ${
          isHovered ? 'shadow-2xl' : 'shadow-md'
        }`}
        onClick={() => onPlay(video)}
      >
        {/* Thumbnail */}
        <div className="relative w-full h-64 overflow-hidden bg-gray-900">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />

          {/* Play Button Overlay */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isHovered ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40"
          >
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors">
              <Play size={28} className="text-red-600 fill-red-600 ml-1" />
            </div>
          </motion.div>

          {/* Duration Badge */}
          <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
            <Clock size={12} />
            {video.duration}
          </div>

          {/* Featured Badge */}
          {video.featured && (
            <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-md">
              FEATURED
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 h-40 flex flex-col justify-between">
          {/* Title */}
          <div>
            <h3 className="font-bold text-brand-text dark:text-brand-dark-text line-clamp-2 text-sm mb-2">
              {video.title}
            </h3>
          </div>

          {/* Category Tag */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
              {video.category}
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1 text-xs text-brand-muted dark:text-brand-dark-muted">
            <Calendar size={12} />
            {formatDate(video.uploadDate)}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
