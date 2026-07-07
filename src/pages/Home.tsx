import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { ArrowRight, Play, X, Sparkles } from 'lucide-react'

// New design components
import BackgroundEffects from '../components/BackgroundEffects'
import CursorGlow from '../components/CursorGlow'
import HomeLoadingScreen from '../components/HomeLoadingScreen'
import MagneticButton from '../components/MagneticButton'
import LaptopIllustration from '../components/LaptopIllustration'
import HomeCoursesSection from '../components/HomeCoursesSection'

// Existing functional components
import VideoCarousel from '../components/VideoCarousel'
import { YouTubeVideo } from '../store/videoStore'

// ─── Hero Section ─────────────────────────────────────────────────────────────
const words = ['Learn.', 'Build.', 'Get', 'Placed.']


function HeroSection() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      id="home"
      className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center px-6 pb-16 pt-32 sm:px-8 lg:pt-40 xl:flex-row xl:gap-10"
    >
      {/* ── Left: Text Content ── */}
      <div className="flex-1">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ delay: 2.6, duration: 0.6 }}
          className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-brand-muted dark:text-brand-dark-muted"
        >
          <span className="relative flex h-2 w-2">
            <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-violet-400" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
          </span>
          New cohort starting soon — limited seats
        </motion.div>

        {/* Headline */}
        <h1 className="mt-6 text-5xl font-black leading-[1.05] tracking-tighter text-brand-text dark:text-white sm:text-6xl lg:text-7xl font-display">
          {words.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
              transition={{ delay: 2.6 + i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className={`mr-3 inline-block ${w === 'Placed.' ? 'relative' : ''}`}
            >
              {w === 'Placed.' ? (
                <span className="relative">
                  <span className="gradient-text">Placed.</span>
                  <motion.svg
                    className="absolute -bottom-2 left-0 w-full"
                    height="14"
                    viewBox="0 0 200 14"
                    fill="none"
                  >
                    <motion.path
                      d="M2 8 Q 60 2 100 6 T 198 5"
                      stroke="url(#uGrad)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={inView ? { pathLength: 1 } : {}}
                      transition={{ delay: 3.5, duration: 1.2, ease: 'easeInOut' }}
                    />
                    <defs>
                      <linearGradient id="uGrad" x1="0" x2="1">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </motion.svg>
                </span>
              ) : (
                w
              )}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 3.4, duration: 0.7 }}
          className="mt-6 max-w-xl text-lg text-brand-muted dark:text-brand-dark-muted sm:text-xl"
        >
          Master in-demand tech skills through project-based cohorts. Ship real products,
          build a killer portfolio, and land your dream job — all with{' '}
          <span className="font-semibold text-brand-text dark:text-white">Skills021</span>.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 3.6, duration: 0.7 }}
          className="mt-8 flex flex-wrap items-center gap-4"
        >
          <Link to="/courses">
            <MagneticButton className="group">
              Explore Courses
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </MagneticButton>
          </Link>
          <Link to="/mentorship">
            <MagneticButton variant="ghost">
              <Play size={14} className="fill-current" />
              Find a Mentor
            </MagneticButton>
          </Link>
        </motion.div>


      </div>

      {/* ── Right: Laptop Illustration ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 2.8, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="mt-16 flex-1 xl:mt-0"
      >
        <LaptopIllustration />
      </motion.div>
    </section>
  )
}

// ─── Video Section ────────────────────────────────────────────────────────────
function VideoSection({ onVideoPlay }: { onVideoPlay: (v: YouTubeVideo) => void }) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
        animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
        transition={{ duration: 0.8 }}
        className="mb-14 max-w-2xl"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500 dark:text-violet-400">
          Free content
        </div>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-brand-text dark:text-white sm:text-5xl font-display">
          Learn free with{' '}
          <span className="gradient-text">Skills021</span>.
        </h2>
        <p className="mt-4 text-brand-muted dark:text-brand-dark-muted">
          Watch our latest educational videos, tutorials, guidance sessions, hackathon tips, and
          career roadmaps directly from YouTube.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.2, duration: 0.7 }}
      >
        <VideoCarousel onVideoPlay={onVideoPlay} showViewAllButton={true} />
      </motion.div>
    </section>
  )
}

// ─── Footer CTA Banner ────────────────────────────────────────────────────────
function FooterCTABanner() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-8 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 40, filter: 'blur(6px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8 }}
        className="glass-strong relative mb-10 overflow-hidden rounded-[32px] px-8 py-14 text-center sm:px-16 sm:py-20"
      >
        <div className="absolute inset-0 -z-0 opacity-70">
          <div className="absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/40 to-blue-500/40 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/50 px-3 py-1 text-xs font-medium text-brand-muted dark:border-white/10 dark:bg-white/5 dark:text-brand-dark-muted">
            <Sparkles size={12} className="text-violet-500" />
            Ready when you are
          </div>
          <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-brand-text dark:text-white sm:text-5xl font-display">
            Your future is <span className="gradient-text">one cohort away</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-muted dark:text-brand-dark-muted">
            Join 12,000+ students turning skills into careers. No fluff, no lectures — just build,
            ship, get hired.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register">
              <MagneticButton className="group">
                Get Started — It's Free
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </MagneticButton>
            </Link>
            <Link to="/mentorship">
              <MagneticButton variant="ghost">Talk to a Mentor</MagneticButton>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

// ─── Main Home Page ───────────────────────────────────────────────────────────
export default function Home() {
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null)

  return (
    <div className="relative min-h-screen bg-white dark:bg-brand-dark-bg">
      {/* Loading screen — home page only */}
      <HomeLoadingScreen />

      {/* Fixed background visual effects */}
      <BackgroundEffects />
      <CursorGlow />

      {/* Page Sections */}
      <main className="relative">
        <HeroSection />
        <HomeCoursesSection />
        <VideoSection onVideoPlay={setSelectedVideo} />
        <FooterCTABanner />
      </main>

      {/* ─── Video Modal — preserved exactly from original ─── */}
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
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-white bg-red-600 px-3 py-1 rounded-full">
                    {selectedVideo.category}
                  </span>
                  <a
                    href={selectedVideo.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
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
  )
}
