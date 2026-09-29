import { useState } from 'react'
import {
  Clock, CheckCircle2, Video, ExternalLink, CalendarDays,
  GraduationCap, BookOpen, Trophy, Zap, Star, Users, Radio,
  ChevronDown, ChevronUp, MapPin, Sparkles, FlaskConical, BadgeCheck, Award,
} from 'lucide-react'
import type {
  LiveWebinar,
  WebinarSpeaker,
  WebinarTimingState,
} from '../lib/webinarService'

// ─── Icon mapping for highlights ─────────────────────────────────────────────
function HighlightIcon({ icon, size = 16 }: { icon?: string; size?: number }) {
  // Support emoji icons directly
  if (icon && icon.length <= 4 && /\p{Emoji}/u.test(icon)) {
    return <span style={{ fontSize: size }}>{icon}</span>
  }
  switch (icon) {
    case 'graduation': return <GraduationCap size={size} />
    case 'book': return <BookOpen size={size} />
    case 'star': return <Star size={size} />
    case 'award': return <Award size={size} />
    case 'zap': return <Zap size={size} />
    case 'users': return <Users size={size} />
    case 'flask': return <FlaskConical size={size} />
    case 'badge': return <BadgeCheck size={size} />
    case 'trophy':
    default:
      return <Trophy size={size} />
  }
}

// ─── Speaker bio block (NO image – images are rendered in the image panel) ───
function SpeakerInfoBlock({ speaker }: { speaker: WebinarSpeaker }) {
  const [expanded, setExpanded] = useState(false)
  const hasBio = speaker.bio && speaker.bio.length > 0
  const hasShortBio = Boolean(speaker.shortBio)

  return (
    <div className="min-w-0">
      {/* Name + badge */}
      <div className="flex flex-wrap items-center gap-2 mb-0.5">
        <span className="font-bold text-sm text-brand-text dark:text-white">
          {speaker.name}
        </span>
        {speaker.badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
            {speaker.badge}
          </span>
        )}
      </div>
      {speaker.designation && (
        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">{speaker.designation}</p>
      )}
      {speaker.organization && (
        <p className="text-xs text-brand-muted dark:text-brand-dark-muted flex items-center gap-1 mt-0.5">
          <MapPin size={11} className="shrink-0" /> {speaker.organization}
        </p>
      )}
      {/* Experience / Education / Research chips */}
      <div className="flex flex-wrap gap-3 mt-2">
        {speaker.experience && (
          <span className="text-[11px] font-semibold text-brand-muted flex items-center gap-1">
            <Clock size={11} /> {speaker.experience}
          </span>
        )}
        {speaker.education && (
          <span className="text-[11px] font-semibold text-brand-muted flex items-center gap-1">
            <GraduationCap size={11} /> {speaker.education}
          </span>
        )}
        {speaker.researchInfo && (
          <span className="text-[11px] font-semibold text-brand-muted flex items-center gap-1">
            <BookOpen size={11} /> {speaker.researchInfo}
          </span>
        )}
      </div>
      {/* Bio */}
      {(hasShortBio || hasBio) && (
        <div className="mt-3 text-sm leading-relaxed text-brand-muted dark:text-brand-dark-muted space-y-2">
          {!expanded && hasShortBio && <p>{speaker.shortBio}</p>}
          {expanded && hasBio && speaker.bio.map((para, i) => <p key={i}>{para}</p>)}
          {hasBio && (
            <button
              type="button"
              onClick={() => setExpanded(x => !x)}
              className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5 mt-1"
            >
              {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read full bio</>}
            </button>
          )}
        </div>
      )}
      {/* Expertise tags */}
      {speaker.expertiseTags && speaker.expertiseTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {speaker.expertiseTags.map((tag, i) => (
            <span key={i} className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-gray-100 dark:bg-white/10 text-brand-text dark:text-brand-dark-text border border-gray-200 dark:border-white/10">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Speaker image slot ───────────────────────────────────────────────────────
function SpeakerImageSlot({ speaker }: { speaker: WebinarSpeaker }) {
  return (
    <div className="relative flex-1 min-h-0 overflow-hidden bg-gray-100 dark:bg-black/20">
      {speaker.photoUrl ? (
        <img
          src={speaker.photoUrl}
          alt={speaker.name}
          className="absolute inset-0 h-full w-full object-cover object-top"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600 text-white text-center">
          <Sparkles size={36} className="text-white/80 mb-2" />
          <p className="font-black text-base leading-snug">{speaker.name}</p>
          {speaker.badge && (
            <span className="text-xs text-white/80 mt-1 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
              {speaker.badge}
            </span>
          )}
        </div>
      )}
      {/* Name overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-6">
        <p className="text-white font-bold text-sm leading-tight">{speaker.name}</p>
        {speaker.designation && (
          <p className="text-white/70 text-[11px] leading-tight">{speaker.designation}</p>
        )}
      </div>
    </div>
  )
}

// ─── Speaker image panel — adapts to speaker count ───────────────────────────
function SpeakerImagePanel({ speakers, title }: { speakers: WebinarSpeaker[]; title: string }) {
  if (speakers.length === 0) {
    // No speakers: gradient placeholder with webinar title
    return (
      <div className="absolute inset-0 h-full w-full overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-white text-center">
          <Sparkles size={48} className="text-white/80 mb-4" />
          <p className="font-black text-xl leading-snug">{title}</p>
          <span className="text-sm text-white/80 mt-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm">
            Live Webinar
          </span>
        </div>
      </div>
    )
  }

  if (speakers.length === 1) {
    // Single speaker: one large image
    return (
      <div className="absolute inset-0 h-full w-full overflow-hidden bg-gray-100 dark:bg-black/20">
        {speakers[0].photoUrl ? (
          <img
            src={speakers[0].photoUrl}
            alt={speakers[0].name}
            className="absolute inset-0 h-full w-full object-cover object-top"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600 text-white text-center">
            <Sparkles size={42} className="text-white/80 mb-3" />
            <p className="font-black text-lg leading-snug">{speakers[0].name}</p>
            {speakers[0].badge && (
              <span className="text-xs text-white/80 mt-1 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
                {speakers[0].badge}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  if (speakers.length === 2) {
    // Two speakers: equal side-by-side vertical split
    return (
      <div className="absolute inset-0 h-full w-full overflow-hidden flex flex-row">
        {speakers.map((sp, i) => (
          <SpeakerImageSlot key={i} speaker={sp} />
        ))}
      </div>
    )
  }

  if (speakers.length === 3) {
    // Three speakers: top-left large + right column two stacked
    return (
      <div className="absolute inset-0 h-full w-full overflow-hidden flex flex-col lg:flex-row">
        <div className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-black/20 min-h-44">
          <SpeakerImageSlot speaker={speakers[0]} />
        </div>
        <div className="flex-1 flex flex-col">
          {speakers.slice(1).map((sp, i) => (
            <div key={i} className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-black/20 min-h-24">
              <SpeakerImageSlot speaker={sp} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 4+ speakers: 2-column grid
  const cols = speakers.length <= 4 ? 2 : Math.ceil(Math.sqrt(speakers.length))
  return (
    <div
      className="absolute inset-0 h-full w-full overflow-hidden"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {speakers.map((sp, i) => (
        <div key={i} className="relative overflow-hidden bg-gray-100 dark:bg-black/20 min-h-36">
          <SpeakerImageSlot speaker={sp} />
        </div>
      ))}
    </div>
  )
}

// ─── Main Props ───────────────────────────────────────────────────────────────
export interface WebinarCardProps {
  webinar: LiveWebinar
  timing: WebinarTimingState
  isApproved: boolean
  isPending: boolean
  isFree: boolean
  isEnrolledPass: boolean
  isEffectivelyFree: boolean
  onRegister: () => void
  isAuthenticated: boolean
  compact?: boolean
  previewMode?: boolean
}

export function WebinarCard({
  webinar,
  timing,
  isApproved,
  isPending,
  isFree,
  isEnrolledPass,
  isEffectivelyFree,
  onRegister,
  isAuthenticated: _isAuth,
  compact = false,
  previewMode = false,
}: WebinarCardProps) {

  // ── Build consolidated, deduplicated speakers list ─────────────────────────
  // Priority: webinar.speakers[] (new multi-speaker schema)
  // Fallback:  legacy speakerName / speakerBio / etc. fields
  const allSpeakers: WebinarSpeaker[] = []

  if (webinar.speakers && webinar.speakers.length > 0) {
    // New schema: just use speakers array directly
    for (const sp of webinar.speakers) {
      allSpeakers.push(sp)
    }
  } else if (webinar.speakerName) {
    // Legacy single-speaker fallback — NEVER duplicate
    allSpeakers.push({
      name: webinar.speakerName,
      photoUrl: webinar.speakerPhotoUrl || '',
      designation: '',
      organization: '',
      badge: webinar.speakerBadge || '',
      shortBio: '',
      bio: webinar.speakerBio || [],
      experience: '',
      education: '',
      researchInfo: '',
      expertiseTags: [],
    })
  }

  // Status badge config
  const statusBadge = timing.isWebinarLive
    ? { text: `LIVE NOW · ${webinar.provider}`, cls: 'bg-red-600 text-white border-red-500 shadow-md shadow-red-500/25' }
    : timing.isWebinarUpcoming
    ? { text: `Starts in: ${timing.remainingTimeWebinarStr} · ${webinar.provider}`, cls: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800' }
    : { text: `SESSION ENDED · ${webinar.provider}`, cls: 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10' }

  // ─── CTA Button ─────────────────────────────────────────────────────────────
  function renderCta() {
    if (previewMode) {
      return (
        <button type="button" disabled
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-bold opacity-60 cursor-not-allowed"
        >
          <CalendarDays size={16} /> Register for Webinar (Preview)
        </button>
      )
    }

    if (timing.isRegUpcoming) return (
      <button type="button" disabled
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-white/10 px-5 py-3 text-sm font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/10 select-none">
        <Clock size={16} /> Registration Opens Soon
      </button>
    )

    if (isApproved) {
      if (timing.isWebinarEnded) return (
        <button type="button" disabled
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-white/10 px-5 py-3 text-sm font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/10 select-none">
          <Clock size={16} /> Webinar Ended
        </button>
      )
      return (
        <a href={webinar.joinUrl} target="_blank" rel="noopener noreferrer"
          className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 ${
            timing.isWebinarLive
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/20'
              : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-violet-500/20'
          }`}>
          {timing.isWebinarLive
            ? <><Video size={16} /> Join Live Webinar <ExternalLink size={14} /></>
            : <><CheckCircle2 size={16} /> Registered ✓ · Open Join Link <ExternalLink size={14} /></>}
        </a>
      )
    }

    if (isPending) return (
      <button type="button" disabled
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-5 py-3 text-sm font-bold cursor-wait select-none">
        <Clock size={16} className="animate-spin text-amber-500" /> Payment Under Admin Review
      </button>
    )

    if (timing.isRegClosed) return (
      <button type="button" disabled
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-white/10 px-5 py-3 text-sm font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/10 select-none">
        <Clock size={16} /> {timing.isWebinarEnded ? 'Webinar Ended' : 'Registration Closed'}
      </button>
    )

    return (
      <button type="button" onClick={onRegister}
        className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl ${
          isEffectivelyFree
            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-violet-500/20'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
        }`}>
        <CalendarDays size={16} />
        {isEffectivelyFree
          ? (isEnrolledPass ? 'Register (Free with Enrolled Course)' : 'Register for Webinar (Free)')
          : `Register & Pay (₹${webinar.price})`}
      </button>
    )
  }

  function renderSubtext() {
    if (previewMode) return null
    const cls = `text-[11px] font-semibold text-center mt-2 flex items-center justify-center gap-1 ${
      isApproved ? 'text-emerald-600 dark:text-emerald-400'
      : isPending ? 'text-amber-600 dark:text-amber-400'
      : timing.isRegUpcoming ? 'text-brand-muted'
      : timing.isRegOpen ? 'text-violet-600 dark:text-violet-400'
      : 'text-red-500'
    }`
    let text = ''
    if (isApproved) {
      text = timing.isWebinarLive
        ? 'You are registered! Session is live now · Click above to enter'
        : 'You are registered! Meeting link will remain unlocked'
    } else if (isPending) {
      text = 'Payment proof submitted. Admin will approve your access shortly.'
    } else if (timing.isRegUpcoming) {
      text = `Registration opens ${new Date(timing.regStartMs).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`
    } else if (timing.isRegOpen) {
      text = `Registration open · Closes ${new Date(timing.regEndMs).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`
    } else if (timing.isWebinarEnded) {
      text = `Session ended ${new Date(timing.webinarEndMs).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`
    } else {
      text = `Registration closed ${new Date(timing.regEndMs).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`
    }
    return (
      <p className={cls}>
        <Clock size={12} />{text}
      </p>
    )
  }

  // ─── COMPACT card ────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="rounded-3xl border border-violet-100 dark:border-white/10 bg-white dark:bg-brand-dark-card p-5 shadow-sm flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusBadge.cls}`}>
              {timing.isWebinarLive ? 'Live Now' : timing.isWebinarUpcoming ? `Starts in ${timing.remainingTimeWebinarStr}` : 'Session Ended'}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {isApproved && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">✓ Registered</span>
              )}
              {isPending && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">⏳ Under Review</span>
              )}
              <span className="text-xs font-semibold text-brand-muted">
                {isFree ? 'Free' : isEnrolledPass ? `Free (Pass) · ₹${webinar.price}` : `₹${webinar.price}`}
              </span>
            </div>
          </div>

          <h4 className="text-base font-black text-brand-text dark:text-white mb-2 leading-snug">{webinar.title}</h4>

          {allSpeakers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {allSpeakers.map((sp, i) => (
                <div key={i} className="flex items-center gap-2">
                  {sp.photoUrl && (
                    <img src={sp.photoUrl} alt={sp.name} className="w-8 h-8 rounded-full object-cover object-top border border-white/20" onError={e => { (e.currentTarget as HTMLImageElement).style.display='none' }} />
                  )}
                  <span className="text-sm font-bold text-brand-text dark:text-white">{sp.name}</span>
                </div>
              ))}
            </div>
          )}

          {webinar.shortDescription && (
            <p className="text-xs text-brand-muted dark:text-brand-dark-muted line-clamp-2 mb-3">
              {webinar.shortDescription}
            </p>
          )}

          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-muted">
            <Clock size={12} className="text-violet-500" />
            {new Date(webinar.startsAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 dark:border-white/10">
          {renderCta()}
          {renderSubtext()}
        </div>
      </div>
    )
  }

  // ─── FULL PREMIUM CARD ───────────────────────────────────────────────────────
  // Speaker image panel width adapts to speaker count
  const imagePanelClass = allSpeakers.length >= 2
    ? 'lg:w-[560px] xl:w-[640px]'
    : 'lg:w-72 xl:w-80'

  return (
    <div className="rounded-[28px] border border-violet-100 dark:border-white/10 bg-white dark:bg-brand-dark-card overflow-hidden shadow-sm">
      <div className="flex flex-col lg:flex-row">

        {/* LEFT: Speaker image panel — renders ALL speakers, NEVER duplicated in center */}
        <div className={`relative min-h-72 lg:min-h-0 shrink-0 overflow-hidden ${imagePanelClass}`}>
          <SpeakerImagePanel speakers={allSpeakers} title={webinar.title} />
        </div>

        {/* CENTER: Main content — speaker INFO only (no images) */}
        <div className="p-6 sm:p-8 flex-1 min-w-0">
          {/* Status badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider border transition-all ${statusBadge.cls}`}>
              {timing.isWebinarLive && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                </span>
              )}
              {statusBadge.text}
            </div>
            {isApproved && (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={13} /> Registered & Approved
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                <Clock size={13} /> Payment Under Review
              </span>
            )}
            <span className="ml-auto text-xs font-bold text-brand-muted">
              {isFree ? 'Free Access' : isEnrolledPass ? `Free (Enrolled Pass) · ₹${webinar.price}` : `₹${webinar.price}`}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-2xl sm:text-3xl font-black text-brand-text dark:text-white mb-1 leading-tight">
            {webinar.title}
          </h3>

          {/* Speaker name line(s) — text only, no image */}
          {allSpeakers.length > 0 && (
            <p className="text-sm font-bold text-violet-600 dark:text-violet-400 mb-5">
              {allSpeakers.length === 1
                ? `Session Speaker: ${allSpeakers[0].name}`
                : `Speakers: ${allSpeakers.map(s => s.name).join(' · ')}`}
            </p>
          )}

          {/* Speaker information — ALL speakers, info only (images are left panel only) */}
          {allSpeakers.length === 1 && (
            <div className="mb-5">
              <SpeakerInfoBlock speaker={allSpeakers[0]} />
            </div>
          )}

          {allSpeakers.length >= 2 && (
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-4">Session Speakers</p>
              <div className={`grid gap-6 ${allSpeakers.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                {allSpeakers.map((sp, i) => (
                  <div key={i} className="border border-gray-100 dark:border-white/10 rounded-2xl p-4 bg-gray-50/50 dark:bg-black/10">
                    <SpeakerInfoBlock speaker={sp} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback description when no speakers at all */}
          {allSpeakers.length === 0 && webinar.description && (
            <div className="text-sm leading-relaxed text-brand-muted dark:text-brand-dark-muted mb-5">
              <p>{webinar.description}</p>
            </div>
          )}

          {/* Topic tags */}
          {webinar.tags && webinar.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {webinar.tags.map(tag => (
                <span key={tag} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-brand-text dark:text-brand-dark-text">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Session Highlights + CTA */}
        <div className="bg-gray-50 dark:bg-black/20 p-6 sm:p-8 lg:w-64 xl:w-72 shrink-0 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-white/10">
          {/* Highlights */}
          {webinar.highlights && webinar.highlights.length > 0 ? (
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-4">
                <Radio size={11} className="inline mr-1" />Session Highlights
              </h4>
              <ul className="space-y-4">
                {webinar.highlights.map((h, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 p-2 text-violet-600 dark:text-violet-400 shrink-0">
                      <HighlightIcon icon={h.icon} size={14} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-brand-text dark:text-white leading-snug">{h.title}</div>
                      <div className="text-xs text-brand-muted dark:text-brand-dark-muted mt-0.5">{h.subtitle}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mb-6" />
          )}

          {/* Date / Time info */}
          <div className="space-y-2 mb-5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-brand-muted">
              <CalendarDays size={13} className="text-violet-500 shrink-0" />
              {new Date(webinar.startsAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
            {webinar.endsAt && (
              <div className="flex items-center gap-2 font-semibold text-brand-muted">
                <Clock size={13} className="text-violet-500 shrink-0" />
                Ends: {new Date(webinar.endsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </div>
            )}
          </div>

          {/* CTA */}
          {renderCta()}
          {renderSubtext()}
        </div>

      </div>
    </div>
  )
}

export default WebinarCard
