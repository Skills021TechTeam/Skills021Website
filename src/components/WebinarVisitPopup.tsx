import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CalendarDays, ExternalLink, Radio, Video, X, ArrowRight } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getLiveWebinars, type LiveWebinar } from '../lib/webinarService'
import { hasCookieConsent } from '../lib/cookieService'

const DISMISS_KEY = 'skills021_webinar_visit_popup_seen'

function getCurrentWebinar(webinars: LiveWebinar[]) {
  const now = Date.now()
  const live = webinars.find((webinar) => {
    const start = new Date(webinar.startsAt).getTime()
    const end = webinar.endsAt ? new Date(webinar.endsAt).getTime() : null
    return start <= now && (!end || end > now)
  })
  if (live) return { type: 'live' as const, webinar: live }

  const upcoming = webinars
    .filter((webinar) => new Date(webinar.startsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0]

  return upcoming ? { type: 'upcoming' as const, webinar: upcoming } : null
}

export default function WebinarVisitPopup() {
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [notice, setNotice] = useState<ReturnType<typeof getCurrentWebinar>>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const hiddenRoutes = ['/login', '/register', '/admin', '/dashboard']
    if (hiddenRoutes.some((route) => location.pathname.startsWith(route))) return
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return
    if (!hasCookieConsent('marketing')) return

    let cancelled = false

    const check = async () => {
      try {
        const webinars = await getLiveWebinars()
        if (cancelled) return
        const current = getCurrentWebinar(webinars)
        if (current) {
          setNotice(current)
          setOpen(true)
        }
      } catch (error) {
        // The popup is non-blocking: the page should work normally if webinars fail to load.
        console.warn('Webinar visit popup could not load webinars:', error)
      }
    }

    check()
    return () => { cancelled = true }
  }, [location.pathname])

  const close = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && notice && (
        <motion.div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="webinar-visit-popup-title"
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/50 bg-white shadow-[0_28px_90px_-24px_rgba(79,70,229,0.55)] dark:border-white/10 dark:bg-brand-dark-card"
            initial={{ opacity: 0, y: 22, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />

            <button
              type="button"
              onClick={close}
              aria-label="Close webinar notification"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white/70 text-brand-muted transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white"
            >
              <X size={17} />
            </button>

            <div className="relative p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-violet-500/25">
                  {notice.type === 'live' ? <Radio size={21} /> : <Bell size={21} />}
                  <span className={`absolute -right-1 -top-1 h-3 w-3 rounded-full shadow-[0_0_0_5px_rgba(255,255,255,0.7)] dark:shadow-[0_0_0_5px_rgba(15,23,42,0.7)] ${notice.type === 'live' ? 'bg-red-500 animate-pulse' : 'bg-violet-500'}`} />
                </div>
                <div className="min-w-0 pr-7">
                  <div className={`text-[10px] font-extrabold uppercase tracking-[0.18em] ${notice.type === 'live' ? 'text-red-500' : 'text-violet-600 dark:text-violet-300'}`}>
                    {notice.type === 'live' ? 'Live now' : 'Upcoming webinar'}
                  </div>
                  <h2 id="webinar-visit-popup-title" className="mt-1 text-xl font-black leading-tight text-brand-text dark:text-white">
                    {notice.webinar.title}
                  </h2>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-brand-muted dark:text-brand-dark-muted">
                {notice.type === 'live'
                  ? 'A live learning session is happening right now. Join and learn directly from the speaker.'
                  : 'A new learning session is coming up. Save the time and join us when it goes live.'}
              </p>

              <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-brand-muted dark:text-brand-dark-muted">
                  <span className="inline-flex items-center gap-1.5"><Video size={13} className="text-violet-500" /> {notice.webinar.provider}</span>
                  {notice.type === 'upcoming' && (
                    <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} className="text-cyan-500" /> {new Date(notice.webinar.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  )}
                </div>
                {notice.webinar.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-brand-muted dark:text-brand-dark-muted">{notice.webinar.description}</p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                {notice.type === 'live' ? (
                  isAuthenticated ? (
                    <a href={notice.webinar.joinUrl} target="_blank" rel="noreferrer" onClick={() => sessionStorage.setItem(DISMISS_KEY, '1')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5">
                      Join live <ExternalLink size={13} />
                    </a>
                  ) : (
                    <button type="button" onClick={() => { close(); navigate('/register', { state: { from: '/courses?tab=webinars' } }) }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5">
                      Sign up to join <ArrowRight size={13} />
                    </button>
                  )
                ) : (
                  <button type="button" onClick={() => { close(); navigate(isAuthenticated ? '/courses?tab=webinars' : '/register', { state: { from: '/courses?tab=webinars' } }) }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5">
                    {isAuthenticated ? 'View webinar' : 'Sign up to view'} <ArrowRight size={13} />
                  </button>
                )}
                <button type="button" onClick={close} className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-brand-muted transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
