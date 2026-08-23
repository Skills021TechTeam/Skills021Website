import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, GraduationCap, User as UserIcon, Mail, Phone, Building2,
  Link2, FileText, Send, CheckCircle, Loader2, Upload, X as XIcon, File as FileIcon,
  LogIn, UserPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { submitCareerApplication, uploadResume, ApplicationType } from '../lib/careerApplicationService'
import PanelSpotlightCard from '../components/PanelSpotlightCard'
import { Sparkles } from 'lucide-react'

const DEPARTMENTS = [
  'Web Development', 'App Development', 'AI & Machine Learning', 'Data Science',
  'Content & Curriculum', 'Design (UI/UX)', 'Video Editing', 'Marketing & Growth',
  'Community & Mentorship', 'Other',
]

const EXPERIENCE_LEVELS_JOB = ['Fresher', '0-1 years', '1-3 years', '3-5 years', '5+ years']
const EXPERIENCE_LEVELS_INTERN = ['Currently Studying', 'Recent Graduate']

const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  role: '',
  department: 'Web Development',
  collegeOrOrganization: '',
  experienceLevel: '',
  portfolioUrl: '',
  resumeUrl: '',
  coverMessage: '',
}

const ACCEPTED_RESUME_TYPES = '.pdf,.doc,.docx'
const MAX_RESUME_SIZE_MB = 5

export default function Apply() {
  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [applicationType, setApplicationType] = useState<ApplicationType>('Internship')
  const [form, setForm] = useState({ ...emptyForm, fullName: user?.name ?? '', email: user?.email ?? '' })
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const experienceOptions = applicationType === 'Job' ? EXPERIENCE_LEVELS_JOB : EXPERIENCE_LEVELS_INTERN

  const setField = (key: keyof typeof emptyForm, value: string) => setForm(p => ({ ...p, [key]: value }))

  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'doc', 'docx'].includes(ext ?? '')) {
      toast.error('Please upload a PDF or Word document')
      return
    }
    if (file.size > MAX_RESUME_SIZE_MB * 1024 * 1024) {
      toast.error(`Resume must be under ${MAX_RESUME_SIZE_MB}MB`)
      return
    }
    setResumeFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error('Please log in to apply')
      navigate('/login')
      return
    }
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.role.trim()) {
      toast.error('Please fill all required fields')
      return
    }
    setSubmitting(true)
    try {
      let resumeUrl = form.resumeUrl
      if (resumeFile) {
        setUploadingResume(true)
        const cleanName = resumeFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
        const userId = user?.id || 'guest'
        const path = `${userId}/${Date.now()}_${cleanName}`
        resumeUrl = await uploadResume(resumeFile, path)
        setUploadingResume(false)
      }
      await submitCareerApplication({
        applicationType,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role.trim(),
        department: form.department,
        collegeOrOrganization: form.collegeOrOrganization.trim(),
        experienceLevel: form.experienceLevel || experienceOptions[0],
        portfolioUrl: form.portfolioUrl.trim(),
        resumeUrl,
        coverMessage: form.coverMessage.trim(),
      })
      setSubmitted(true)
      toast.success('Application submitted! We\'ll get back to you soon.')
    } catch (err) {
      setUploadingResume(false)
      toast.error(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSubmitted(false)
    setResumeFile(null)
    setForm({ ...emptyForm, fullName: user?.name ?? '', email: user?.email ?? '' })
  }

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">
      {/* Hero — shared split layout */}
      <div className="bg-gradient-to-b from-gray-50/80 to-white dark:from-brand-dark-card/50 dark:to-brand-dark-bg border-b border-gray-100 dark:border-brand-dark-border py-10 px-4 sm:py-14">
        <div className="max-w-7xl mx-auto flex flex-col items-center lg:flex-row lg:gap-12">
          <motion.div className="flex-1 w-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4 uppercase tracking-widest">
              <Sparkles size={12} /> Join Skills021 Team
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-brand-text dark:text-brand-dark-text mb-5 tracking-tight">
              Work & <span className="gradient-text">Build With Us</span>
            </h1>
            <p className="text-brand-muted dark:text-brand-dark-muted text-base md:text-lg max-w-xl leading-relaxed mb-6">
              Apply for full-time jobs, teaching roles, and internships at Skills021. Work remotely with a mission-driven team empowering engineering students across the country.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-brand-muted dark:text-brand-dark-muted">
              <span className="flex items-center gap-2"><Briefcase size={14} />10+ Open Departments</span>
              <span className="flex items-center gap-2"><GraduationCap size={14} />Internships & Full-Time</span>
              <span className="flex items-center gap-2"><CheckCircle size={14} />Fast-Track Review (48h)</span>
            </div>
          </motion.div>
          <aside className="hidden lg:block w-full max-w-md xl:max-w-lg flex-shrink-0 mt-8 lg:mt-0">
            <PanelSpotlightCard
              variant="apply"
              stat={{ value: '10+', label: 'Departments' }}
              secondaryStat={{ value: '48h', label: 'Review SLA' }}
            />
          </aside>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 md:p-8">
          {!isAuthenticated ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn size={28} className="text-primary-500" />
              </div>
              <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-2">Log in to apply</h3>
              <p className="text-brand-muted dark:text-brand-dark-muted text-sm mb-6 max-w-sm mx-auto">
                You need a Skill021 account before applying for a job or internship — this is how we get back to you about your application.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => navigate('/login', { state: { from: '/apply' } })}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#0A0A0A] dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                  <LogIn size={15} /> Log In
                </button>
                <button
                  onClick={() => navigate('/register', { state: { from: '/apply' } })}
                  className="flex items-center gap-2 px-6 py-2.5 border border-brand-border dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <UserPlus size={15} /> Register
                </button>
              </div>
            </div>
          ) : submitted ? (
            <div className="text-center py-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-500" />
                </div>
              </motion.div>
              <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-2">Application Submitted!</h3>
              <p className="text-brand-muted dark:text-brand-dark-muted text-sm mb-6">
                Thanks for applying to Skill021. Our team will review your application and get back to you by email.
              </p>
              <button onClick={resetForm} className="px-6 py-2.5 bg-[#0A0A0A] dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100">
                Submit Another Application
              </button>
            </div>
          ) : (
            <>
              {/* Job / Internship toggle */}
              <div className="flex items-center gap-1 mb-6 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setApplicationType('Internship')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    applicationType === 'Internship'
                      ? 'bg-white dark:bg-brand-dark-card text-brand-text dark:text-brand-dark-text shadow-sm'
                      : 'text-brand-muted dark:text-brand-dark-muted'
                  }`}
                >
                  <GraduationCap size={16} /> Internship
                </button>
                <button
                  type="button"
                  onClick={() => setApplicationType('Job')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    applicationType === 'Job'
                      ? 'bg-white dark:bg-brand-dark-card text-brand-text dark:text-brand-dark-text shadow-sm'
                      : 'text-brand-muted dark:text-brand-dark-muted'
                  }`}
                >
                  <Briefcase size={16} /> Full-time Job
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">
                      <UserIcon size={13} className="inline mb-0.5 mr-1" /> Full Name *
                    </label>
                    <input
                      value={form.fullName}
                      onChange={e => setField('fullName', e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">
                      <Mail size={13} className="inline mb-0.5 mr-1" /> Email Address *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setField('email', e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">
                      <Phone size={13} className="inline mb-0.5 mr-1" /> Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setField('phone', e.target.value)}
                      placeholder="+91 9XXXXXXXXX"
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">
                      Role You're Applying For *
                    </label>
                    <input
                      value={form.role}
                      onChange={e => setField('role', e.target.value)}
                      placeholder={applicationType === 'Job' ? 'e.g. Frontend Developer' : 'e.g. Web Dev Intern'}
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">Department / Domain</label>
                    <select
                      value={form.department}
                      onChange={e => setField('department', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">
                      {applicationType === 'Job' ? 'Experience Level' : 'Status'}
                    </label>
                    <select
                      value={form.experienceLevel || experienceOptions[0]}
                      onChange={e => setField('experienceLevel', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {experienceOptions.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">
                      <Building2 size={13} className="inline mb-0.5 mr-1" /> {applicationType === 'Job' ? 'Current Organization (if any)' : 'College / University'}
                    </label>
                    <input
                      value={form.collegeOrOrganization}
                      onChange={e => setField('collegeOrOrganization', e.target.value)}
                      placeholder={applicationType === 'Job' ? 'Where do you currently work?' : 'Your college name'}
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">
                      <FileText size={13} className="inline mb-0.5 mr-1" /> Resume
                    </label>
                    {resumeFile ? (
                      <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg">
                        <span className="flex items-center gap-2 min-w-0 text-sm text-brand-text dark:text-brand-dark-text">
                          <FileIcon size={14} className="text-primary-500 flex-shrink-0" />
                          <span className="truncate">{resumeFile.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setResumeFile(null)}
                          className="text-brand-muted hover:text-red-500 flex-shrink-0"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-muted dark:text-brand-dark-muted hover:border-primary-500 hover:text-primary-500 cursor-pointer transition-colors">
                        <Upload size={14} />
                        Upload PDF or Word (max {MAX_RESUME_SIZE_MB}MB)
                        <input type="file" accept={ACCEPTED_RESUME_TYPES} onChange={handleResumeSelect} className="hidden" />
                      </label>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">
                      <Link2 size={13} className="inline mb-0.5 mr-1" /> Portfolio / LinkedIn / GitHub
                    </label>
                    <input
                      value={form.portfolioUrl}
                      onChange={e => setField('portfolioUrl', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">Why do you want to join us?</label>
                  <textarea
                    value={form.coverMessage}
                    onChange={e => setField('coverMessage', e.target.value)}
                    rows={5}
                    placeholder="Tell us a bit about yourself and why you're a good fit..."
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#0A0A0A] dark:bg-white text-white dark:text-black rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {uploadingResume ? 'Uploading resume...' : 'Submit Application'}
                </motion.button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
