import React from 'react'
import { Link } from 'react-router-dom'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  showTagline?: boolean
  asLink?: boolean
  to?: string
  className?: string
  iconClassName?: string
  textClassName?: string
}

const sizeConfig = {
  sm: {
    icon: 'w-7 h-7 sm:w-8 sm:h-8',
    text: 'text-lg sm:text-xl',
    tagline: 'text-[8px] tracking-[0.18em]',
    gap: 'gap-2',
    padding: 'p-0.5',
    rounded: 'rounded-lg',
  },
  md: {
    icon: 'w-9 h-9 sm:w-10 sm:h-10',
    text: 'text-xl sm:text-2xl',
    tagline: 'text-[9px] tracking-[0.2em]',
    gap: 'gap-2.5',
    padding: 'p-1',
    rounded: 'rounded-xl',
  },
  lg: {
    icon: 'w-12 h-12',
    text: 'text-2xl sm:text-3xl',
    tagline: 'text-[10px] tracking-[0.22em]',
    gap: 'gap-3',
    padding: 'p-1.5',
    rounded: 'rounded-2xl',
  },
  xl: {
    icon: 'w-16 h-16',
    text: 'text-3xl sm:text-4xl',
    tagline: 'text-xs tracking-[0.25em]',
    gap: 'gap-3.5',
    padding: 'p-2',
    rounded: 'rounded-2xl',
  },
}

export default function Logo({
  size = 'md',
  showText = true,
  showTagline = false,
  asLink = true,
  to = '/',
  className = '',
  iconClassName = '',
  textClassName = '',
}: LogoProps) {
  const cfg = sizeConfig[size]

  const content = (
    <div className={`inline-flex items-center ${cfg.gap} select-none group ${className}`}>
      {/* Official S-Mark with clean backdrop for high contrast in all themes */}
      <div
        className={`relative shrink-0 ${cfg.icon} ${cfg.rounded} ${cfg.padding} bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105 ${iconClassName}`}
      >
        <img
          src="/logo-icon.png"
          alt="Skills021 Logo"
          className="w-full h-full object-contain"
          loading="eager"
        />
      </div>

      {/* Typography: SKILLS in bold, 021 in gradient ribbon colors */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className={`font-black tracking-tight flex items-baseline ${cfg.text} ${textClassName}`}>
            <span className="text-[#0A0A0A] dark:text-white transition-colors">
              SKILLS
            </span>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent ml-0.5">
              021
            </span>
          </div>

          {showTagline && (
            <div className={`mt-1 font-bold uppercase text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 ${cfg.tagline}`}>
              <span>Learn</span>
              <span className="text-blue-500 font-extrabold">•</span>
              <span>Grow</span>
              <span className="text-violet-500 font-extrabold">•</span>
              <span>Succeed</span>
            </div>
          )}
        </div>
      )}
    </div>
  )

  if (asLink) {
    return (
      <Link to={to} className="inline-flex items-center focus:outline-none" aria-label="Skills021 Home">
        {content}
      </Link>
    )
  }

  return content
}
