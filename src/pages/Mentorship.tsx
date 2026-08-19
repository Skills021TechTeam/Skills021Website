import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Star, Clock, Briefcase, CheckCircle, Calendar, HeartHandshake,
  FileText, Link2, Video, Target, Lightbulb, BookOpen,
  ArrowRight, Phone, MessageCircle, Mail, MapPin, GraduationCap,
  Send, ChevronRight, Shield, Zap, Check, Search, X, ExternalLink,
  ChevronDown, IndianRupee, Info, Sparkles,
} from 'lucide-react'
import { fetchActiveMentors, createGuidanceRequest, type Mentor } from '../lib/mentorService'
import toast from 'react-hot-toast'
import PanelSpotlightCard from '../components/PanelSpotlightCard'

// Guidance type definition
type GuidanceType = 'Career Guidance' | 'College Selection' | 'Branch Selection' | 'Placement Preparation' | 'Internship Guidance' | 'Higher Studies Guidance' | 'Resume Review' | 'LinkedIn Profile Review' | 'Mock Interview' | 'Skill Roadmap' | 'Startup Guidance' | 'Study Planning'

// ─── Guidance type options ────────────────────────────────────────────────────
const GUIDANCE_TYPES: { label: GuidanceType; icon: typeof Users; color: string }[] = [
  { label: 'Career Guidance', icon: Briefcase, color: 'text-gray-700 dark:text-gray-300' },
  { label: 'College Selection', icon: GraduationCap, color: 'text-gray-700 dark:text-gray-300' },
  { label: 'Branch Selection', icon: Target, color: 'text-gray-700 dark:text-gray-300' },
  { label: 'Placement Preparation', icon: CheckCircle, color: 'text-gray-700 dark:text-gray-300' },
  { label: 'Internship Guidance', icon: Lightbulb, color: 'text-gray-700 dark:text-gray-300' },
  { label: 'Higher Studies Guidance', icon: BookOpen, color: 'text-gray-700 dark:text-gray-300' },
  { label: 'Resume Review', icon: FileText, color: 'text-gray-700 dark:text-gray-300' },
  { label: 'LinkedIn Profile Review', icon: Link2, color: 'text-gray-700 dark:text-gray-300' },
  { label: 'Mock Interview', icon: Video, color: 'text-gray-700 dark:text-gray-300' },
  { label: 'Skill Roadmap', icon: ArrowRight, color: 'text-gray-700 dark:text-gray-300' },
  { label: 'Startup Guidance', icon: Zap, color: 'text-gray-700 dark:text-gray-300' },
  { label: 'Study Planning', icon: Calendar, color: 'text-gray-700 dark:text-gray-300' },
]

const STATES_LIST = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
]

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all'

const INIT_FORM = {
  fullName: '', mobile: '', whatsapp: '', email: '',
  city: '', state: '',
  classYear: '', schoolCollege: '', boardUniversity: '', stream: '', percentage: '',
  guidanceTypes: [] as GuidanceType[],
  preferredMentors: [] as string[],
  additionalQuery: '',
  consent: false,
}

const FAQS = [
  { q: 'Is this mentorship service really free?', a: 'Yes, completely free. Skill021 does not charge students anything for guidance requests or mentor sessions arranged through this page.' },
  { q: 'How do I get matched with a mentor?', a: 'Submit the guidance request form below. You can optionally select one or more preferred mentors, or leave it to our team to assign the best-fit mentor based on your goals.' },
  { q: 'How soon will someone contact me?', a: "Our team typically reviews and responds within 24 hours via call, WhatsApp, or email — whichever you're comfortable with." },
  { q: 'Can I request more than one type of guidance?', a: 'Absolutely. You can select multiple guidance types in the form, such as Resume Review and Mock Interview together.' },
  { q: 'What if I don\u2019t see a mentor who matches my field?', a: "That's okay — leave the mentor selection blank and describe your needs in the Additional Query field. We'll assign the most relevant mentor available." },
  { q: 'Do I need any prior experience to request mentorship?', a: 'No. Students at any stage — school, college, or early career — can request guidance.' },
]

// ─── FAQ Section ────────────────────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="bg-gray-50 dark:bg-brand-dark-card border-t border-gray-100 dark:border-brand-dark-border py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-1 text-center">Frequently Asked Questions</h2>
        <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-6 text-center">Everything you need to know before requesting guidance.</p>
        <div className="space-y-2">
          {FAQS.map((item, idx) => {
            const isOpen = open === idx
            return (
              <div key={item.q} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-brand-text dark:text-brand-dark-text">{item.q}</span>
                  <ChevronDown size={16} className={`flex-shrink-0 text-brand-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-sm text-brand-muted dark:text-brand-dark-muted leading-relaxed">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Mentor Profile Modal ────────────────────────────────────────────────────────
function MentorProfileModal({ mentor, selected, onToggle, onClose }: { mentor: Mentor; selected: boolean; onToggle: () => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-brand-dark-card rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl"
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-brand-dark-border">
          <div className="flex items-center gap-4">
            {mentor.photo ? (
              <img src={mentor.photo} alt={mentor.name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-2xl font-bold flex-shrink-0">
                {mentor.name[0]}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{mentor.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">{mentor.designation} · {mentor.company}</p>
              <div className="flex items-center gap-3 text-xs text-brand-muted dark:text-brand-dark-muted mt-1.5">
                <span className="flex items-center gap-1"><Star size={11} className="text-black dark:text-white fill-black dark:fill-white" />{mentor.rating} ({mentor.reviews} reviews)</span>
                <span className="flex items-center gap-1"><Clock size={11} />{mentor.experience}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-brand-muted flex-shrink-0"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-brand-muted dark:text-brand-dark-muted mb-1.5">About</h4>
            <p className="text-sm text-brand-text dark:text-brand-dark-text leading-relaxed">{mentor.bio}</p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-brand-muted dark:text-brand-dark-muted mb-2">Expertise</h4>
            <div className="flex flex-wrap gap-1.5">
              {mentor.expertise.map((e) => (
                <span key={e} className="text-[11px] px-2.5 py-1 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-full font-medium">{e}</span>
              ))}
              {mentor.expertise.length === 0 && <p className="text-sm text-brand-muted">No expertise tags added.</p>}
            </div>
          </div>

          {mentor.services.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-brand-muted dark:text-brand-dark-muted mb-2">Services & Fees</h4>
              <div className="space-y-1.5">
                {mentor.services.map((s) => (
                  <div key={s} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5">
                    <span className="text-brand-text dark:text-brand-dark-text">{s}</span>
                    <span className="flex items-center gap-0.5 font-semibold text-brand-text dark:text-brand-dark-text">
                      {mentor.fees?.[s] ? <><IndianRupee size={12} />{mentor.fees[s]}</> : 'Free'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mentor.linkedIn && (
            <a
              href={mentor.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-text dark:text-brand-dark-text hover:underline"
            >
              <ExternalLink size={15} /> View LinkedIn Profile
            </a>
          )}
        </div>

        <div className="p-6 pt-0">
          <button
            type="button"
            onClick={() => { onToggle(); onClose() }}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              selected
                ? 'border border-brand-border dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5'
                : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90'
            }`}
          >
            {selected ? <><X size={16} /> Remove from Request</> : <><Check size={16} /> Select for Guidance Request</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16 px-6"
    >
      <div className="w-20 h-20 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-black/20 dark:shadow-white/20">
        <CheckCircle size={36} className="text-white dark:text-black" />
      </div>
      <h3 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text mb-3">
        Request Submitted Successfully!
      </h3>
      <p className="text-brand-muted dark:text-brand-dark-muted max-w-md mx-auto mb-2 leading-relaxed">
        Thank you for contacting Skill021. Our team will review your request and contact you soon via{' '}
        <span className="font-semibold text-black dark:text-white">call, WhatsApp, or email</span>.
      </p>
      <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-8">
        Expected response time: <span className="font-semibold text-black dark:text-white">Within 24 hours</span>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
        {[
          { icon: Phone, label: 'Phone Call', color: 'text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-white/10' },
          { icon: MessageCircle, label: 'WhatsApp', color: 'text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-white/10' },
          { icon: Mail, label: 'Email', color: 'text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-white/10' },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${color}`}>
            <Icon size={15} /> {label}
          </div>
        ))}
      </div>
      <button
        onClick={onReset}
        className="px-6 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        Submit Another Request
      </button>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Mentorship() {
  const [activeMentors, setActiveMentors] = useState<Mentor[]>([])
  const [mentorsLoading, setMentorsLoading] = useState(true)
  const [form, setForm] = useState(INIT_FORM)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mentorSearch, setMentorSearch] = useState('')
  const [expertiseFilter, setExpertiseFilter] = useState<string | null>(null)
  const [viewMentor, setViewMentor] = useState<Mentor | null>(null)

  useEffect(() => {
    (async () => {
      setMentorsLoading(true)
      try {
        setActiveMentors(await fetchActiveMentors())
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load mentors')
      } finally {
        setMentorsLoading(false)
      }
    })()
  }, [])

  const allExpertise = Array.from(new Set(activeMentors.flatMap((m) => m.expertise))).sort()

  const filteredMentors = activeMentors.filter((m) => {
    const q = mentorSearch.trim().toLowerCase()
    const matchesSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.company.toLowerCase().includes(q) ||
      m.designation.toLowerCase().includes(q) ||
      m.expertise.some((e) => e.toLowerCase().includes(q))
    const matchesExpertise = !expertiseFilter || m.expertise.includes(expertiseFilter)
    return matchesSearch && matchesExpertise
  })

  const toggleGuidanceType = (type: GuidanceType) => {
    setForm((p) => ({
      ...p,
      guidanceTypes: p.guidanceTypes.includes(type)
        ? p.guidanceTypes.filter((t) => t !== type)
        : [...p.guidanceTypes, type],
    }))
  }

  const toggleMentor = (id: string) => {
    setForm((p) => ({
      ...p,
      preferredMentors: p.preferredMentors.includes(id)
        ? p.preferredMentors.filter((m) => m !== id)
        : [...p.preferredMentors, id],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.mobile || !form.email) {
      toast.error('Please fill all required fields')
      return
    }
    if (form.guidanceTypes.length === 0) {
      toast.error('Please select at least one type of guidance')
      return
    }
    if (!form.consent) {
      toast.error('Please provide consent to be contacted')
      return
    }
    setLoading(true)
    try {
      await createGuidanceRequest({
        fullName: form.fullName,
        mobile: form.mobile,
        whatsapp: form.whatsapp,
        email: form.email,
        city: form.city,
        state: form.state,
        classYear: form.classYear,
        schoolCollege: form.schoolCollege,
        boardUniversity: form.boardUniversity,
        stream: form.stream,
        percentage: form.percentage,
        guidanceTypes: form.guidanceTypes,
        preferredMentors: form.preferredMentors,
        additionalQuery: form.additionalQuery,
      })
      setSubmitted(true)
      toast.success('Guidance request submitted!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-brand-dark-bg pt-16">

      {/* ── Hero — shared split layout ── */}
      <div className="bg-gradient-to-b from-gray-50/80 to-white dark:from-brand-dark-card/50 dark:to-brand-dark-bg border-b border-gray-100 dark:border-brand-dark-border py-10 px-4 sm:py-14">
        <div className="max-w-7xl mx-auto flex flex-col items-center lg:flex-row lg:gap-12">
          <motion.div className="flex-1 w-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4 uppercase tracking-widest">
              <Sparkles size={12} /> 1-on-1 Guidance
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-brand-text dark:text-brand-dark-text mb-5 tracking-tight">
              Get Personalized Guidance from <span className="gradient-text">Industry Experts</span>
            </h1>
            <p className="text-brand-muted dark:text-brand-dark-muted text-base md:text-lg max-w-xl leading-relaxed mb-6">
              Submit a free guidance request and our expert mentors will connect with you via call, WhatsApp, or email to accelerate your career.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-brand-muted dark:text-brand-dark-muted mb-6">
              <span className="flex items-center gap-2"><Shield size={14} />100% Free Sessions</span>
              <span className="flex items-center gap-2"><Clock size={14} />Response in 24hrs</span>
              {activeMentors.length > 0 && (
                <span className="flex items-center gap-2"><Users size={14} />{activeMentors.length}+ Active Mentors</span>
              )}
            </div>
            {activeMentors.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl">
                {[
                  { val: `${activeMentors.length}+`, label: 'Expert Mentors' },
                  { val: `${activeMentors.reduce((a, m) => a + m.sessions, 0).toLocaleString()}+`, label: 'Sessions Done' },
                  { val: (activeMentors.reduce((a, m) => a + m.rating, 0) / activeMentors.length).toFixed(1), label: 'Avg Rating' },
                  { val: '100%', label: 'Free Forever' },
                ].map((s) => (
                  <div key={s.label} className="bg-white dark:bg-brand-dark-bg rounded-xl p-3 text-center border border-gray-100 dark:border-brand-dark-border">
                    <div className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{s.val}</div>
                    <div className="text-[11px] text-brand-muted dark:text-brand-dark-muted mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
          <aside className="hidden lg:block w-full max-w-md xl:max-w-lg flex-shrink-0 mt-8 lg:mt-0">
            <PanelSpotlightCard
              variant="mentor"
              stat={{ value: `${activeMentors.length > 0 ? activeMentors.length : 15}+`, label: 'Expert Mentors' }}
              secondaryStat={{ value: `${activeMentors.length > 0 ? activeMentors.reduce((a, m) => a + m.sessions, 0) : 1200}+`, label: 'Sessions Done' }}
            />
          </aside>
        </div>
      </div>

      {/* ── How It Works ── */}
      <div className="bg-white dark:bg-brand-dark-bg border-b border-gray-100 dark:border-brand-dark-border py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-brand-muted dark:text-brand-dark-muted mb-6">How It Works</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: Send, title: 'Submit Your Request', desc: 'Fill the free guidance form with your details and what type of help you need.' },
              { step: '02', icon: Users, title: 'We Review & Assign', desc: 'Our team reviews your request and assigns the best-fit mentor within 24 hours.' },
              { step: '03', icon: Phone, title: 'Mentor Contacts You', desc: 'Your mentor will call, WhatsApp, or email you to schedule a guidance session.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="w-10 h-10 bg-[#0A0A0A] dark:bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <Icon size={18} className="text-white dark:text-black" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wider mb-0.5">Step {step}</p>
                  <h3 className="font-bold text-brand-text dark:text-brand-dark-text text-sm mb-1">{title}</h3>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Our Mentors — click to select one or more for your request ── */}
        {activeMentors.length > 0 && (
          <div className="mb-8 flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-1">Meet Our Mentors</h2>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-5">Industry experts from top companies. Select one or more mentors you'd like guidance from — it's optional.</p>

            {/* Search + expertise filter */}
            <div className="mb-5 space-y-3">
              <div className="relative max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  value={mentorSearch}
                  onChange={(e) => setMentorSearch(e.target.value)}
                  placeholder="Search mentors by name, company, or skill..."
                  className={inputCls + ' pl-10 py-2.5'}
                />
                {mentorSearch && (
                  <button
                    type="button"
                    onClick={() => setMentorSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text dark:hover:text-brand-dark-text"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {allExpertise.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExpertiseFilter(null)}
                    className={`dynamic-chip text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                      !expertiseFilter
                        ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                        : 'border-brand-border dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted hover:border-black/50 dark:hover:border-white/50'
                    }`}
                  >
                    All
                  </button>
                  {allExpertise.map((exp) => (
                    <button
                      type="button"
                      key={exp}
                      onClick={() => setExpertiseFilter(expertiseFilter === exp ? null : exp)}
                      className={`dynamic-chip text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                        expertiseFilter === exp
                          ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                          : 'border-brand-border dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted hover:border-black/50 dark:hover:border-white/50'
                      }`}
                    >
                      {exp}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {mentorsLoading ? (
              <div className="card p-8 text-center text-sm text-brand-muted dark:text-brand-dark-muted">
                Loading mentors...
              </div>
            ) : filteredMentors.length === 0 ? (
              <div className="card p-8 text-center text-sm text-brand-muted dark:text-brand-dark-muted">
                No mentors match your search. Try a different name or skill.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredMentors.map((mentor, idx) => {
                  const selected = form.preferredMentors.includes(mentor.id)
                  return (
                    <motion.div
                      key={mentor.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      onClick={() => toggleMentor(mentor.id)}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`)
                        e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`)
                      }}
                      role="button"
                      tabIndex={0}
                      className={`mentor-card fx-mentor p-5 text-left relative transition-all duration-300 cursor-pointer border ${
                        selected ? 'border-violet-500 ring-2 ring-violet-400/40' : 'border-brand-border dark:border-brand-dark-border hover:border-violet-400/60'
                      }`}
                    >
                      <div className="fx-mentor-content">
                      {selected && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-black dark:bg-white rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white dark:text-black" />
                        </div>
                      )}
                      {!selected && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setViewMentor(mentor) }}
                          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white dark:bg-brand-dark-bg border border-brand-border dark:border-brand-dark-border flex items-center justify-center text-brand-muted hover:text-brand-text dark:hover:text-brand-dark-text"
                          title="View full profile"
                        >
                          <Info size={12} />
                        </button>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        {mentor.photo ? (
                          <div className="mentor-avatar-ring rounded-2xl flex-shrink-0">
                            <img src={mentor.photo} alt={mentor.name} className="w-12 h-12 rounded-[14px] object-cover" />
                          </div>
                        ) : (
                          <div className="mentor-avatar-ring rounded-2xl flex-shrink-0">
                            <div className="w-12 h-12 rounded-[14px] bg-white dark:bg-brand-dark-bg flex items-center justify-center text-violet-700 dark:text-violet-300 text-lg font-bold">
                              {mentor.name[0]}
                            </div>
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-bold text-brand-text dark:text-brand-dark-text text-sm truncate">{mentor.name}</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">{mentor.company}</p>
                        </div>
                      </div>
                      <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-3 line-clamp-2 leading-relaxed">{mentor.bio}</p>
                      <div className="flex items-center gap-3 text-xs text-brand-muted dark:text-brand-dark-muted mb-3">
                        <span className="flex items-center gap-1"><Star size={10} className="text-black dark:text-white fill-black dark:fill-white" />{mentor.rating}</span>
                        <span className="flex items-center gap-1"><Clock size={10} />{mentor.experience}</span>
                        <span className="flex items-center gap-1"><Calendar size={10} />{mentor.sessions} sessions</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {mentor.expertise.slice(0, 3).map((e) => (
                          <span key={e} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-full font-medium">{e}</span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewMentor(mentor) }}
                        className="text-[11px] font-semibold text-brand-text dark:text-brand-dark-text underline underline-offset-2 hover:opacity-70"
                      >
                        View full profile
                      </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
            </div>
          </div>
        )}

        <AnimatePresence>
          {viewMentor && (
            <MentorProfileModal
              mentor={viewMentor}
              selected={form.preferredMentors.includes(viewMentor.id)}
              onToggle={() => toggleMentor(viewMentor.id)}
              onClose={() => setViewMentor(null)}
            />
          )}
        </AnimatePresence>

        {/* ── Guidance Request Form ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mentorship-form-card card overflow-hidden"
          id="request-form"
        >
          {/* Form header */}
          <div className="mentorship-form-header p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-white dark:border-black rounded-xl flex items-center justify-center">
                <Send size={18} className="text-white dark:text-black" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white dark:text-black">Request Personalized Guidance</h2>
                <p className="text-white/80 dark:text-black/70 text-sm">Tell us about yourself and our mentors will connect with you.</p>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {submitted ? (
              <SuccessScreen key="success" onReset={() => { setSubmitted(false); setForm(INIT_FORM) }} />
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mentorship-form-body p-6 sm:p-7 space-y-8"
              >
                {/* Section: Personal Details */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="form-step-badge w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md">1</div>
                    <h3 className="font-bold text-brand-text dark:text-brand-dark-text">Personal Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Full Name *', key: 'fullName', type: 'text', placeholder: 'Enter your full name', icon: Users },
                      { label: 'Mobile Number *', key: 'mobile', type: 'tel', placeholder: '10-digit mobile number', icon: Phone },
                      { label: 'WhatsApp Number', key: 'whatsapp', type: 'tel', placeholder: 'Same as mobile or different', icon: MessageCircle },
                      { label: 'Email Address *', key: 'email', type: 'email', placeholder: 'your@email.com', icon: Mail },
                      { label: 'City', key: 'city', type: 'text', placeholder: 'Your city', icon: MapPin },
                    ].map(({ label, key, type, placeholder, icon: Icon }) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">{label}</label>
                        <div className="relative">
                          <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                          <input
                            type={type}
                            value={(form as any)[key]}
                            onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className={inputCls + ' pl-9'}
                          />
                        </div>
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">State</label>
                      <select
                        value={form.state}
                        onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                        className={inputCls}
                      >
                        <option value="">Select State</option>
                        {STATES_LIST.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Academic Details */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="form-step-badge w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md">2</div>
                    <h3 className="font-bold text-brand-text dark:text-brand-dark-text">Academic Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Current Class / Year', key: 'classYear', placeholder: 'e.g. Class 12, B.Tech 2nd Year' },
                      { label: 'School / College Name', key: 'schoolCollege', placeholder: 'Name of your institution' },
                      { label: 'Board / University', key: 'boardUniversity', placeholder: 'e.g. CBSE, IP University' },
                      { label: 'Stream', key: 'stream', placeholder: 'e.g. Science PCM, Computer Science' },
                      { label: 'Current Percentage / CGPA', key: 'percentage', placeholder: 'e.g. 85% or 8.5 CGPA' },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">{label}</label>
                        <input
                          type="text"
                          value={(form as any)[key]}
                          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section: Guidance Needed */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="form-step-badge w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md">3</div>
                    <h3 className="font-bold text-brand-text dark:text-brand-dark-text">What Type of Guidance Do You Need?</h3>
                  </div>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-4 ml-8">Select all that apply</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {GUIDANCE_TYPES.map(({ label, icon: Icon, color }) => {
                      const checked = form.guidanceTypes.includes(label)
                      return (
                        <button
                          type="button"
                          key={label}
                          onClick={() => toggleGuidanceType(label)}
                          className={`dynamic-button flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                            checked
                              ? 'border-[#0A0A0A] dark:border-white bg-[#0A0A0A] dark:bg-white text-white dark:text-black'
                              : 'border-brand-border dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted hover:border-[#0A0A0A]/50 dark:hover:border-white/50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${checked ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black' : 'bg-gray-100 dark:bg-white/10 ' + color}`}>
                            {checked ? <CheckCircle size={12} /> : <Icon size={11} />}
                          </div>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Selected Mentors summary */}
                {form.preferredMentors.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 -mt-4">
                    <span className="text-xs text-brand-muted dark:text-brand-dark-muted">Requesting guidance from:</span>
                    {form.preferredMentors.map((id) => {
                      const m = activeMentors.find((am) => am.id === id)
                      if (!m) return null
                      return (
                        <span key={id} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-full">
                          {m.name}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Additional Query */}
                <div>
                  <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">Additional Query</label>
                  <textarea
                    value={form.additionalQuery}
                    onChange={(e) => setForm((p) => ({ ...p, additionalQuery: e.target.value }))}
                    rows={4}
                    placeholder="Describe your situation and what guidance you need. The more detail you provide, the better we can help you."
                    className={inputCls + ' resize-none'}
                  />
                </div>

                {/* Consent */}
                <div className="mentorship-consent flex items-start gap-3 p-4 rounded-2xl border">
                  <input
                    id="consent-guidance"
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => setForm((p) => ({ ...p, consent: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-black dark:accent-white flex-shrink-0 cursor-pointer"
                  />
                  <label htmlFor="consent-guidance" className="text-sm text-brand-muted dark:text-brand-dark-muted cursor-pointer leading-relaxed">
                    I agree to be contacted by <span className="font-semibold text-black dark:text-white">Skill021</span> for guidance and mentorship. I understand this service is completely free.
                  </label>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="mentorship-submit w-full py-4 text-white rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-70"
                >
                  {loading ? (
                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Submitting...</>
                  ) : (
                    <><Send size={18} /> Request Guidance — It's Free! <ChevronRight size={16} /></>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <FAQSection />
    </div>
  )
}
