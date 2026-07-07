import { useEffect, useRef } from 'react'

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: -500, y: -500 })
  const target = useRef({ x: -500, y: -500 })

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const handleMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMove)

    let raf: number
    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.12
      pos.current.y += (target.current.y - pos.current.y) * 0.12
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${pos.current.x - 250}px, ${pos.current.y - 250}px, 0)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={glowRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[1] h-[500px] w-[500px] rounded-full opacity-40 mix-blend-screen"
      style={{
        background:
          'radial-gradient(circle at center, rgba(139,92,246,0.35), rgba(59,130,246,0.15) 40%, transparent 70%)',
      }}
    />
  )
}
