import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  HeartHandshake,
  Library,
  MapPinned,
  Radio,
  Sparkles,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'

type SpotlightVariant = 'course' | 'resource' | 'path' | 'mentor' | 'webinar'

interface PanelSpotlightItem {
  icon: LucideIcon
  label: string
  value?: string
}

interface PanelSpotlightCardProps {
  variant: SpotlightVariant
  icon: LucideIcon
  eyebrow: string
  title: string
  description: string
  stat?: { value: string; label: string }
  items: PanelSpotlightItem[]
}

const META: Record<SpotlightVariant, { accent: string; soft: string }> = {
  course: { accent: 'from-violet-500 to-teal-400', soft: 'bg-violet-500/10 text-violet-600 dark:text-violet-300' },
  // Restored to the original Resources spotlight palette from the first project ZIP.
  resource: { accent: 'from-violet-500 to-teal-400', soft: 'bg-violet-500/10 text-violet-600 dark:text-violet-300' },
  path: { accent: 'from-primary-500 to-cyan-400', soft: 'bg-primary-500/10 text-primary-600 dark:text-primary-300' },
  mentor: { accent: 'from-violet-600 via-indigo-500 to-cyan-500', soft: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  webinar: { accent: 'from-red-500 to-orange-400', soft: 'bg-red-500/10 text-red-600 dark:text-red-300' },
}

const FloatingIcon = ({ variant }: { variant: SpotlightVariant }) => {
  const Icon = variant === 'course' ? GraduationCap : variant === 'resource' ? FileText : variant === 'path' ? Target : variant === 'webinar' ? Radio : HeartHandshake
  return <Icon size={28} strokeWidth={1.8} />
}

const TOOL_ITEMS: Record<SpotlightVariant, { icon: LucideIcon; label: string }[]> = {
  course: [
    { icon: BookOpen, label: 'LEARN' },
    { icon: Zap, label: 'FAST' },
    { icon: GraduationCap, label: 'TRACK' },
  ],
  resource: [
    { icon: FileText, label: 'NOTES' },
    { icon: Zap, label: 'QUICK' },
    { icon: BookOpen, label: 'READ' },
  ],
  path: [
    { icon: Target, label: 'GOAL' },
    { icon: MapPinned, label: 'MAP' },
    { icon: BriefcaseBusiness, label: 'CAREER' },
  ],
  mentor: [
    { icon: Users, label: 'EXPERTS' },
    { icon: HeartHandshake, label: 'GUIDE' },
    { icon: CheckCircle2, label: 'TRUST' },
  ],
  webinar: [
    { icon: Radio, label: 'LIVE' },
    { icon: CalendarDays, label: 'DATE' },
    { icon: ExternalLink, label: 'JOIN' },
  ],
}

/**
 * Floating page spotlight. There is intentionally no enclosing card/background:
 * the information appears as a small, animated composition that belongs to the
 * page hero instead of looking like another boxed panel.
 */
export default function PanelSpotlightCard({
  variant,
  icon: Icon,
  eyebrow,
  title,
  description,
  stat,
  items,
}: PanelSpotlightCardProps) {
  const m = META[variant]

  return (
    <div className={`panel-float panel-float-${variant}`} data-variant={variant}>
      <div className={`panel-float-glow bg-gradient-to-br ${m.accent}`} aria-hidden="true" />
      <div className="panel-float-ring" aria-hidden="true" />
      <div className="panel-float-orbit" aria-hidden="true">
        {TOOL_ITEMS[variant].map(({ icon: ToolIcon, label }, index) => (
          <span className={`panel-float-tool panel-float-tool-${index}`} key={label}>
            <ToolIcon size={12} strokeWidth={2.2} />
            <b>{label}</b>
          </span>
        ))}
      </div>
      <div className="panel-float-dot panel-float-dot-a" aria-hidden="true" />
      <div className="panel-float-dot panel-float-dot-b" aria-hidden="true" />

      <div className={`panel-float-core bg-gradient-to-br ${m.accent}`}>
        <Icon size={30} strokeWidth={1.8} />
      </div>

      <div className="panel-float-copy">
        <span className="panel-float-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className="panel-float-items">
        {items.map(({ icon: ItemIcon, label, value }, index) => (
          <div className={`panel-float-chip panel-float-chip-${index}`} key={label}>
            <span className={`panel-float-chip-icon ${m.soft}`}><ItemIcon size={14} /></span>
            <span>{label}</span>
            {value ? <strong>{value}</strong> : <CheckCircle2 size={13} className="panel-float-check" />}
          </div>
        ))}
      </div>

      {stat && (
        <div className={`panel-float-stat border-${variant}`}>
          <div className="panel-float-stat-value">{stat.value}</div>
          <div className="panel-float-stat-label">{stat.label}</div>
          <div className={`panel-float-stat-icon bg-gradient-to-br ${m.accent}`}>
            <FloatingIcon variant={variant} />
          </div>
        </div>
      )}

      <div className="panel-float-sparkles" aria-hidden="true">
        <Sparkles size={13} />
        <Sparkles size={9} />
      </div>
    </div>
  )
}
