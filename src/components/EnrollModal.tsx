import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle2, CreditCard, ShieldCheck, Phone, GraduationCap } from 'lucide-react'
import toast from 'react-hot-toast'
import { Course } from '../store/contentStore'
import { createEnrollment, markEnrollmentPaid } from '../lib/videoEngagementService'

interface EnrollModalProps {
  course: Course
  userId: string
  defaultEmail?: string
  defaultName?: string
  onClose: () => void
  onEnrolled: (courseId: string) => void
}

type Step = 'form' | 'payment' | 'success'

export default function EnrollModal({ course, userId, defaultEmail, defaultName, onClose, onEnrolled }: EnrollModalProps) {
  const [firstName, setFirstName] = useState(defaultName?.split(' ')[0] || '')
  const [lastName, setLastName] = useState(defaultName?.split(' ').slice(1).join(' ') || '')
  const [email, setEmail] = useState(defaultEmail || '')
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [submitting, setSubmitting] = useState(false)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)

  const isFree = course.price === 'FREE'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email')
      return
    }
    if (!/^[+]?[\d\s()-]{7,15}$/.test(phone.trim())) {
      toast.error('Please enter a valid contact number')
      return
    }

    setSubmitting(true)
    try {
      const enrollment = await createEnrollment({
        courseId: course.id,
        userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        status: isFree ? 'free' : 'pending',
        amount: isFree ? 0 : (typeof course.price === 'number' ? course.price : 0),
      })
      setEnrollmentId(enrollment.id)

      if (isFree) {
        toast.success('Enrolled! You can now watch the video.')
        setStep('success')
        onEnrolled(course.id)
      } else {
        setStep('payment')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to enroll')
    } finally {
      setSubmitting(false)
    }
  }

  // Placeholder payment step — wire your real payment gateway (Razorpay/Stripe/etc.) here.
  const handleConfirmPayment = async () => {
    if (!enrollmentId) return
    setSubmitting(true)
    try {
      await markEnrollmentPaid(enrollmentId)
      toast.success('Payment successful! You can now watch the video.')
      setStep('success')
      onEnrolled(course.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm payment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-white dark:bg-brand-dark-card rounded-2xl overflow-hidden shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={20} className="text-primary-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text leading-tight">Enroll in Course</h3>
                  <p className="text-sm text-brand-muted dark:text-brand-dark-muted line-clamp-1">{course.title}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-1">First Name</label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} className="input" placeholder="Jane" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-1">Last Name</label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} className="input" placeholder="Doe" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="jane@example.com" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-1">Contact Number</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted dark:text-brand-dark-muted" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="input pl-9"
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-brand-dark-border">
                <span className="text-sm font-medium text-brand-muted dark:text-brand-dark-muted">Amount</span>
                <span className="text-lg font-bold text-brand-text dark:text-brand-dark-text">
                  {isFree ? <span className="text-primary-500">FREE</span> : `₹${course.price}`}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-60 transition-colors"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : isFree ? 'Enroll for Free' : 'Continue to Payment'}
              </button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-brand-muted dark:text-brand-dark-muted">
                <ShieldCheck size={12} /> Your details are kept private and secure
              </p>
            </form>
          )}

          {step === 'payment' && (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard size={20} className="text-primary-500" />
                <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text">Payment</h3>
              </div>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-5">{course.title}</p>

              <div className="p-4 rounded-xl border border-dashed border-brand-border dark:border-brand-dark-border text-center mb-5">
                <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-2">
                  Payment gateway not connected yet. This is a placeholder screen — plug in Razorpay, Stripe, etc. here.
                </p>
                <p className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">₹{course.price}</p>
              </div>

              <button
                onClick={handleConfirmPayment}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0A0A0A] dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-60 transition-colors"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /> Simulate Successful Payment</>}
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="p-8 text-center">
              <CheckCircle2 size={48} className="mx-auto text-primary-500 mb-3" />
              <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-1">You're enrolled!</h3>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-5">You can now watch the video and access all course content.</p>
              <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
