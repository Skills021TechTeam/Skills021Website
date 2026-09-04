import toast from 'react-hot-toast'
import { ShieldCheck, X } from 'lucide-react'

interface ShowAuthToastOptions {
  title?: string
  message?: string
}

/**
 * Ultra-clean, executive access-restricted notification toast
 * Sleek, professional notification without cluttered action buttons
 */
export function showAuthRequiredToast(options?: ShowAuthToastOptions) {
  const title = options?.title || 'Sign In Required'
  const message = options?.message || 'Please sign in with your Skills021 account to access this section.'

  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-in fade-in slide-in-from-top-3 duration-200' : 'animate-out fade-out slide-out-to-top-2 duration-150'
        } max-w-sm w-full pointer-events-auto transition-all`}
        style={{
          animationFillMode: 'forwards',
        }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0e1017]/95 px-4 py-3.5 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55)] backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5">
          {/* Subtle decorative glowing background accents */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-indigo-500/10 blur-2xl" />

          <div className="relative flex items-center gap-3">
            {/* Elegant Shield Icon */}
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-violet-500/20">
              <ShieldCheck size={18} className="stroke-[2.2]" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#0e1017]" />
            </div>

            {/* Notification Text */}
            <div className="min-w-0 flex-1 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Authentication
                </span>
                <span className="text-slate-300 dark:text-zinc-600">•</span>
                <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-400">
                  Skills021
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h4>

              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-zinc-400">
                {message}
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    ),
    {
      id: 'auth-required-toast',
      duration: 4000,
      position: 'top-right',
    }
  )
}
