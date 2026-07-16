import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface PageShellProps {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  compact?: boolean
}

export default function PageShell({
  eyebrow,
  title,
  description,
  action,
  children,
  className = '',
  compact = false,
}: PageShellProps) {
  return (
    <div className={`min-h-screen bg-white text-brand-text dark:bg-brand-dark-bg dark:text-brand-dark-text ${className}`}>
      <section className="relative overflow-hidden border-b border-gray-100/80 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_35%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_100%)] dark:border-brand-dark-border dark:bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.22),_transparent_35%),linear-gradient(135deg,_#09090f_0%,_#111827_100%)]">
        <div className="absolute inset-0 opacity-70">
          <div className="aurora aurora-1 left-[8%] top-[16%] h-56 w-56 bg-violet-500/35" />
          <div className="aurora aurora-2 right-[12%] top-[8%] h-60 w-60 bg-sky-500/30" />
          <div className="aurora aurora-3 bottom-[6%] left-[45%] h-52 w-52 bg-cyan-500/25" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              {eyebrow ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-600 backdrop-blur dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300">
                  <span className="h-2 w-2 rounded-full bg-violet-500" />
                  {eyebrow}
                </div>
              ) : null}
              <h1 className="mt-4 text-3xl font-black tracking-tight text-brand-text dark:text-brand-dark-text sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-4 max-w-2xl text-base leading-7 text-brand-muted dark:text-brand-dark-muted sm:text-lg">
                  {description}
                </p>
              ) : null}
            </div>
            {action ? <div className="flex items-center gap-3">{action}</div> : null}
          </div>
          {compact ? null : (
            <div className="flex flex-wrap items-center gap-3 text-sm text-brand-muted dark:text-brand-dark-muted">
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 backdrop-blur dark:border-white/10 dark:bg-white/5">
                Premium learning experience
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 backdrop-blur dark:border-white/10 dark:bg-white/5">
                Responsive across devices
              </span>
              <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 font-medium text-brand-text transition hover:border-violet-300 hover:text-violet-600 dark:border-white/10 dark:bg-white/5 dark:text-brand-dark-text">
                Back home <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {children}
      </div>
    </div>
  )
}
