import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Layers,
  Zap,
  Star,
} from 'lucide-react'
import { fetchPublishedSemesterBundles } from '../lib/semesterBundleService'
import type { SemesterBundle } from '../lib/semesterBundleTypes'

/**
 * Dynamically computes effective daily and monthly pricing rates:
 * - Semester Plan: 1 Semester = 180 days (~6 months)
 * - 4-Year Degree Pass: 4 Years = 1,460 days (~48 months)
 * 
 * Examples:
 * - ₹1,499 / 180 = ₹8.33 / day (₹250 / mo)
 * - ₹699 / 180 = ₹3.88 / day (₹117 / mo) [e.g. Semester 8 bundle]
 * - ₹5,080 / 1460 = ₹3.48 / day (₹106 / mo) [Complete 4-Year B.Tech Pass]
 */
export function calculateSemesterRates(price?: number, isFourYear: boolean = false) {
  const numericPrice = Number(price || 0)
  if (numericPrice <= 0) return { daily: '8.33', monthly: 250 }

  if (isFourYear) {
    return {
      daily: (numericPrice / 1460).toFixed(2),
      monthly: Math.round(numericPrice / 48),
    }
  }

  return {
    daily: (numericPrice / 180).toFixed(2),
    monthly: Math.round(numericPrice / 6),
  }
}

// Fallback known published semester bundles from Supabase in case offline/loading
const FALLBACK_BUNDLES: Partial<SemesterBundle>[] = [
  {
    id: 'a8fb709e-1ac0-44aa-9b5b-d49853f581a1',
    title: 'B-Tech CSE-IT — Semester 1 Complete Bundle',
    semesterNumber: 1,
    description: 'Complete syllabus coverage, video lectures, solved PYQs and unit notes for Semester 1.',
    sixMonthPrice: 1499,
    lifetimePrice: 3376,
    rating: 4.9,
  },
  {
    id: '288febb5-4d1a-4193-b1ec-95b530101ac1',
    title: 'B-Tech CSE-IT — Semester 3 Complete Bundle',
    semesterNumber: 3,
    description: 'Data Structures, discrete maths, OOP and core engineering subjects for Semester 3.',
    sixMonthPrice: 1499,
    lifetimePrice: 3247,
    rating: 4.9,
  },
  {
    id: '85666cf3-3441-4d24-9e07-c6303a873f78',
    title: 'B-Tech CSE-IT — Semester 5 Complete Bundle',
    semesterNumber: 5,
    description: 'Database systems, operating systems, algorithm design and software engineering for Semester 5.',
    sixMonthPrice: 1499,
    lifetimePrice: 3896,
    rating: 5.0,
  },
  {
    id: 'sem-8-preset',
    title: 'B-Tech CSE-IT — Semester 8 Complete Bundle',
    semesterNumber: 8,
    description: 'Final semester electives, major project guidance, cloud systems and placement viva prep.',
    sixMonthPrice: 699,
    lifetimePrice: 1899,
    rating: 5.0,
  },
]

export default function HomeSemesterBundlesSection() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [bundles, setBundles] = useState<SemesterBundle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchPublishedSemesterBundles()
      .then((data) => {
        if (!active) return
        if (data && data.length > 0) {
          // Sort by semester number (1, 2, 3... 8)
          const sorted = [...data].sort((a, b) => (a.semesterNumber || 0) - (b.semesterNumber || 0))
          setBundles(sorted)
        } else {
          setBundles(FALLBACK_BUNDLES as SemesterBundle[])
        }
      })
      .catch(() => {
        if (active) setBundles(FALLBACK_BUNDLES as SemesterBundle[])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const displayBundles = bundles.length > 0 ? bundles : (FALLBACK_BUNDLES as SemesterBundle[])

  return (
    <section ref={ref} className="relative z-10 mx-auto max-w-7xl px-6 py-20 sm:px-8">
      {/* ── Section Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
        animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
        transition={{ duration: 0.7 }}
        className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end"
      >
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-violet-300">
            <GraduationCap size={14} className="text-violet-500" />
            University Semester Bundles
          </div>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-brand-text dark:text-white sm:text-5xl font-display">
            Master your semester for{' '}
            <span className="gradient-text">less than a chai a day</span>.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-brand-muted dark:text-brand-dark-muted">
            High-yield video lectures, unit-by-unit handwritten notes, and solved university PYQs tailored
            specifically for AKTU, IPU & engineering curriculums.
          </p>
        </div>

        {/* Pricing highlights badge pills */}
        <div className="flex flex-wrap gap-3">
          <div className="rounded-2xl border border-violet-200/80 bg-white/80 p-3.5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-brand-dark-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Semester Bundles (1 to 8)
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-2xl font-black text-brand-text dark:text-white">From ₹3.88</span>
              <span className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted">/ day</span>
            </div>
            <div className="text-[10px] text-brand-muted font-medium">Sem 1, 3, 5: ₹8.33/day · Sem 8: ₹3.88/day</div>
          </div>
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 shadow-sm backdrop-blur-md dark:border-emerald-500/20 dark:bg-emerald-950/40">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Complete 4-Year Pass
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹3.48</span>
              <span className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted">/ day</span>
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">All 8 Semesters Pass</div>
          </div>
        </div>
      </motion.div>

      {/* ── 4-Year Degree Complete Pack Spotlight Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.15, duration: 0.65 }}
        className="group relative mb-10 overflow-hidden rounded-3xl border border-violet-300/60 bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-cyan-500/10 p-6 backdrop-blur-xl transition-all duration-300 hover:border-violet-400 dark:border-white/10 sm:p-8"
      >
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1 text-xs font-black text-white shadow-md">
              <Sparkles size={13} /> Complete 4-Year Degree Pass
            </div>
            <h3 className="mt-3 text-2xl font-black text-brand-text dark:text-white sm:text-3xl">
              All 8 Semesters + DSA & Placement Prep at just{' '}
              <span className="text-violet-600 dark:text-violet-400 font-black">₹3.48 per day</span>
            </h3>
            <p className="mt-2 text-sm text-brand-muted dark:text-brand-dark-muted leading-relaxed">
              Why pay semester by semester? Get complete lifetime access to all 4 years of engineering subjects,
              PYQs, practical lab files, and interview preparation modules in one single pass.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-brand-text dark:text-white/90">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" /> Complete 4-Year Syllabus (All 8 Semesters)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" /> Solved University PYQs & Handouts
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" /> Lifetime Updates Included
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
            <div className="text-left sm:text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                Effective Daily Rate
              </span>
              <div className="flex items-baseline gap-1.5 sm:justify-end">
                <span className="text-4xl font-black text-brand-text dark:text-white">₹3.48</span>
                <span className="text-sm font-semibold text-brand-muted">/ day</span>
              </div>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                ₹106/month · Calculated over 4 years (1,460 days)
              </span>
            </div>
            <Link
              to="/courses?tab=semester-bundles"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.02] hover:shadow-xl sm:w-auto"
            >
              Explore 4-Year Pass (See Real Bundle Price) <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Dynamic Semester Cards Grid ── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-8">
        {displayBundles.map((bundle, index) => {
          const rawPrice = bundle.sixMonthPrice || (bundle.semesterNumber === 8 ? 699 : 1499)
          const isFourYear = bundle.title?.toLowerCase().includes('4-year')
          const rates = calculateSemesterRates(rawPrice, isFourYear)

          return (
            <motion.div
              key={bundle.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15 + index * 0.08, duration: 0.6 }}
              whileHover={{ y: -6 }}
              className="glass group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_20px_50px_-20px_rgba(139,92,246,0.35)]"
            >
              {/* Accent corner glow */}
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br from-violet-500/10 to-indigo-500/10 blur-2xl transition-transform group-hover:scale-125" />

              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-100 px-3 py-1 text-xs font-black text-violet-800 dark:bg-violet-950/70 dark:text-violet-200">
                    <GraduationCap size={14} />
                    Semester {bundle.semesterNumber ?? 'Curriculum'}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    {bundle.rating ?? 4.9}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mt-4 text-lg font-bold leading-snug text-brand-text dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2">
                  {bundle.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-brand-muted dark:text-brand-dark-muted line-clamp-2">
                  {bundle.description ||
                    `All-in-one semester curriculum covering video lectures, handwritten notes, and solved question papers.`}
                </p>

                {/* Highlights */}
                <div className="mt-4 space-y-1.5 border-t border-black/5 pt-4 dark:border-white/10 text-xs text-brand-text dark:text-brand-dark-text">
                  <div className="flex items-center gap-2">
                    <BookOpen size={13} className="text-violet-500 shrink-0" />
                    <span>All core theory & lab subjects</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers size={13} className="text-indigo-500 shrink-0" />
                    <span>Unit-wise solved university PYQs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap size={13} className="text-amber-500 shrink-0" />
                    <span>Complete 6-month exam prep curriculum</span>
                  </div>
                </div>
              </div>

              {/* ── Rs Section (Dynamic daily & monthly rates calculated automatically) ── */}
              <div className="mt-6 border-t border-black/5 pt-4 dark:border-white/10">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                      Semester {bundle.semesterNumber} Daily Rate
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
                        ₹{rates.daily}
                      </span>
                      <span className="text-xs font-semibold text-brand-muted">/ day</span>
                    </div>
                    <span className="text-[10px] text-brand-muted block mt-0.5">
                      (₹{rates.monthly}/mo · ₹{rawPrice} full semester)
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Best Value
                    </span>
                  </div>
                </div>

                {/* Direct link: Go inside to see the real price of the bundle */}
                <Link
                  to={`/courses/semester-bundles/${bundle.id}`}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A0A0A] py-2.5 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-violet-600 hover:shadow-md dark:bg-white dark:text-black dark:hover:bg-violet-500 dark:hover:text-white"
                >
                  View Bundle & Real Price <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* View All Semester Bundles CTA */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-12 text-center"
      >
        <Link
          to="/courses?tab=semester-bundles"
          className="inline-flex items-center gap-2 rounded-full border border-violet-300 bg-white/80 px-7 py-3 text-xs font-bold text-violet-700 shadow-sm backdrop-blur-md transition-all hover:bg-violet-50 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-violet-300 dark:hover:bg-white/10"
        >
          Browse All Semester Bundles & Degree Passes <ArrowRight size={14} />
        </Link>
      </motion.div>
    </section>
  )
}
