import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Sparkles, Radio, PlayCircle, ExternalLink, CalendarDays, Video, Bell, Zap } from 'lucide-react'

// New design components
import BackgroundEffects from '../components/BackgroundEffects'
import CursorGlow from '../components/CursorGlow'
import MagneticButton from '../components/MagneticButton'
import LaptopIllustration from '../components/LaptopIllustration'
import HomeCoursesSection from '../components/HomeCoursesSection'
import HomeHackathonsSection from '../components/HomeHackathonsSection'

// Existing functional components
import VideoCarousel from '../components/VideoCarousel'
import { YouTubeVideo } from '../store/videoStore'
import { getLiveWebinars, getWebinarRecordings, type LiveWebinar, type WebinarRecording } from '../lib/webinarService'
import { useAuthStore } from '../store/authStore'

// ─── Hero Section ─────────────────────────────────────────────────────────────
const words = ['Learn.', 'Build.', 'Get', 'Placed.']


function HeroSection() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      id="home"
      className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center px-6 pb-16 pt-8 sm:px-8 xl:flex-row xl:gap-10"
    >
      {/* ── Left: Text Content ── */}
      <div className="flex-1">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
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
              transition={{ delay: 0.2 + i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
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
                      transition={{ delay: 1.1, duration: 1.2, ease: 'easeInOut' }}
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
          transition={{ delay: 1, duration: 0.7 }}
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
          transition={{ delay: 1.2, duration: 0.7 }}
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
            <MagneticButton className="group">
              Find a Mentor
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </MagneticButton>
          </Link>
        </motion.div>


      </div>

      {/* ── Right: Laptop Illustration ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.4, duration: 1, ease: [0.22, 1, 0.36, 1] }}
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

// ─── Webinar Popup ────────────────────────────────────────────────────────────
function WebinarSection() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [open, setOpen] = useState(false)
  const [liveWebinars, setLiveWebinars] = useState<LiveWebinar[]>([])
  const [recordings, setRecordings] = useState<WebinarRecording[]>([])
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setInterval> | undefined

    const loadWebinars = async () => {
      try {
        const [live, saved] = await Promise.all([getLiveWebinars(), getWebinarRecordings(isAuthenticated)])
        if (!active) return
        setLiveWebinars(live)
        setRecordings(saved)

        const now = Date.now()
        const current = live.find(w => new Date(w.startsAt).getTime() <= now && (!w.endsAt || new Date(w.endsAt).getTime() > now))
        if (current) {
          const seenKey = `skills021-live-webinar-seen-${current.id}`
          if (localStorage.getItem(seenKey) !== '1') {
            setOpen(true)
            localStorage.setItem(seenKey, '1')
          }
        }
      } catch {
        // Keep the home page usable if webinar data is temporarily unavailable.
      }
    }

    loadWebinars()
    timer = setInterval(loadWebinars, 30000)
    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
  }, [isAuthenticated])

  const now = Date.now()
  const live = liveWebinars.find(w => new Date(w.startsAt).getTime() <= now && (!w.endsAt || new Date(w.endsAt).getTime() > now))
  const next = liveWebinars.find(w => new Date(w.startsAt).getTime() > now)

  return (
    <>
      {/* Featured webinar — full-width horizontal feature. */}
      <section ref={ref} className="relative z-30 mx-auto w-full max-w-7xl px-5 pb-5 pt-12 sm:px-8 sm:pt-16 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.985 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="group relative w-full overflow-hidden rounded-[2rem] border border-violet-200/70 bg-white/80 p-5 shadow-[0_24px_70px_-40px_rgba(79,70,229,0.58)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_34px_90px_-42px_rgba(79,70,229,0.72)] dark:border-white/10 dark:bg-slate-900/80 sm:p-6 lg:p-7"
        >
          <span className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-violet-500/14 blur-3xl transition-transform duration-1000 group-hover:scale-125" />
          <span className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl transition-transform duration-1000 group-hover:scale-110" />
          <span className="pointer-events-none absolute right-8 bottom-5 h-28 w-28 rounded-full border border-violet-400/20 border-dashed animate-[spin_20s_linear_infinite]" />
          <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent opacity-70" />

          <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(220px,0.9fr)_minmax(320px,1.45fr)_minmax(220px,0.8fr)] lg:gap-8">
            {/* Visual */}
            <div className="flex items-center gap-4 lg:justify-center">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-[0_18px_42px_-14px_rgba(79,70,229,0.72)] transition-transform duration-500 group-hover:scale-105 group-hover:rotate-1 sm:h-28 sm:w-28">
                <Radio size={38} />
                {live && <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-500 shadow-[0_0_0_6px_rgba(239,68,68,0.14)] animate-pulse" />}
                <span className="absolute inset-2 rounded-[1.35rem] border border-white/20" />
              </div>
              <div className="hidden sm:block lg:hidden">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">{live ? `Live · ${live.provider}` : next ? `Upcoming · ${next.provider}` : 'Webinar Hub'}</div>
                <div className="mt-1 text-sm font-bold text-brand-text dark:text-white">Learn together, live.</div>
              </div>
            </div>

            {/* Information */}
            <div className="min-w-0 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${live ? 'bg-red-500 animate-pulse' : next ? 'bg-violet-500' : 'bg-slate-400'}`} />
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
                  {live ? `Live now · ${live.provider}` : next ? `Upcoming · ${next.provider}` : 'Webinar Hub'}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-bold leading-snug text-brand-text dark:text-white sm:text-2xl">
                {live ? live.title : next ? next.title : 'Learn together, live.'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted dark:text-brand-dark-muted">
                {live ? 'Join the live session and learn directly with the speaker.' : next ? `Save your seat for ${new Date(next.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.` : 'Live sessions, expert conversations, and useful replays for students.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-violet-500">Format</div>
                  <div className="mt-0.5 text-xs font-bold text-brand-text dark:text-white">Live Session</div>
                </div>
                <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-cyan-600">Learn</div>
                  <div className="mt-0.5 text-xs font-bold text-brand-text dark:text-white">Real-World Insights</div>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-indigo-500">Engage</div>
                  <div className="mt-0.5 text-xs font-bold text-brand-text dark:text-white">Ask Questions Live</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
              {live ? (
                isAuthenticated ? (
                  <a href={live.joinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/25">
                    <Video size={14} /> Join live <ExternalLink size={12} />
                  </a>
                ) : (
                  <Link to="/register" state={{ from: '/courses?tab=webinars' }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/25">
                    <Video size={14} /> Sign up to join <ArrowRight size={12} />
                  </Link>
                )
              ) : next ? (
                <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/25">
                  <CalendarDays size={14} /> View details
                </button>
              ) : (
                <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/25">
                  <PlayCircle size={14} /> Explore webinars
                </button>
              )}
              <Link to={isAuthenticated ? '/courses?tab=webinars' : '/register'} state={!isAuthenticated ? { from: '/courses?tab=webinars' } : undefined} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50/80 px-5 py-3 text-xs font-bold text-violet-700 transition-all hover:-translate-y-0.5 hover:bg-violet-100 dark:border-white/10 dark:bg-white/5 dark:text-violet-200 dark:hover:bg-white/10">
                {isAuthenticated ? 'Webinar hub' : 'Sign up for webinars'} <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <AnimatePresence>{open && (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div role="dialog" aria-modal="true" initial={{ opacity: 0, y: 20, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.96 }} onClick={e=>e.stopPropagation()} className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/30 bg-white shadow-2xl dark:border-white/10 dark:bg-brand-dark-card">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close webinar popup" className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"><X size={16}/></button>
            <div className="p-6 sm:p-7">
              <div className="mb-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg"><Radio size={19}/></span><div><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">Skills021 Webinars</span><h2 className="text-xl font-black text-brand-text dark:text-white">Live sessions & replays</h2></div></div>
              {live ? <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-500/10"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-500"><span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"/> Live now · {live.provider}</div><h3 className="mt-2 font-black text-brand-text dark:text-white">{live.title}</h3><p className="mt-1 text-xs text-brand-muted">{live.description}</p>{isAuthenticated ? (
                <a href={live.joinUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white"><Video size={14}/> Join live <ExternalLink size={12}/></a>
              ) : (
                <Link to="/register" state={{ from: '/courses?tab=webinars' }} onClick={()=>setOpen(false)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white"><Video size={14}/> Sign up to join <ArrowRight size={12}/></Link>
              )}</div> : next ? <div className="mb-5 rounded-2xl border border-violet-100 bg-violet-50 p-4 dark:border-white/10 dark:bg-violet-500/10"><div className="text-xs font-bold uppercase tracking-widest text-violet-500">Next webinar · {next.provider}</div><h3 className="mt-1 font-black text-brand-text dark:text-white">{next.title}</h3><p className="mt-1 text-xs text-brand-muted flex items-center gap-1"><CalendarDays size={12}/> {new Date(next.startsAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</p></div> : <div className="mb-5 rounded-2xl border border-gray-100 p-4 dark:border-white/10"><p className="text-sm font-bold text-brand-text dark:text-white">No live webinar right now.</p><p className="text-xs text-brand-muted mt-1">Replays are available below when published.</p></div>}
              <div><div className="mb-3 flex items-center justify-between"><h3 className="font-black text-brand-text dark:text-white">Past sessions</h3><span className="text-xs text-brand-muted">{recordings.length}</span></div>{recordings.length===0?<p className="text-xs text-brand-muted">No recordings published yet.</p>:<div className="space-y-2.5 max-h-56 overflow-y-auto">{recordings.slice(0,5).map(r=>isAuthenticated ? (
                      <a key={r.id} href={r.videoUrl||'#'} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"><span className="min-w-0"><span className="block truncate text-xs font-bold text-brand-text dark:text-white">{r.title}</span><span className="block text-[10px] text-brand-muted mt-0.5">{r.sessionDate}</span></span><PlayCircle size={16} className="shrink-0 text-violet-500"/></a>
                    ) : (
                      <Link key={r.id} to="/register" state={{ from: '/courses?tab=webinars' }} onClick={()=>setOpen(false)} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"><span className="min-w-0"><span className="block truncate text-xs font-bold text-brand-text dark:text-white">{r.title}</span><span className="block text-[10px] text-brand-muted mt-0.5">Sign up to watch replay</span></span><ArrowRight size={16} className="shrink-0 text-violet-500"/></Link>
                    ))}</div>}</div>
              <Link to={isAuthenticated ? '/courses?tab=webinars' : '/register'} state={!isAuthenticated ? { from: '/courses?tab=webinars' } : undefined} onClick={()=>setOpen(false)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A0A0A] px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-black">{isAuthenticated ? 'Open Webinar Hub' : 'Sign up to open Webinar Hub'} <ArrowRight size={15}/></Link>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </>
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
      {/* Fixed background visual effects */}
      <BackgroundEffects />
      <CursorGlow />

      {/* Page Sections */}
      <main className="relative">
        <WebinarSection />
        <HeroSection />
        <HomeCoursesSection />
           {/* <HomeHackathonsSection /> */}
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
