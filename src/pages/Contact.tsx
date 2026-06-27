import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, Mail, MapPin, MessageSquare, Send, Play, Link2, Globe as InstagramIcon, CheckCircle, Clock, Users, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

const CONTACT_REASONS = [
  'Course Inquiry',
  'Counseling Query',
  'Hackathon Registration',
  'Internship Opportunities',
  'Mentorship Booking',
  'Technical Support',
  'Partnership / Collaboration',
  'Other',
]

const CONTACT_INFO = [
  {
    icon: Mail,
    label: 'Email',
    value: 'contact@skill021.com',
    href: 'mailto:contact@skill021.com',
    color: 'text-primary-500',
    bg: 'bg-primary-50 dark:bg-primary-900/20',
  },
  {
    icon: Play,
    label: 'YouTube',
    value: '@skills021',
    href: 'https://www.youtube.com/@skills021',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'India (Pan-India Platform)',
    href: '#',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    icon: Clock,
    label: 'Support Hours',
    value: 'Mon–Sat, 9 AM – 7 PM IST',
    href: '#',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
]

const FAQ = [
  { q: 'Are the courses free?', a: 'Many of our courses and resources are completely free. Some premium courses have a one-time fee which is clearly marked.' },
  { q: 'How do I book a counseling session?', a: 'Go to the Counseling page, choose your category, select a service and click "Book Session". Fill in the form and we will confirm within 24 hours.' },
  { q: 'Can I join hackathons for free?', a: 'Yes! Most hackathons listed on our platform are free to register. Some advanced competitions may have a nominal fee.' },
  { q: 'Do you offer certificates?', a: 'Yes, we provide certificates for quiz completions (70%+ score), course completions, and hackathon participations.' },
  { q: 'How can I become a mentor?', a: 'If you are a working professional and want to mentor students, email us at mentors@skill021.com with your profile.' },
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', reason: 'Course Inquiry', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) { toast.error('Please fill all required fields'); return }
    // Simulate submission
    setTimeout(() => {
      setSubmitted(true)
      toast.success('Message sent! We\'ll get back to you within 24 hours.')
    }, 600)
  }

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0F0F1A] via-[#1A1040] to-[#0F0F1A] py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-teal-400 bg-teal-400/10 border border-teal-400/30 rounded-full mb-5 uppercase tracking-widest">
              <Phone size={13} /> Contact Us
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              We're Here to <span className="gradient-text">Help</span>
            </h1>
            <p className="text-slate-400 max-w-xl mx-auto">
              Have a question about courses, counseling, hackathons or anything else? Reach out and our team will get back to you within 24 hours.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left — Contact Info */}
          <div className="space-y-5">
            {/* Contact Info Cards */}
            {CONTACT_INFO.map((info, idx) => (
              <motion.a
                key={info.label}
                href={info.href}
                target={info.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-4 card p-4 hover:shadow-card-hover transition-shadow group cursor-pointer"
              >
                <div className={`w-11 h-11 rounded-xl ${info.bg} flex items-center justify-center flex-shrink-0 ${info.color}`}>
                  <info.icon size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wide">{info.label}</p>
                  <p className="text-sm font-semibold text-brand-text dark:text-brand-dark-text group-hover:text-primary-500 transition-colors">{info.value}</p>
                </div>
              </motion.a>
            ))}

            {/* Social Links */}
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="card p-5">
              <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text mb-4">Follow Us</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'YouTube', icon: Play, href: 'https://www.youtube.com/@skills021', color: 'hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500' },
                  {
                    label: 'Instagram',
                    icon: InstagramIcon,
                    href: '#',
                    color: 'hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-500',
                  },
                  {
                    label: 'LinkedIn',
                    icon: Link2,
                    href: '#',
                    color: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600',
                  },
                  {
                    label: 'GitHub',
                    icon: Link2,
                    href: '#',
                    color: 'hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white',
                  },
                ].map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-sm text-brand-muted dark:text-brand-dark-muted transition-all ${s.color}`}
                  >
                    <s.icon size={16} /> {s.label}
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="card p-5 bg-gradient-to-br from-primary-50 to-teal-50 dark:from-primary-900/20 dark:to-teal-900/20">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={16} className="text-primary-500" />
                <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text">Why Skill021?</h3>
              </div>
              {[
                { icon: CheckCircle, label: '100% Free Resources' },
                { icon: Users, label: '50,000+ Students Helped' },
                { icon: Clock, label: '24-hour Response Time' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2.5 mb-2.5 last:mb-0">
                  <s.icon size={14} className="text-green-500 flex-shrink-0" />
                  <span className="text-sm text-brand-text dark:text-brand-dark-text">{s.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Contact Form + FAQ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Form */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
              {submitted ? (
                <div className="text-center py-10">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-green-500" />
                    </div>
                  </motion.div>
                  <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-2">Message Sent!</h3>
                  <p className="text-brand-muted dark:text-brand-dark-muted text-sm mb-6">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                  <button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', reason: 'Course Inquiry', message: '' }) }} className="px-6 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600">
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-5 flex items-center gap-2">
                    <MessageSquare size={20} className="text-primary-500" /> Send us a Message
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'Your full name' },
                        { label: 'Email Address *', key: 'email', type: 'email', placeholder: 'your@email.com' },
                        { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '+91 9XXXXXXXXX' },
                      ].map(f => (
                        <div key={f.key} className={f.key === 'phone' ? 'sm:col-span-1' : ''}>
                          <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">{f.label}</label>
                          <input
                            type={f.type}
                            value={(form as any)[f.key]}
                            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className="w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">Reason for Contact</label>
                        <select
                          value={form.reason}
                          onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {CONTACT_REASONS.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1">Message *</label>
                      <textarea
                        value={form.message}
                        onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                        rows={5}
                        placeholder="Tell us how we can help you..."
                        className="w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      />
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-500 to-teal-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                    >
                      <Send size={16} /> Send Message
                    </motion.button>
                  </form>
                </>
              )}
            </motion.div>

            {/* FAQ */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
              <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-5">Frequently Asked Questions</h2>
              <div className="space-y-2">
                {FAQ.map((item, idx) => (
                  <div key={idx} className="border border-brand-border dark:border-brand-dark-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFAQ(openFAQ === idx ? null : idx)}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm font-semibold text-brand-text dark:text-brand-dark-text pr-4">{item.q}</span>
                      <span className={`text-xl font-light text-brand-muted flex-shrink-0 transition-transform ${openFAQ === idx ? 'rotate-45' : ''}`}>+</span>
                    </button>
                    {openFAQ === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4"
                      >
                        <p className="text-sm text-brand-muted dark:text-brand-dark-muted leading-relaxed">{item.a}</p>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
