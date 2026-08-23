import { useRef, CSSProperties } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  Code2,
  Compass,
  Download,
  FileCode,
  FileText,
  GraduationCap,
  HeartHandshake,
  HelpCircle,
  Laptop,
  Layers,
  LucideIcon,
  Map,
  MapPinned,
  Play,
  Rocket,
  Search,
  Sparkles,
  Star,
  Target,
  Terminal,
  Trophy,
  Users,
  Video,
  Zap,
} from 'lucide-react'

export type SpotlightVariant =
  | 'course'
  | 'resource'
  | 'path'
  | 'mentor'
  | 'quiz'
  | 'roadmap'
  | 'video'
  | 'apply'

export interface PanelSpotlightItem {
  icon: LucideIcon
  label: string
  value?: string
}

export interface PanelSpotlightCardProps {
  variant: SpotlightVariant
  icon?: LucideIcon
  eyebrow?: string
  title?: string
  description?: string
  stat?: { value: string; label: string }
  secondaryStat?: { value: string; label: string }
  items?: PanelSpotlightItem[]
  badgeText?: string
  liveTicker?: string[]
  className?: string
}

interface OrbitBadge {
  icon: LucideIcon
  label: string
  sub: string
  tone: 'violet' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple'
  position: string
  delay: number
}

interface SceneConfig {
  accentGradient: string
  glowGradient: string
  ringGradient: [string, string]
  centerTitle: string
  centerSub: string
  centerIcon: LucideIcon
  badges: OrbitBadge[]
}

const TONE_CLASSES: Record<string, { bg: string; text: string; shadow: string }> = {
  violet: {
    bg: 'from-violet-500 to-purple-600',
    text: 'text-violet-500 dark:text-violet-400',
    shadow: 'shadow-violet-500/25',
  },
  blue: {
    bg: 'from-blue-500 to-cyan-500',
    text: 'text-blue-500 dark:text-blue-400',
    shadow: 'shadow-blue-500/25',
  },
  emerald: {
    bg: 'from-emerald-500 to-teal-500',
    text: 'text-emerald-500 dark:text-emerald-400',
    shadow: 'shadow-emerald-500/25',
  },
  amber: {
    bg: 'from-amber-500 to-orange-500',
    text: 'text-amber-500 dark:text-amber-400',
    shadow: 'shadow-amber-500/25',
  },
  rose: {
    bg: 'from-rose-500 to-pink-500',
    text: 'text-rose-500 dark:text-rose-400',
    shadow: 'shadow-rose-500/25',
  },
  cyan: {
    bg: 'from-cyan-500 to-blue-500',
    text: 'text-cyan-500 dark:text-cyan-400',
    shadow: 'shadow-cyan-500/25',
  },
  purple: {
    bg: 'from-purple-500 to-pink-500',
    text: 'text-purple-500 dark:text-purple-400',
    shadow: 'shadow-purple-500/25',
  },
}

const SCENE_CONFIGS: Record<SpotlightVariant, SceneConfig> = {
  course: {
    accentGradient: 'from-violet-500 via-indigo-500 to-cyan-500',
    glowGradient: 'from-violet-500/35 via-fuchsia-500/20 to-cyan-500/30',
    ringGradient: ['#8b5cf6', '#06b6d4'],
    centerTitle: 'DSA & Tech Masterclass',
    centerSub: 'Semester & Placement Ready',
    centerIcon: Code2,
    badges: [
      { icon: Code2, label: 'Full Stack & DSA', sub: 'Java, C++, React', tone: 'violet', position: 'top-2 -left-4', delay: 0.2 },
      { icon: Zap, label: 'Live Projects', sub: 'Production Grade', tone: 'cyan', position: 'top-8 -right-4', delay: 0.35 },
      { icon: GraduationCap, label: 'University Aligned', sub: 'AKTU & IPU Syllabi', tone: 'blue', position: 'bottom-6 -left-4', delay: 0.5 },
      { icon: Star, label: '4.9★ Placement Rated', sub: '10K+ Students', tone: 'amber', position: 'bottom-2 -right-4', delay: 0.65 },
    ],
  },
  resource: {
    accentGradient: 'from-blue-600 via-cyan-500 to-emerald-400',
    glowGradient: 'from-blue-500/35 via-cyan-500/20 to-emerald-500/30',
    ringGradient: ['#3b82f6', '#10b981'],
    centerTitle: 'Curated Academic Vault',
    centerSub: 'Notes, PYQs & Syllabi',
    centerIcon: FileText,
    badges: [
      { icon: FileText, label: 'Topper Notes', sub: 'Handwritten & Clean', tone: 'cyan', position: 'top-2 -left-4', delay: 0.2 },
      { icon: Download, label: 'Solved PYQs', sub: 'Semester Wise', tone: 'blue', position: 'top-8 -right-4', delay: 0.35 },
      { icon: CheckCircle2, label: 'Verified Material', sub: 'Professor Checked', tone: 'emerald', position: 'bottom-6 -left-4', delay: 0.5 },
      { icon: Layers, label: '150+ Digital PDFs', sub: 'Instant Download', tone: 'violet', position: 'bottom-2 -right-4', delay: 0.65 },
    ],
  },
  mentor: {
    accentGradient: 'from-emerald-500 via-teal-500 to-indigo-600',
    glowGradient: 'from-emerald-500/35 via-teal-500/20 to-indigo-500/30',
    ringGradient: ['#10b981', '#6366f1'],
    centerTitle: '1-on-1 Mentorship Hub',
    centerSub: 'FAANG & Tech Leaders',
    centerIcon: HeartHandshake,
    badges: [
      { icon: HeartHandshake, label: '1:1 Career Guidance', sub: 'Personalized Strategy', tone: 'emerald', position: 'top-2 -left-4', delay: 0.2 },
      { icon: Users, label: 'Top Industry Mentors', sub: 'Software Engineers', tone: 'cyan', position: 'top-8 -right-4', delay: 0.35 },
      { icon: Target, label: 'Mock Interviews', sub: 'System Design & HR', tone: 'violet', position: 'bottom-6 -left-4', delay: 0.5 },
      { icon: Zap, label: '24h Response SLA', sub: '100% Free Sessions', tone: 'amber', position: 'bottom-2 -right-4', delay: 0.65 },
    ],
  },
  path: {
    accentGradient: 'from-purple-600 via-pink-500 to-indigo-600',
    glowGradient: 'from-purple-500/35 via-pink-500/20 to-indigo-500/30',
    ringGradient: ['#a855f7', '#ec4899'],
    centerTitle: 'Career Compass Radar',
    centerSub: '15+ Career Trajectories',
    centerIcon: Compass,
    badges: [
      { icon: Compass, label: 'Career Roadmaps', sub: 'AI, SDE, DevOps', tone: 'purple', position: 'top-2 -left-4', delay: 0.2 },
      { icon: MapPinned, label: 'Entrance Exams', sub: 'GATE, JEE & JoSAA', tone: 'rose', position: 'top-8 -right-4', delay: 0.35 },
      { icon: Briefcase, label: 'Salary Trends', sub: '₹8 LPA - ₹45 LPA', tone: 'emerald', position: 'bottom-6 -left-4', delay: 0.5 },
      { icon: Target, label: 'Skill Milestone Track', sub: 'Step-by-Step', tone: 'cyan', position: 'bottom-2 -right-4', delay: 0.65 },
    ],
  },
  quiz: {
    accentGradient: 'from-amber-500 via-orange-500 to-rose-600',
    glowGradient: 'from-amber-500/35 via-orange-500/20 to-rose-500/30',
    ringGradient: ['#f59e0b', '#f43f5e'],
    centerTitle: 'Mock Test Simulator',
    centerSub: 'Timed Challenge Arena',
    centerIcon: Trophy,
    badges: [
      { icon: Trophy, label: 'Timed Exam Simulation', sub: 'Speed & Accuracy', tone: 'amber', position: 'top-2 -left-4', delay: 0.2 },
      { icon: HelpCircle, label: 'Instant Explanations', sub: 'Detailed Steps', tone: 'rose', position: 'top-8 -right-4', delay: 0.35 },
      { icon: CheckCircle2, label: 'Live Leaderboard', sub: 'Rank Benchmarking', tone: 'violet', position: 'bottom-6 -left-4', delay: 0.5 },
      { icon: Zap, label: '10K+ Participants', sub: '100% Free Practice', tone: 'emerald', position: 'bottom-2 -right-4', delay: 0.65 },
    ],
  },
  roadmap: {
    accentGradient: 'from-teal-500 via-emerald-500 to-blue-600',
    glowGradient: 'from-teal-500/35 via-emerald-500/20 to-blue-500/30',
    ringGradient: ['#14b8a6', '#3b82f6'],
    centerTitle: 'Milestone Journey Matrix',
    centerSub: 'Zero to Placement Ready',
    centerIcon: Map,
    badges: [
      { icon: Map, label: 'Phase-by-Phase Timeline', sub: 'Foundations to Pro', tone: 'cyan', position: 'top-2 -left-4', delay: 0.2 },
      { icon: Target, label: 'Track Your Progress', sub: 'Browser Auto-Save', tone: 'emerald', position: 'top-8 -right-4', delay: 0.35 },
      { icon: BookOpen, label: 'Linked Study Materials', sub: 'Curated Docs & Code', tone: 'blue', position: 'bottom-6 -left-4', delay: 0.5 },
      { icon: Sparkles, label: 'Placement Blueprints', sub: 'High ROI Skills', tone: 'violet', position: 'bottom-2 -right-4', delay: 0.65 },
    ],
  },
  video: {
    accentGradient: 'from-red-500 via-rose-500 to-violet-600',
    glowGradient: 'from-red-500/35 via-rose-500/20 to-violet-500/30',
    ringGradient: ['#ef4444', '#8b5cf6'],
    centerTitle: '1080p Video Masterclasses',
    centerSub: 'Curated YouTube Hub',
    centerIcon: Video,
    badges: [
      { icon: Play, label: 'HD Masterclasses', sub: 'Ad-Free Experience', tone: 'rose', position: 'top-2 -left-4', delay: 0.2 },
      { icon: Video, label: '11 Topic Playlists', sub: 'DSA, AI, Counseling', tone: 'violet', position: 'top-8 -right-4', delay: 0.35 },
      { icon: Sparkles, label: 'Chapter Timestamps', sub: 'Jump Directly to Code', tone: 'amber', position: 'bottom-6 -left-4', delay: 0.5 },
      { icon: CheckCircle2, label: 'Hand-Picked Guides', sub: 'Top Engineers', tone: 'cyan', position: 'bottom-2 -right-4', delay: 0.65 },
    ],
  },
  apply: {
    accentGradient: 'from-blue-600 via-indigo-600 to-purple-600',
    glowGradient: 'from-blue-500/35 via-indigo-500/20 to-purple-500/30',
    ringGradient: ['#2563eb', '#9333ea'],
    centerTitle: 'Skills021 Careers Portal',
    centerSub: 'Empower 100K+ Students',
    centerIcon: Rocket,
    badges: [
      { icon: Briefcase, label: '10+ Departments', sub: 'Tech, Content, Growth', tone: 'blue', position: 'top-2 -left-4', delay: 0.2 },
      { icon: Zap, label: 'Direct Fast-Track Review', sub: 'Response in 48-72h', tone: 'violet', position: 'top-8 -right-4', delay: 0.35 },
      { icon: GraduationCap, label: 'Internships & Jobs', sub: 'Certificates & Stipends', tone: 'emerald', position: 'bottom-6 -left-4', delay: 0.5 },
      { icon: Users, label: 'Remote Friendly', sub: 'High Impact EdTech', tone: 'cyan', position: 'bottom-2 -right-4', delay: 0.65 },
    ],
  },
}

function FloatingBadge({
  icon: Icon,
  label,
  sub,
  tone,
  position,
  delay,
}: OrbitBadge) {
  const t = TONE_CLASSES[tone] || TONE_CLASSES.violet
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.6, type: 'spring', stiffness: 120 }}
      className={`absolute z-30 flex items-center gap-3 rounded-2xl border border-white/40 dark:border-white/10 bg-white/85 dark:bg-brand-dark-card/90 px-3.5 py-2.5 shadow-xl shadow-slate-900/10 backdrop-blur-xl transition-transform hover:scale-105 ${position}`}
    >
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${t.bg} text-white shadow-md ${t.shadow} flex-shrink-0`}
      >
        <Icon size={16} />
      </motion.div>
      <div className="text-left min-w-0 pr-1">
        <div className="text-xs font-bold leading-tight text-brand-text dark:text-white truncate">{label}</div>
        <div className="text-[10px] font-medium text-brand-muted dark:text-brand-dark-muted truncate">{sub}</div>
      </div>
    </motion.div>
  )
}

/**
 * 3D Dynamic Visual Stage (No boxy outlayer/card container)
 * Features interactive 3D perspective tilt, dual orbital rings, floating holographic core & orbit badges.
 */
export default function PanelSpotlightCard({
  variant,
  className = '',
}: PanelSpotlightCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 140, damping: 18 })
  const sy = useSpring(my, { stiffness: 140, damping: 18 })

  const rotY = useTransform(sx, [-1, 1], [-12, 12])
  const rotX = useTransform(sy, [-1, 1], [10, -10])
  const tx = useTransform(sx, [-1, 1], [-15, 15])
  const ty = useTransform(sy, [-1, 1], [-10, 10])

  const cfg = SCENE_CONFIGS[variant] || SCENE_CONFIGS.course
  const CenterIcon = cfg.centerIcon

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mx.set(x * 2)
    my.set(y * 2)
  }

  const handleLeave = () => {
    mx.set(0)
    my.set(0)
  }

  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`relative mx-auto h-[440px] w-full max-w-[540px] select-none ${className}`}
      style={{ perspective: 1000 }}
    >
      {/* Dynamic Multi-Color Ambient Glow */}
      <div
        className={`pointer-events-none absolute inset-x-6 top-10 h-72 rounded-full bg-gradient-to-br ${cfg.glowGradient} blur-3xl opacity-70 dark:opacity-50`}
      />

      {/* Dual Rotating Dashed Orbital SVG Rings */}
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full opacity-40 dark:opacity-30" viewBox="0 0 540 440" fill="none">
        <motion.ellipse
          cx="270"
          cy="220"
          rx="230"
          ry="150"
          stroke={`url(#ring-${variant}-1)`}
          strokeWidth="1.4"
          strokeDasharray="6 8"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 38, ease: 'linear' }}
          style={{ originX: '270px', originY: '220px' }}
        />
        <defs>
          <linearGradient id={`ring-${variant}-1`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={cfg.ringGradient[0]} />
            <stop offset="100%" stopColor={cfg.ringGradient[1]} />
          </linearGradient>
        </defs>
      </svg>

      <svg className="pointer-events-none absolute inset-4 z-10 h-[92%] w-[92%] opacity-35 dark:opacity-25" viewBox="0 0 540 440" fill="none">
        <motion.ellipse
          cx="270"
          cy="220"
          rx="190"
          ry="115"
          stroke={`url(#ring-${variant}-2)`}
          strokeWidth="1.2"
          strokeDasharray="4 10"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}
          style={{ originX: '270px', originY: '220px' }}
        />
        <defs>
          <linearGradient id={`ring-${variant}-2`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={cfg.ringGradient[1]} />
            <stop offset="100%" stopColor={cfg.ringGradient[0]} />
          </linearGradient>
        </defs>
      </svg>

      {/* 3D Dynamic Floating Central Device / Hologram Stage */}
      <motion.div
        className="absolute left-1/2 top-1/2 z-20 w-[360px] sm:w-[400px] -translate-x-1/2 -translate-y-1/2"
        style={{
          rotateX: rotX,
          rotateY: rotY,
          x: tx,
          y: ty,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Floating Holographic Platform Frame */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 4.8, ease: 'easeInOut' }}
          className="relative rounded-3xl border border-white/50 dark:border-white/15 bg-gradient-to-b from-white/80 via-white/50 to-white/20 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-950/40 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl"
          style={{ transform: 'translateZ(30px)' }}
        >
          {/* Top Window Bar */}
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80 shadow-sm" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80 shadow-sm" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80 shadow-sm" />
            </div>
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/5 dark:bg-white/10 text-[10px] font-bold tracking-wider uppercase text-brand-muted dark:text-white/70">
              <Sparkles size={10} className="text-violet-500 dark:text-cyan-400" />
              <span>Skills021 Stage</span>
            </div>
          </div>

          {/* Central Interactive Display Area */}
          <div className="relative mt-3 aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-white shadow-inner flex flex-col justify-between">
            {/* Dotted cyber grid overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]" />

            {/* Glowing Accent Orb inside screen */}
            <div
              className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${cfg.accentGradient} opacity-30 blur-2xl`}
            />

            {/* Center Dynamic Visual Element */}
            <div className="relative z-10 flex items-center gap-3.5">
              <motion.div
                animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cfg.accentGradient} shadow-lg shadow-violet-500/30 text-white flex-shrink-0`}
              >
                <CenterIcon size={24} strokeWidth={2} />
              </motion.div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-white tracking-wide truncate">{cfg.centerTitle}</div>
                <div className="text-[10px] font-medium text-white/60 truncate">{cfg.centerSub}</div>
              </div>
            </div>

            {/* Micro Dynamic Animation Bars / Visualizer */}
            <div className="relative z-10 flex items-end justify-between gap-1 pt-4">
              <div className="flex items-center gap-1">
                {[40, 75, 55, 90, 60, 80, 45, 95].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [`${h * 0.4}%`, `${h}%`, `${h * 0.3}%`] }}
                    transition={{ repeat: Infinity, duration: 1.2 + i * 0.15, ease: 'easeInOut' }}
                    className="w-1.5 rounded-full bg-gradient-to-t from-violet-500 via-cyan-400 to-emerald-400"
                    style={{ height: `${h}%`, minHeight: '6px' }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md border border-white/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">Active</span>
              </div>
            </div>

            {/* Glowing bottom reflection scan line */}
            <div className="pointer-events-none absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />
          </div>

          {/* 3D Base Edge Lip */}
          <div className="mx-auto mt-2 h-1.5 w-1/3 rounded-full bg-slate-400/40 dark:bg-white/20" />
        </motion.div>
      </motion.div>

      {/* Floating 3D Orbit Badges */}
      {cfg.badges.map((badge, idx) => (
        <FloatingBadge
          key={badge.label}
          icon={badge.icon}
          label={badge.label}
          sub={badge.sub}
          tone={badge.tone}
          position={badge.position}
          delay={badge.delay}
        />
      ))}

      {/* Floating Geometric Micro-Particles */}
      <motion.div
        className="pointer-events-none absolute right-[12%] top-[25%] h-3 w-3 rotate-45 bg-gradient-to-br from-violet-400 to-cyan-400 shadow-md shadow-violet-500/40"
        animate={{ y: [0, -18, 0], rotate: [45, 90, 45] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute left-[10%] top-[45%] h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50"
        animate={{ y: [0, 16, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute right-[22%] bottom-[18%] h-1.5 w-6 rounded-full bg-gradient-to-r from-violet-400 via-pink-400 to-blue-400 shadow-md shadow-pink-500/30"
        animate={{ x: [0, 14, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
