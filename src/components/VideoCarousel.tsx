import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { useVideoStore, YouTubeVideo } from '../store/videoStore'
import YouTubeVideoCard from './YouTubeVideoCard'

interface VideoCarouselProps {
  onVideoPlay?: (video: YouTubeVideo) => void
  showViewAllButton?: boolean
}

export default function VideoCarousel({ onVideoPlay, showViewAllButton = true }: VideoCarouselProps) {
  const videoStore = useVideoStore()
  const videos = videoStore.getPublishedVideos()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [cardsPerView, setCardsPerView] = useState(4)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoPlayRef = useRef<NodeJS.Timeout>()

  // Responsive cards per view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setCardsPerView(1)
      else if (window.innerWidth < 1024) setCardsPerView(2)
      else setCardsPerView(4)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-slide every 4 seconds
  useEffect(() => {
    if (isPaused || videos.length === 0) return

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(1, videos.length - cardsPerView + 1))
    }, 4000)

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }
  }, [isPaused, videos.length, cardsPerView])

  // Navigate to previous
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, videos.length - cardsPerView + 1)) % Math.max(1, videos.length - cardsPerView + 1))
  }

  // Navigate to next
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, videos.length - cardsPerView + 1))
  }

  // Handle touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX)
    handleSwipe()
  }

  const handleSwipe = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) handleNext()
    if (isRightSwipe) handlePrev()
  }

  // Handle video play
  const handleVideoPlay = (video: YouTubeVideo) => {
    if (onVideoPlay) {
      onVideoPlay(video)
    } else {
      window.open(video.youtubeUrl, '_blank')
    }
  }

  if (videos.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-brand-muted dark:text-brand-dark-muted">No videos available</p>
      </div>
    )
  }

  const totalSlides = Math.max(1, videos.length - cardsPerView + 1)

  return (
    <div className="w-full">
      {/* Carousel Container */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative group"
      >
        {/* Video Cards Wrapper */}
        <div className="overflow-hidden rounded-2xl">
          <motion.div
            className="flex gap-4"
            animate={{ x: -currentIndex * (100 / cardsPerView) + '%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {videos.map((video) => (
              <div
                key={video.id}
                style={{ flex: `0 0 calc(100% / ${cardsPerView})` }}
                className="px-0"
              >
                <YouTubeVideoCard video={video} onPlay={handleVideoPlay} layout="carousel" />
              </div>
            ))}
          </motion.div>
        </div>

        {/* Left Navigation Button */}
        {videos.length > cardsPerView && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-2 rounded-full bg-white dark:bg-brand-dark-card border border-gray-200 dark:border-brand-dark-border shadow-lg hover:shadow-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="Previous videos"
          >
            <ChevronLeft size={24} className="text-brand-text dark:text-brand-dark-text" />
          </motion.button>
        )}

        {/* Right Navigation Button */}
        {videos.length > cardsPerView && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-2 rounded-full bg-white dark:bg-brand-dark-card border border-gray-200 dark:border-brand-dark-border shadow-lg hover:shadow-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="Next videos"
          >
            <ChevronRight size={24} className="text-brand-text dark:text-brand-dark-text" />
          </motion.button>
        )}

        {/* Pause Indicator */}
        <AnimatePresence>
          {isPaused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-full"
            >
              ⏸ Paused
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Carousel Indicators */}
      {videos.length > cardsPerView && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <motion.button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'bg-primary-500 w-8'
                  : 'bg-gray-300 dark:bg-brand-dark-border w-2 hover:bg-primary-400'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.95 }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* View All Button */}
      {showViewAllButton && (
        <div className="flex justify-center mt-8">
          <motion.a
            href="/resources/videos"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
          >
            View All Videos
            <ExternalLink size={18} />
          </motion.a>
        </div>
      )}
    </div>
  )
}
