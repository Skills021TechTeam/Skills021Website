import { motion, useInView, animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Users, Building2, Trophy, Percent } from 'lucide-react'

const stats = [
  { icon: Users, value: 12000, suffix: '+', label: 'Students trained', tone: 'from-violet-500 to-purple-500', id: 'stat-students' },
  { icon: Building2, value: 150, suffix: '+', label: 'Hiring partners', tone: 'from-blue-500 to-cyan-500', id: 'stat-partners' },
  { icon: Trophy, value: 4, suffix: '+', label: 'Years of impact', tone: 'from-pink-500 to-rose-500', id: 'stat-years' },
  { icon: Percent, value: 100, suffix: '%', label: 'Placement support', tone: 'from-amber-500 to-orange-500', id: 'stat-placement' },
]

function Counter({ to, suffix, start }: { to: number; suffix: string; start: boolean }) {
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!start) return
    const controls = animate(0, to, {
      duration: 2.2,
      ease: 'easeOut',
      onUpdate: (v) => setVal(Math.floor(v)),
    })
    return () => controls.stop()
  }, [start, to])

  const formatted = to >= 1000 ? val.toLocaleString() : val
  return (
    <span>
      {formatted}
      {suffix}
    </span>
  )
}

export default function HomeStatsSection() {
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
          By the numbers
        </div>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-brand-text dark:text-white sm:text-5xl font-display">
          A learning community that{' '}
          <span className="gradient-text">actually delivers</span>.
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6, scale: 1.02 }}
            className="glass group relative overflow-hidden rounded-3xl p-6 transition-shadow duration-300 hover:shadow-[0_20px_60px_-20px_rgba(139,92,246,0.4)]"
          >
            {/* Gradient border on hover */}
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(59,130,246,0.4))',
                mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
                padding: '1.5px',
              }}
            />

            <motion.div
              whileHover={{ rotate: 12, scale: 1.1 }}
              className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${s.tone} text-white shadow-lg`}
            >
              <s.icon size={22} />
            </motion.div>

            <div className="text-4xl font-bold tracking-tight text-brand-text dark:text-white sm:text-5xl">
              <Counter to={s.value} suffix={s.suffix} start={inView} />
            </div>
            <div className="mt-2 text-sm text-brand-muted dark:text-brand-dark-muted">{s.label}</div>

          </motion.div>
        ))}
      </div>
    </section>
  )
}
