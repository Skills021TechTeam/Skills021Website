import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Star, Globe, Award, Briefcase, Phone,
  MessageCircle, Mail, MapPin, Users, CheckCircle, Send,
  ChevronRight, Clock, Shield, Sparkles,
} from 'lucide-react'
import { useCounselingStore } from '../store/counselingStore'
import { useCounselingRequestStore, CounselingTypeOption } from '../store/counselingRequestStore'
import toast from 'react-hot-toast'

// ─── Category meta ────────────────────────────────────────────────────────────
const CATEGORIES = ['Engineering', 'Medical', 'Career', 'Abroad Study'] as const
type Cat = typeof CATEGORIES[number]

const CAT_META: Record<Cat, {
  icon: typeof GraduationCap; color: string; bg: string; grad: string
  desc: string; bullets: string[]
}> = {
  Engineering: {
    icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20',
    grad: 'from-blue-500 to-indigo-600',
    desc: 'Complete guidance for JEE, JOSAA, CSAB and all state counseling processes.',
    bullets: ['JoSAA Counseling', 'CSAB Counseling', 'AKTU Counseling', 'IPU Counseling', 'JAC Delhi', 'LPU / VIT / SRM / BITS'],
  },
  Medical: {
    icon: Award, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20',
    grad: 'from-green-500 to-teal-600',
    desc: 'Expert support for NEET UG counseling, AIQ, state quota, and medical college selection.',
    bullets: ['NEET UG Counseling', 'AIQ Counseling', 'State Quota Guidance', 'Deemed Universities', 'Private Medical Colleges', 'BDS Admissions'],
  },
  Career: {
    icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20',
    grad: 'from-purple-500 to-pink-600',
    desc: 'Personalized career planning, stream selection, and skill-based guidance for students.',
    bullets: ['Stream Selection (11th)', 'Career Roadmap', 'Skill Assessment', 'Aptitude Analysis', 'Goal Setting', 'Study Abroad Planning'],
  },
  'Abroad Study': {
    icon: Globe, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20',
    grad: 'from-orange-500 to-red-500',
    desc: 'Complete support for international university applications, SOP, visa, and scholarships.',
    bullets: ['USA / Canada Admissions', 'UK / Australia Admissions', 'SOP & LOR Writing', 'Scholarship Guidance', 'Visa Process', 'Pre-Departure Orientation'],
  },
}

const COUNSELING_TYPES: CounselingTypeOption[] = [
  'JoSAA Counseling', 'CSAB Counseling', 'JAC Delhi Counseling', 'AKTU Counseling',
  'IPU Counseling', 'LPU Counseling', 'VIT Counseling', 'SRM Counseling',
  'BITS Counseling', 'COMEDK Counseling', 'KCET Counseling', 'MHT CET Counseling',
  'WBJEE Counseling', 'NEET Counseling', 'Medical Counseling', 'Study Abroad Counseling',
]

const STATES_LIST = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Ladakh',
]

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all'

const INIT_FORM = {
  fullName: '', mobile: '', whatsapp: '', email: '', city: '', state: '',
  examName: '', rank: '', category: '', stateQuota: '', homeState: '',
  preferredBranch: '', preferredCollege: '',
  counselingType: '' as CounselingTypeOption | '',
  additionalQuery: '', consent: false,
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16 px-6"
    >
      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
        <CheckCircle size={36} className="text-white" />
      </div>
      <h3 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text mb-3">
        Application Submitted!
      </h3>
      <p className="text-brand-muted dark:text-brand-dark-muted max-w-md mx-auto mb-2 leading-relaxed">
        Your counseling request has been submitted successfully. Our counseling team will contact you shortly via{' '}
        <span className="font-semibold text-green-500">call, WhatsApp, or email</span>.
      </p>
      <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-8">
        Expected response time: <span className="font-semibold text-green-500">Within 24 hours</span>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
        {[
          { icon: Phone, label: 'Phone Call', color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
          { icon: MessageCircle, label: 'WhatsApp', color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20' },
          { icon: Mail, label: 'Email', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Counseling() {
  const { counselors } = useCounselingStore()
  const { addRequest } = useCounselingRequestStore()
  const [activeCategory, setActiveCategory] = useState<Cat>('Engineering')
  const [form, setForm] = useState(INIT_FORM)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const meta = CAT_META[activeCategory]
  const activeCounselors = counselors.filter((c) => c.status === 'Active')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.mobile || !form.email) {
      toast.error('Please fill all required fields')
      return
    }
    if (!form.counselingType) {
      toast.error('Please select a counseling type')
      return
    }
    if (!form.consent) {
      toast.error('Please provide consent to be contacted')
      return
    }
    setLoading(true)
    setTimeout(() => {
      addRequest({
        fullName: form.fullName,
        mobile: form.mobile,
        whatsapp: form.whatsapp,
        email: form.email,
        city: form.city,
        state: form.state,
        examName: form.examName,
        rank: form.rank,
        category: form.category,
        stateQuota: form.stateQuota,
        homeState: form.homeState,
        preferredBranch: form.preferredBranch,
        preferredCollege: form.preferredCollege,
        counselingType: form.counselingType as CounselingTypeOption,
        additionalQuery: form.additionalQuery,
      })
      setLoading(false)
      setSubmitted(true)
      toast.success('Counseling application submitted!')
    }, 800)
  }

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">

      {/* ── Hero ── */}
      <div className={`relative bg-gradient-to-br ${meta.grad} py-14 px-4 overflow-hidden transition-all duration-500`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white/90 bg-white/20 border border-white/30 rounded-full mb-4 uppercase tracking-widest">
              <Sparkles size={12} /> Expert Admission Counseling
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Expert Counseling for{' '}
              <span className="underline decoration-white/50 underline-offset-4">Your Dream College</span>
            </h1>
            <p className="text-white/80 max-w-xl mx-auto mb-7 text-lg">
              Submit your request for free. Our experts will review your profile and contact you to guide you through admissions and college selection.
            </p>
            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { icon: Shield, label: 'Free to Apply' },
                { icon: Clock, label: 'Response in 24hrs' },
                { icon: Users, label: 'Expert Counselors' },
                { icon: Phone, label: 'Direct Callback' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/20 border border-white/30 text-white rounded-full">
                  <Icon size={11} /> {label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Category Tabs ── */}
      <div className="sticky top-16 z-30 bg-white dark:bg-[#0F0F1A] border-b border-brand-border dark:border-brand-dark-border">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
            {CATEGORIES.map((cat) => {
              const m = CAT_META[cat]
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? `${m.bg} ${m.color}`
                      : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  <m.icon size={14} /> {cat}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Category Info ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-8 card p-5"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.grad} flex items-center justify-center flex-shrink-0`}>
                <meta.icon size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-1">{activeCategory} Counseling</h2>
                <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-3">{meta.desc}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {meta.bullets.map((b) => (
                    <div key={b} className="flex items-center gap-1.5 text-xs text-brand-muted dark:text-brand-dark-muted">
                      <CheckCircle size={11} className="text-green-500 flex-shrink-0" /> {b}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── How It Works ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { step: '01', title: 'Submit Application', desc: 'Fill the application form with your academic details. Submitting is completely free.', grad: 'from-blue-500 to-indigo-500' },
            { step: '02', title: 'Review & Assignment', desc: 'Our team reviews your profile and assigns a specialist counselor.', grad: 'from-teal-500 to-green-500' },
            { step: '03', title: 'Counselor Contacts You', desc: 'Your counselor will call or WhatsApp you within 24 hours.', grad: 'from-purple-500 to-pink-500' },
          ].map(({ step, title, desc, grad }) => (
            <div key={step} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-white/3 rounded-2xl border border-brand-border dark:border-brand-dark-border">
              <div className={`w-8 h-8 bg-gradient-to-br ${grad} rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                {step}
              </div>
              <div>
                <h3 className="font-bold text-brand-text dark:text-brand-dark-text text-sm mb-0.5">{title}</h3>
                <p className="text-xs text-brand-muted dark:text-brand-dark-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Our Counselors ── */}
        {activeCounselors.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-4">Meet Our Counselors</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeCounselors.map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="card p-4 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white text-lg font-bold mx-auto mb-2">
                    {c.name[0]}
                  </div>
                  <h4 className="font-bold text-brand-text dark:text-brand-dark-text text-sm leading-snug">{c.name}</h4>
                  <p className="text-xs text-primary-500 mb-1 font-medium">{c.designation}</p>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-2">{c.experience} exp</p>
                  <div className="flex items-center justify-center gap-1 text-xs text-amber-500 font-semibold">
                    <Star size={10} className="fill-amber-400" /> {c.rating} ({c.reviews})
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── Counseling Application Form ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card overflow-hidden"
          id="apply-form"
        >
          {/* Form header */}
          <div className={`bg-gradient-to-r ${meta.grad} p-6 transition-all duration-500`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Send size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Apply for Counseling</h2>
                <p className="text-white/80 text-sm">Get expert guidance for admissions, counseling, and college selection.</p>
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
                className="p-6 space-y-8"
              >
                {/* Personal Details */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">1</div>
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

                {/* Academic Details */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-teal-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">2</div>
                    <h3 className="font-bold text-brand-text dark:text-brand-dark-text">Academic Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Exam Name', key: 'examName', placeholder: 'e.g. JEE Main, NEET UG, CUET' },
                      { label: 'Rank', key: 'rank', placeholder: 'e.g. 12500 or AIR 5000' },
                      { label: 'Category', key: 'category', placeholder: 'e.g. General, OBC, SC, ST' },
                      { label: 'State Quota', key: 'stateQuota', placeholder: 'Yes / No / Both' },
                      { label: 'Home State', key: 'homeState', placeholder: 'Your home state' },
                      { label: 'Preferred Branch', key: 'preferredBranch', placeholder: 'e.g. Computer Science, MBBS' },
                      { label: 'Preferred College', key: 'preferredCollege', placeholder: 'e.g. NIT Trichy, AIIMS Delhi' },
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

                {/* Counseling Type */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">3</div>
                    <h3 className="font-bold text-brand-text dark:text-brand-dark-text">Counseling Type *</h3>
                  </div>
                  <select
                    value={form.counselingType}
                    onChange={(e) => setForm((p) => ({ ...p, counselingType: e.target.value as CounselingTypeOption }))}
                    className={inputCls}
                    required
                  >
                    <option value="">— Select Counseling Type —</option>
                    {COUNSELING_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>

                {/* Additional Query */}
                <div>
                  <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">Additional Query</label>
                  <textarea
                    value={form.additionalQuery}
                    onChange={(e) => setForm((p) => ({ ...p, additionalQuery: e.target.value }))}
                    rows={4}
                    placeholder="Tell us what help you need regarding counseling or admissions. The more detail you provide, the better we can guide you."
                    className={inputCls + ' resize-none'}
                  />
                </div>

                {/* Consent */}
                <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800/30">
                  <input
                    id="consent-counseling"
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => setForm((p) => ({ ...p, consent: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-green-500 flex-shrink-0 cursor-pointer"
                  />
                  <label htmlFor="consent-counseling" className="text-sm text-brand-muted dark:text-brand-dark-muted cursor-pointer leading-relaxed">
                    I agree to be contacted by <span className="font-semibold text-green-600">Skill021</span> regarding admission counseling. Submitting this form is free.
                  </label>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 bg-gradient-to-r ${meta.grad} text-white rounded-xl font-bold text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg disabled:opacity-70`}
                >
                  {loading ? (
                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Submitting...</>
                  ) : (
                    <><Send size={18} /> Submit Application — Free to Apply <ChevronRight size={16} /></>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
