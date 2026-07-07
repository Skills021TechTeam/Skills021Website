import { useRef, useState, ReactNode, MouseEvent } from 'react'
import { motion } from 'framer-motion'

interface RippleItem {
  id: number
  x: number
  y: number
  size: number
}

interface MagneticButtonProps {
  children: ReactNode
  className?: string
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  variant?: 'primary' | 'ghost'
  [key: string]: unknown
}

export default function MagneticButton({
  children,
  className = '',
  onClick,
  variant = 'primary',
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [ripples, setRipples] = useState<RippleItem[]>([])

  const handleMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    setPos({ x: x * 0.25, y: y * 0.25 })
  }

  const handleLeave = () => setPos({ x: 0, y: 0 })

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const rippleX = e.clientX - rect.left - size / 2
    const rippleY = e.clientY - rect.top - size / 2
    const id = Date.now()
    setRipples((r) => [...r, { id, x: rippleX, y: rippleY, size }])
    setTimeout(() => setRipples((r) => r.filter((rr) => rr.id !== id)), 700)
    onClick?.(e)
  }

  const base =
    'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold tracking-tight transition-all duration-300'

  const variants = {
    primary:
      'text-white bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 hover:shadow-[0_10px_40px_-10px_rgba(139,92,246,0.7)] hover:scale-[1.02]',
    ghost:
      'text-brand-text dark:text-white bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10 hover:-translate-y-0.5',
  }

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={handleClick}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, mass: 0.5 }}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {variant === 'primary' && (
        <span
          className="absolute inset-0 -z-10 opacity-0 blur-2xl transition-opacity duration-300 hover:opacity-70"
          style={{ background: 'linear-gradient(90deg,#8b5cf6,#3b82f6)' }}
        />
      )}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="ripple"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </motion.button>
  )
}
