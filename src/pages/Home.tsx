import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Target, Building2, Trophy, ArrowRight, Play,
  ChevronRight, Code2, Users2, Video, GraduationCap, BookOpen,
  FileText, Briefcase, X
} from 'lucide-react'
import CourseCard from '../components/CourseCard'
import HackathonCard from '../components/HackathonCard'
import VideoCarousel from '../components/VideoCarousel'
import { YouTubeVideo } from '../store/videoStore'
import { courses } from '../data/courses'
import { hackathons } from '../data/hackathons'

// Count-up hook
function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target, duration])

  return { count, ref }
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  value, suffix, label, sublabel, icon: Icon,
}: {
  value: number; suffix: string; label: string; sublabel: string
  icon: typeof Users2;
}) {
  const { count, ref } = useCountUp(value)
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className="bg-white dark:bg-brand-dark-card rounded-2xl border border-brand-border dark:border-brand-dark-border px-6 py-5 flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
        <Icon size={22} className="text-primary-500" />
      </div>
      <div>
        <div className="text-2xl font-black text-brand-text dark:text-brand-dark-text leading-none">
          {count.toLocaleString()}{suffix}
        </div>
        <div className="text-sm font-semibold text-brand-text dark:text-brand-dark-text mt-0.5">{label}</div>
        <div className="text-xs text-brand-muted dark:text-brand-dark-muted mt-0.5">{sublabel}</div>
      </div>
    </motion.div>
  )
}

const testimonials = [
  {
    name: 'Ankit Rawat',
    college: 'ABES Engineering College, AKTU',
    quote: 'Skill021 completely transformed my DSA preparation. Got placed at TCS with ₹7 LPA package!',
    rating: 5,
    initials: 'AR',
  },
  {
    name: 'Sneha Gupta',
    college: 'MSIT, IP University',
    quote: 'The IPU counseling session was incredibly detailed. Got into my first-choice branch thanks to Skill021!',
    rating: 5,
    initials: 'SG',
  },
  {
    name: 'Rohit Kumar',
    college: 'DTU, Delhi',
    quote: 'JAC Delhi cutoff analysis was spot-on. The Java + DSA combo course got me ready for placements.',
    rating: 5,
    initials: 'RK',
  },
]

export default function Home() {
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null)

  return (
    <div className="min-h-screen bg-white dark:bg-brand-dark-bg">

      {/* ═══════════════════════════════════════════════
          HERO SECTION — Clean white, minimal
          ═══════════════════════════════════════════════ */}
      <section className="relative bg-white dark:bg-brand-dark-bg overflow-hidden pt-24 pb-0 min-h-[92vh] flex flex-col">

        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#0A0A0A 1px, transparent 1px), linear-gradient(to right, #0A0A0A 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center py-8 lg:py-16">

            {/* ── LEFT: Text Content ── */}
            <div className="flex flex-col items-start">

              {/* Main headline */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="text-5xl sm:text-6xl lg:text-[68px] font-black text-[#0A0A0A] dark:text-white leading-[1.05] tracking-tight mb-6"
              >
                Learn Skills<br />
                <span className="text-primary-500">from 0 to 1</span>
              </motion.h1>

              {/* Sub-headline */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="text-base md:text-[17px] text-brand-muted dark:text-brand-dark-muted leading-relaxed mb-8 max-w-lg"
              >
                Learn skills, access quality resources, participate in hackathons, receive expert guidance, and accelerate your career journey.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.24 }}
                className="flex flex-wrap items-center gap-4 mb-12"
              >
                <Link to="/courses">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2.5 px-7 py-3.5 bg-[#0A0A0A] dark:bg-white text-white dark:text-black font-semibold rounded-xl text-base hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
                  >
                    Explore Courses
                    <ArrowRight size={18} />
                  </motion.button>
                </Link>
                <Link to="/counseling">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2.5 px-7 py-3.5 bg-white dark:bg-transparent border border-[#0A0A0A] dark:border-white text-[#0A0A0A] dark:text-white font-semibold rounded-xl text-base hover:bg-gray-50 dark:hover:bg-white/10 transition-all duration-200"
                  >
                    Get Guidance
                  </motion.button>
                </Link>
              </motion.div>

              {/* Minimal trust indicator */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.32 }}
                className="flex items-center gap-3"
              >
                <p className="text-sm text-brand-muted dark:text-brand-dark-muted">
                  Trusted by <span className="font-semibold text-brand-text dark:text-brand-dark-text">12,000+ students</span> across India
                </p>
              </motion.div>
            </div>

            {/* ── RIGHT: Illustration ── */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative flex items-center justify-center"
            >
              <div className="relative w-full max-w-[520px] mx-auto">
                {/* Soft blue glow – subtle */}
                <div
                  className="absolute inset-[10%] rounded-full opacity-10 blur-3xl pointer-events-none"
                  style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }}
                />
                <motion.img
                  src="/hero-illustration.png"
                  alt="Skill021 — Learn Skills from 0 to 1"
                  className="relative z-10 w-full h-auto drop-shadow-xl select-none"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  draggable={false}
                />
              </div>
            </motion.div>
          </div>

          {/* ── STAT CARDS ROW ── */}
          <div className="pb-8 lg:pb-12 mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                value={12000} suffix="+" label="Students" sublabel="Growing community"
                icon={Users2}
              />
              <StatCard
                value={150} suffix="+" label="Video Lectures" sublabel="High quality content"
                icon={Video}
              />
              <StatCard
                value={4} suffix="+" label="University Programs" sublabel="AKTU, IPU, JoSAA, JAC Delhi"
                icon={GraduationCap}
              />
              <StatCard
                value={100} suffix="+" label="Hackathon Updates" sublabel="Stay ahead & build"
                icon={Trophy}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES STRIP ─── */}
      <section className="py-16 bg-gray-50 dark:bg-brand-dark-card border-y border-gray-100 dark:border-brand-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: 'Expert-Led Courses',
                desc: 'Master CS fundamentals, DSA, web development, AI/ML and more — taught by industry professionals.',
              },
              {
                icon: Building2,
                title: 'University Counseling',
                desc: 'Get expert guidance for AKTU, IPU, JoSAA, and JAC Delhi counseling rounds. 3,000+ students helped.',
              },
              {
                icon: Trophy,
                title: 'Hackathon Hub',
                desc: 'Stay updated with the latest hackathons and coding competitions. Find opportunities matching your skills.',
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white dark:bg-brand-dark-bg rounded-2xl border border-gray-100 dark:border-brand-dark-border p-6 hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="w-12 h-12 bg-gray-100 dark:bg-white/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon size={24} className="text-primary-500" />
                </div>
                <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text mb-2">{feature.title}</h3>
                <p className="text-sm text-brand-muted dark:text-brand-dark-muted leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED COURSES ─── */}
      <section className="py-16 bg-white dark:bg-brand-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="section-title">Top Courses</h2>
              <p className="section-subtitle">Learn from the best — built for Indian college students</p>
            </div>
            <Link
              to="/courses"
              className="hidden md:flex items-center gap-1 text-sm font-semibold text-primary-500 hover:gap-2 transition-all duration-200"
            >
              View All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.slice(0, 3).map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/courses">
              <motion.button whileTap={{ scale: 0.97 }} className="btn-primary">
                View All Courses <ArrowRight size={16} />
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── COUNSELING BANNER ─── */}
      <section className="py-16 bg-[#0A0A0A] dark:bg-brand-dark-card relative overflow-hidden">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(to right, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-3 py-1 text-xs font-semibold text-white/60 border border-white/20 rounded-full mb-6 tracking-widest uppercase">
              University Counseling
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Confused about college admissions?
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
              Get expert guidance for AKTU, IPU, JoSAA, and JAC Delhi counseling rounds.
              Our experts have helped 3,000+ students get into their dream colleges.
            </p>
            <Link to="/counseling">
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#0A0A0A] font-bold rounded-xl text-base hover:bg-gray-100 transition-all duration-200"
              >
                Start Counseling <ArrowRight size={18} />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── LATEST HACKATHONS ─── */}
      <section className="py-16 bg-white dark:bg-brand-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="section-title">Latest Hackathons</h2>
              <p className="section-subtitle">Compete, build, and get noticed by top companies</p>
            </div>
            <Link
              to="/hackathons"
              className="hidden md:flex items-center gap-1 text-sm font-semibold text-primary-500 hover:gap-2 transition-all duration-200"
            >
              See All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hackathons.slice(0, 3).map((hack, i) => (
              <HackathonCard key={hack.id} hackathon={hack} index={i} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/hackathons">
              <motion.button whileTap={{ scale: 0.97 }} className="btn-outline">
                See All Hackathons <Trophy size={16} />
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          PREMIUM YOUTUBE VIDEO SHOWCASE
          ═══════════════════════════════════════════════ */}
      <section className="py-16 bg-white dark:bg-brand-dark-bg border-b border-gray-100 dark:border-brand-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-2xl mx-auto text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="section-title mb-3">Learn Free with Skill021</h2>
              <p className="section-subtitle">
                Watch our latest educational videos, tutorials, guidance sessions, hackathon tips, and career roadmaps directly from YouTube.
              </p>
            </motion.div>
          </div>

          {/* Video Carousel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <VideoCarousel onVideoPlay={setSelectedVideo} showViewAllButton={true} />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          VIDEO MODAL
          ═══════════════════════════════════════════════ */}
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

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-16 bg-white dark:bg-brand-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">What Our Students Say</h2>
            <p className="section-subtitle">Trusted by 12,000+ students across India</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="card p-6"
              >
                {/* Stars */}
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <svg key={j} className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  ))}
                </div>
                <p className="text-brand-muted dark:text-brand-dark-muted text-sm leading-relaxed mb-6">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0A0A0A] dark:bg-white flex items-center justify-center text-white dark:text-black text-sm font-bold">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-brand-text dark:text-brand-dark-text">{t.name}</p>
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted">{t.college}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHAT WE OFFER ─── */}
      <section className="py-16 bg-gray-50 dark:bg-brand-dark-card border-t border-gray-100 dark:border-brand-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Everything you need to succeed</h2>
            <p className="section-subtitle">One platform for all your academic and career needs</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: BookOpen, label: 'Courses', path: '/courses' },
              { icon: FileText, label: 'Resources', path: '/resources' },
              { icon: Trophy, label: 'Hackathons', path: '/hackathons' },
              { icon: GraduationCap, label: 'Counseling', path: '/counseling' },
              { icon: Briefcase, label: 'Internships', path: '/internships' },
              { icon: Users2, label: 'Mentorship', path: '/mentorship' },
            ].map((item, i) => (
              <Link key={item.label} to={item.path}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-white dark:bg-brand-dark-bg rounded-2xl border border-gray-100 dark:border-brand-dark-border p-5 text-center hover:-translate-y-1 transition-transform duration-200 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
                    <item.icon size={20} className="text-brand-muted dark:text-brand-dark-muted group-hover:text-primary-500 transition-colors" />
                  </div>
                  <p className="text-sm font-semibold text-brand-text dark:text-brand-dark-text">{item.label}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-16 bg-white dark:bg-brand-dark-bg">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-brand-text dark:text-brand-dark-text mb-4">
              Ready to start your journey?
            </h2>
            <p className="text-brand-muted dark:text-brand-dark-muted mb-8 text-lg">
              Create your free account and access courses, counseling resources, and hackathon updates today.
            </p>
            <Link to="/register">
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="btn-primary text-base px-8 py-4"
              >
                Get Started — It's Free <ArrowRight size={18} />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
