import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Star, Clock, Briefcase, CheckCircle, Calendar,
  FileText, Link2, Video, Target, Lightbulb, BookOpen,
  ArrowRight, Phone, MessageCircle, Mail, MapPin, GraduationCap,
  Send, ChevronRight, Sparkles, Shield, Zap,
} from 'lucide-react'
import { useMentorStore } from '../store/mentorStore'
import { useGuidanceStore, GuidanceType } from '../store/guidanceStore'
import toast from 'react-hot-toast'

// ─── Guidance type options ────────────────────────────────────────────────────
const GUIDANCE_TYPES: { label: GuidanceType; icon: typeof Users; color: string }[] = [
  { label: 'Career Guidance', icon: Briefcase, color: 'text-blue-500' },
  { label: 'College Selection', icon: GraduationCap, color: 'text-purple-500' },
  { label: 'Branch Selection', icon: Target, color: 'text-teal-500' },
  { label: 'Placement Preparation', icon: CheckCircle, color: 'text-green-500' },
  { label: 'Internship Guidance', icon: Lightbulb, color: 'text-orange-500' },
  { label: 'Higher Studies Guidance', icon: BookOpen, color: 'text-indigo-500' },
  { label: 'Resume Review', icon: FileText, color: 'text-red-500' },
  { label: 'LinkedIn Profile Review', icon: Link2, color: 'text-sky-500' },
  { label: 'Mock Interview', icon: Video, color: 'text-pink-500' },
  { label: 'Skill Roadmap', icon: ArrowRight, color: 'text-amber-500' },
  { label: 'Startup Guidance', icon: Zap, color: 'text-violet-500' },
  { label: 'Study Planning', icon: Calendar, color: 'text-cyan-500' },
]

const STATES_LIST = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
]

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all'

const INIT_FORM = {
  fullName: '', mobile: '', whatsapp: '', email: '',
  city: '', state: '',
  classYear: '', schoolCollege: '', boardUniversity: '', stream: '', percentage: '',
  guidanceTypes: [] as GuidanceType[],
  additionalQuery: '',
  consent: false,
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16 px-6"
    >
      <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/30">
        <CheckCircle size={36} className="text-white" />
      </div>
      <h3 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text mb-3">
        Request Submitted Successfully!
      </h3>
      <p className="text-brand-muted dark:text-brand-dark-muted max-w-md mx-auto mb-2 leading-relaxed">
        Thank you for contacting Skill021. Our team will review your request and contact you soon via{' '}
        <span className="font-semibold text-primary-500">call, WhatsApp, or email</span>.
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Mentorship() {
  const { mentors } = useMentorStore()
  const { addRequest } = useGuidanceStore()
  const [form, setForm] = useState(INIT_FORM)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const activeMentors = mentors.filter((m) => m.status === 'Active')

  const toggleGuidanceType = (type: GuidanceType) => {
    setForm((p) => ({
      ...p,
      guidanceTypes: p.guidanceTypes.includes(type)
        ? p.guidanceTypes.filter((t) => t !== type)
        : [...p.guidanceTypes, type],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
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
    setTimeout(() => {
      addRequest({
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
        additionalQuery: form.additionalQuery,
      })
      setLoading(false)
      setSubmitted(true)
      toast.success('Guidance request submitted!')
    }, 800)
  }

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">

      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-br from-[#0F0F1A] via-[#1A0A2E] to-[#0A1A2E] py-16 px-4 overflow-hidden">
        {/* Background orbs */}
        <div className="orb w-96 h-96 bg-primary-500 top-[-100px] left-[-100px]" />
        <div className="orb w-80 h-80 bg-teal-500 bottom-[-80px] right-[-80px]" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-primary-400 bg-primary-400/10 border border-primary-400/30 rounded-full mb-5 uppercase tracking-widest">
              <Sparkles size={12} /> Free Guidance & Mentorship
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Get Personalized Guidance from{' '}
              <span className="gradient-text">Industry Experts</span>
            </h1>
            <p className="text-slate-400 max-w-xl mx-auto mb-8 text-lg">
              Submit a free guidance request and our expert mentors will contact you via call, WhatsApp, or email to help you achieve your goals.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {[
                { icon: Shield, label: '100% Free', color: 'text-green-400 border-green-400/30 bg-green-400/10' },
                { icon: Clock, label: 'Response in 24hrs', color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
                { icon: Users, label: 'Expert Mentors', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
                { icon: Phone, label: 'Direct Contact', color: 'text-teal-400 border-teal-400/30 bg-teal-400/10' },
              ].map(({ icon: Icon, label, color }) => (
                <span key={label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-full ${color}`}>
                  <Icon size={12} /> {label}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {[
                { val: `${activeMentors.length}+`, label: 'Expert Mentors' },
                { val: `${activeMentors.reduce((a, m) => a + m.sessions, 0).toLocaleString()}+`, label: 'Sessions Done' },
                { val: activeMentors.length ? (activeMentors.reduce((a, m) => a + m.rating, 0) / activeMentors.length).toFixed(1) : '4.9', label: 'Avg Rating' },
                { val: '100%', label: 'Free Forever' },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
                  <div className="text-xl font-bold text-white">{s.val}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── How It Works ── */}
      <div className="bg-white dark:bg-[#0F0F1A] border-b border-brand-border dark:border-brand-dark-border py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-brand-muted dark:text-brand-dark-muted mb-6">How It Works</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: Send, title: 'Submit Your Request', desc: 'Fill the free guidance form with your details and what type of help you need.', color: 'from-primary-500 to-indigo-500' },
              { step: '02', icon: Users, title: 'We Review & Assign', desc: 'Our team reviews your request and assigns the best-fit mentor within 24 hours.', color: 'from-teal-500 to-cyan-500' },
              { step: '03', icon: Phone, title: 'Mentor Contacts You', desc: 'Your mentor will call, WhatsApp, or email you to schedule a guidance session.', color: 'from-purple-500 to-pink-500' },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <div key={step} className="flex gap-4">
                <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <Icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wider mb-0.5">Step {step}</p>
                  <h3 className="font-bold text-brand-text dark:text-brand-dark-text text-sm mb-1">{title}</h3>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* ── Guidance Types Overview ── */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-1">What Guidance Can You Get?</h2>
          <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-5">Our mentors cover a wide range of career and academic needs.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {GUIDANCE_TYPES.map(({ label, icon: Icon, color }) => (
              <div key={label} className="card p-3 flex items-center gap-2.5 hover:border-primary-500/50 transition-colors">
                <div className={`w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon size={15} />
                </div>
                <span className="text-xs font-semibold text-brand-text dark:text-brand-dark-text leading-snug">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Our Mentors ── */}
        {activeMentors.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-1">Meet Our Mentors</h2>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-5">Industry experts from top companies who will guide you.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {activeMentors.map((mentor, idx) => (
                <motion.div
                  key={mentor.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="card p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {mentor.name[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-brand-text dark:text-brand-dark-text text-sm truncate">{mentor.name}</h3>
                      <p className="text-xs text-primary-500 font-semibold">{mentor.company}</p>
                    </div>
                  </div>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-3 line-clamp-2 leading-relaxed">{mentor.bio}</p>
                  <div className="flex items-center gap-3 text-xs text-brand-muted dark:text-brand-dark-muted mb-3">
                    <span className="flex items-center gap-1"><Star size={10} className="text-amber-400 fill-amber-400" />{mentor.rating}</span>
                    <span className="flex items-center gap-1"><Clock size={10} />{mentor.experience}</span>
                    <span className="flex items-center gap-1"><Calendar size={10} />{mentor.sessions} sessions</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {mentor.expertise.slice(0, 3).map((e) => (
                      <span key={e} className="text-[10px] px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full font-medium">{e}</span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── Guidance Request Form ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card overflow-hidden"
          id="request-form"
        >
          {/* Form header */}
          <div className="bg-gradient-to-r from-primary-500 to-teal-500 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Send size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Request Personalized Guidance</h2>
                <p className="text-white/80 text-sm">Tell us about yourself and our mentors will connect with you.</p>
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
                {/* Section: Personal Details */}
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

                {/* Section: Academic Details */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-teal-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">2</div>
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
                    <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">3</div>
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
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                            checked
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                              : 'border-brand-border dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted hover:border-primary-500/50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${checked ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-white/10 ' + color}`}>
                            {checked ? <CheckCircle size={12} /> : <Icon size={11} />}
                          </div>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

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
                <div className="flex items-start gap-3 p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl border border-primary-200 dark:border-primary-800/30">
                  <input
                    id="consent-guidance"
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => setForm((p) => ({ ...p, consent: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-primary-500 flex-shrink-0 cursor-pointer"
                  />
                  <label htmlFor="consent-guidance" className="text-sm text-brand-muted dark:text-brand-dark-muted cursor-pointer leading-relaxed">
                    I agree to be contacted by <span className="font-semibold text-primary-500">Skill021</span> for guidance and mentorship. I understand this service is completely free.
                  </label>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-gradient-to-r from-primary-500 to-teal-500 text-white rounded-xl font-bold text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 disabled:opacity-70"
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
    </div>
  )
}
