import { motion, useInView } from 'framer-motion'
import { useRef, useState, MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Code2, Brain, BarChart2, Palette, ShieldCheck, Rocket,
  Coffee, Server, Layout, ArrowUpRight
} from 'lucide-react'
import { courses, Course } from '../data/courses'

// Map course categories to icons and gradient colors
const categoryConfig: Record<string, { icon: typeof Code2; tone: string }> = {
  DSA: { icon: Code2, tone: 'from-violet-500 to-purple-500' },
  Java: { icon: Coffee, tone: 'from-blue-500 to-cyan-500' },
  Python: { icon: Brain, tone: 'from-emerald-500 to-teal-500' },
  Django: { icon: Server, tone: 'from-green-600 to-emerald-500' },
  DevOps: { icon: Rocket, tone: 'from-fuchsia-500 to-pink-500' },
  'Exam Prep': { icon: ShieldCheck, tone: 'from-amber-500 to-orange-500' },
  'System Design': { icon: Layout, tone: 'from-rose-500 to-pink-500' },
}

const defaultConfig = { icon: Code2, tone: 'from-violet-500 to-blue-500' }

interface GlassCourseCardProps {
  course: Course
  index: number
}

function GlassCourseCard({ course, index }: GlassCourseCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const config = categoryConfig[course.category] ?? defaultConfig
  const Icon = config.icon

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const r = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    setTilt({ rx: -y * 8, ry: x * 8 })
  }
  const onLeave = () => setTilt({ rx: 0, ry: 0 })

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ delay: index * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: 'transform 0.15s ease-out',
      }}
      className="glass group relative flex flex-col overflow-hidden rounded-3xl p-6 hover:shadow-[0_25px_60px_-25px_rgba(139,92,246,0.5)]"
    >
      {/* Animated conic gradient border on hover */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: 'conic-gradient(from 0deg, rgba(139,92,246,0.5), rgba(59,130,246,0.5), rgba(236,72,153,0.5), rgba(139,92,246,0.5))',
          mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '1.5px',
        }}
      />

      <div className="flex items-start justify-between">
        <motion.div
          whileHover={{ rotate: 8, scale: 1.05 }}
          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${config.tone} text-white shadow-lg`}
        >
          <Icon size={22} />
        </motion.div>
        <span className="rounded-full border border-black/10 bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-brand-muted dark:border-white/10 dark:bg-white/5 dark:text-brand-dark-muted">
          {course.category}
        </span>
      </div>

      <h3 className="mt-6 text-xl font-semibold tracking-tight text-brand-text dark:text-white">{course.title}</h3>
      <p className="mt-2 text-sm text-brand-muted dark:text-brand-dark-muted line-clamp-2">{course.description}</p>

      <div className="mt-6 flex items-center justify-between border-t border-black/5 pt-4 dark:border-white/10">
        <div className="text-xs text-brand-muted dark:text-brand-dark-muted">
          <span className="font-semibold text-brand-text dark:text-white">{course.duration}</span> • {course.level}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white transition-transform group-hover:rotate-45">
          <ArrowUpRight size={16} />
        </div>
      </div>
    </motion.div>
  )
}

export default function HomeCoursesSection() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const displayedCourses = courses.filter((c) => c.status === 'Active').slice(0, 6)

  return (
    <section ref={ref} className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
        animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
        transition={{ duration: 0.8 }}
        className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end"
      >
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500 dark:text-violet-400">
            Learn what matters
          </div>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-brand-text dark:text-white sm:text-5xl font-display">
            Career-ready programs,{' '}
            <span className="gradient-text">built for Indian students</span>.
          </h2>
        </div>
        <p className="max-w-md text-brand-muted dark:text-brand-dark-muted">
          Every course is crafted with real engineers and industry experts so you graduate with
          skills teams actually pay for.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {displayedCourses.map((course, i) => (
          <Link key={course.id} to={`/courses`} className="block">
            <GlassCourseCard course={course} index={i} />
          </Link>
        ))}
      </div>

      {/* View all CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="mt-12 text-center"
      >
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-[0_10px_40px_-10px_rgba(139,92,246,0.7)]"
        >
          View All Courses
          <ArrowUpRight size={16} />
        </Link>
      </motion.div>
    </section>
  )
}
