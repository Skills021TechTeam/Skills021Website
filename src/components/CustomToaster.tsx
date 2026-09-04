import toast, { useToaster, resolveValue } from 'react-hot-toast'
import { CheckCircle2, XCircle, Loader2, Info, X } from 'lucide-react'

/**
 * Renders ALL react-hot-toast notifications (success, error, loading, custom)
 * as premium white cards — matching the AuthRequiredToast design system.
 * Custom toasts (toast.custom) render their own JSX untouched.
 */
export default function CustomToaster() {
  const { toasts, handlers } = useToaster()
  const { startPause, endPause, updateHeight } = handlers

  return (
    <div
      onMouseEnter={startPause}
      onMouseLeave={endPause}
      style={{
        position: 'fixed',
        top: 72,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const ref = (el: HTMLDivElement | null) => {
          if (el && typeof t.height !== 'number') {
            updateHeight(t.id, el.getBoundingClientRect().height)
          }
        }

        // ── Custom toasts (AuthRequiredToast etc.) — render their own JSX ──
        if (t.type === 'custom') {
          return (
            <div
              key={t.id}
              ref={ref}
              style={{
                pointerEvents: 'auto',
                opacity: t.visible ? 1 : 0,
                transition: 'opacity 150ms ease',
              }}
            >
              {resolveValue(t.message, t)}
            </div>
          )
        }

        // ── Icon per type ──
        const icon = (() => {
          if (t.type === 'success')
            return <CheckCircle2 size={18} className="text-emerald-500 stroke-[2.2]" />
          if (t.type === 'error')
            return <XCircle size={18} className="text-red-500 stroke-[2.2]" />
          if (t.type === 'loading')
            return <Loader2 size={18} className="text-indigo-500 stroke-[2.2] animate-spin" />
          return <Info size={18} className="text-slate-500 stroke-[2.2]" />
        })()

        const iconBg = (() => {
          if (t.type === 'success') return 'bg-emerald-50 dark:bg-emerald-950/40'
          if (t.type === 'error') return 'bg-red-50 dark:bg-red-950/40'
          if (t.type === 'loading') return 'bg-indigo-50 dark:bg-indigo-950/40'
          return 'bg-slate-100 dark:bg-zinc-800'
        })()

        const label = (() => {
          if (t.type === 'success') return 'Success'
          if (t.type === 'error') return 'Error'
          if (t.type === 'loading') return 'Please wait'
          return 'Notice'
        })()

        const labelColor = (() => {
          if (t.type === 'success') return 'text-emerald-600 dark:text-emerald-400'
          if (t.type === 'error') return 'text-red-600 dark:text-red-400'
          if (t.type === 'loading') return 'text-indigo-600 dark:text-indigo-400'
          return 'text-slate-500 dark:text-zinc-400'
        })()

        return (
          <div
            key={t.id}
            ref={ref}
            style={{
              pointerEvents: 'auto',
              opacity: t.visible ? 1 : 0,
              transform: t.visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
              transition: 'opacity 200ms ease, transform 200ms ease',
              maxWidth: 360,
              width: '100%',
            }}
          >
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0e1017]/95 px-4 py-3.5 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55)] backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5">
              {/* Decorative glow blobs */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-indigo-500/10 blur-2xl" />

              <div className="relative flex items-center gap-3">
                {/* Icon badge */}
                <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg} shadow-sm`}>
                  {icon}
                </div>

                {/* Text content */}
                <div className="min-w-0 flex-1 pr-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${labelColor}`}>
                      {label}
                    </span>
                    <span className="text-slate-300 dark:text-zinc-600">•</span>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-400">
                      Skills021
                    </span>
                  </div>
                  <p className="text-xs font-medium leading-snug text-slate-800 dark:text-zinc-100">
                    {resolveValue(t.message, t) as string}
                  </p>
                </div>

                {/* Dismiss button */}
                {t.type !== 'loading' && (
                  <button
                    type="button"
                    onClick={() => toast.dismiss(t.id)}
                    aria-label="Dismiss notification"
                    className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
