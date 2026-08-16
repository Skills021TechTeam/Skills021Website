import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Loader2, CheckCircle2, QrCode, Copy, Check,
  UploadCloud, AlertCircle, Phone, GraduationCap, Sparkles, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Course } from '../store/contentStore'
import { submitPaymentProof, createEnrollment, getPaymentSettings, PaymentSettings } from '../lib/videoEngagementService'

export interface EnrollModalProps {
  course?: Course | null
  isPremiumMembership?: boolean
  premiumAmount?: number
  userId: string
  defaultEmail?: string
  defaultName?: string
  onClose: () => void
  onEnrolled: (itemId: string) => void
}

type Step = 'details' | 'upi_payment' | 'submitted' | 'free_success'

export default function EnrollModal({
  course,
  isPremiumMembership = false,
  premiumAmount = 999,
  userId,
  defaultEmail,
  defaultName,
  onClose,
  onEnrolled,
}: EnrollModalProps) {
  const [firstName, setFirstName] = useState(defaultName?.split(' ')[0] || '')
  const [lastName, setLastName] = useState(defaultName?.split(' ').slice(1).join(' ') || '')
  const [email, setEmail] = useState(defaultEmail || '')
  const [phone, setPhone] = useState('')

  // UPI payment state
  const [step, setStep] = useState<Step>('details')
  const [utrNumber, setUtrNumber] = useState('')
  const [screenshotBase64, setScreenshotBase64] = useState<string>('')
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    upiId: 'skills021@upi',
    upiName: 'Skills021',
    qrCodeUrl: '',
  })

  useEffect(() => {
    getPaymentSettings().then((s) => {
      if (s) setPaymentSettings(s)
    })
  }, [])

  const isFree = !isPremiumMembership && course?.price === 'FREE'
  const title = isPremiumMembership ? 'All-Access Premium Membership' : (course?.title || 'Course Access')
  const amount = isPremiumMembership ? premiumAmount : (isFree ? 0 : (typeof course?.price === 'number' ? course.price : 499))
  const itemId = isPremiumMembership ? 'premium_all_access' : (course?.id || 'course_generic')
  const itemType = isPremiumMembership ? 'premium_membership' : 'course'

  const activeUpiId = paymentSettings.upiId || 'skills021@upi'
  const activePayeeName = paymentSettings.upiName || 'Skills021'

  // If admin uploaded a custom QR code image, use it directly! Otherwise, generate dynamic UPI QR code
  const upiIntentUrl = `upi://pay?pa=${activeUpiId}&pn=${encodeURIComponent(activePayeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Skills021 - ${title.slice(0, 30)}`)}`
  const qrDisplayUrl = paymentSettings.qrCodeUrl && paymentSettings.qrCodeUrl.trim() !== ''
    ? paymentSettings.qrCodeUrl
    : `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiIntentUrl)}&size=240x240&margin=10`

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(activeUpiId).then(() => {
      setCopiedUpi(true)
      toast.success('UPI ID copied to clipboard!')
      setTimeout(() => setCopiedUpi(false), 2500)
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, or WEBP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5 MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setScreenshotBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      toast.error('Please fill in all contact details')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email')
      return
    }
    if (!/^[+]?[\d\s()-]{7,15}$/.test(phone.trim())) {
      toast.error('Please enter a valid contact phone number')
      return
    }

    if (isFree && course) {
      setSubmitting(true)
      try {
        await createEnrollment({
          courseId: course.id,
          userId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          status: 'free',
          amount: 0,
          itemTitle: course.title,
        })
        toast.success('Enrolled successfully for Free! 🎉')
        setStep('free_success')
        onEnrolled(course.id)
      } catch (err: any) {
        toast.error(err.message || 'Failed to enroll')
      } finally {
        setSubmitting(false)
      }
      return
    }

    // Move to UPI payment step
    setStep('upi_payment')
  }

  const handlePaymentProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUtr = utrNumber.trim()
    if (!trimmedUtr || trimmedUtr.length < 6) {
      toast.error('Please enter a valid 12-digit UTR / Transaction Reference Number')
      return
    }

    if (!screenshotBase64) {
      toast.error('Please upload your payment screenshot / receipt')
      return
    }

    setSubmitting(true)
    try {
      await submitPaymentProof({
        userId,
        itemType,
        itemId,
        itemTitle: title,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        amount,
        utrNumber: trimmedUtr,
        screenshotUrl: screenshotBase64,
      })

      toast.success('Payment proof submitted for admin review! ⏳')
      setStep('submitted')
      onEnrolled(itemId)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to submit payment proof')
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
        className="fixed inset-0 bg-black/75 z-[70] flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white dark:bg-brand-dark-card rounded-3xl overflow-hidden shadow-2xl my-8 max-h-[92vh] flex flex-col"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-brand-dark-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary-500/10 dark:bg-primary-500/20 text-primary-500 flex items-center justify-center">
                {isPremiumMembership ? <Sparkles size={18} /> : <GraduationCap size={18} />}
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text leading-tight">
                  {isPremiumMembership ? 'Upgrade to Premium' : isFree ? 'Free Enrollment' : 'Purchase Course'}
                </h3>
                <p className="text-xs text-brand-muted dark:text-brand-dark-muted line-clamp-1">{title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-brand-muted"
            >
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto p-6 flex-1">
            {/* ─── STEP 1: Contact Details ─────────────────────────────────────── */}
            {step === 'details' && (
              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary-50 to-teal-50 dark:from-primary-950/30 dark:to-teal-950/30 border border-primary-100 dark:border-primary-900/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted font-medium">Selected Item</p>
                    <p className="text-sm font-bold text-brand-text dark:text-brand-dark-text">{title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted font-medium">Payable Amount</p>
                    <p className="text-lg font-black text-primary-500">{isFree ? 'FREE' : `₹${amount}`}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-1">First Name *</label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="input text-xs"
                      placeholder="Jane"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-1">Last Name *</label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="input text-xs"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input text-xs"
                    placeholder="jane@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-muted dark:text-brand-dark-muted mb-1">Contact Phone Number *</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input pl-9 text-xs"
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3 bg-primary-500 text-white font-bold text-sm rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary-500/20"
                >
                  {submitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : isFree ? (
                    'Enroll Instantly for Free'
                  ) : (
                    'Proceed to UPI Payment (₹' + amount + ')'
                  )}
                </button>
              </form>
            )}

            {/* ─── STEP 2: UPI QR Code & UTR Submission ───────────────────────── */}
            {step === 'upi_payment' && (
              <form onSubmit={handlePaymentProofSubmit} className="space-y-4">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-500 mb-1">UPI Payment Portal</p>
                  <h4 className="text-xl font-bold text-brand-text dark:text-brand-dark-text">Scan & Pay ₹{amount}</h4>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-0.5">
                    Use Google Pay, PhonePe, Paytm, BHIM, or any UPI App
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-brand-dark-border">
                  <div className="p-2 bg-white rounded-xl shadow-sm max-w-[200px] max-h-[200px] flex items-center justify-center overflow-hidden">
                    <img
                      src={qrDisplayUrl}
                      alt="Skills021 UPI QR Code"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  </div>

                  {/* Copy UPI ID */}
                  <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border rounded-xl text-xs">
                    <span className="text-brand-muted dark:text-brand-dark-muted font-mono">{activeUpiId}</span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="inline-flex items-center gap-1 font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 ml-1"
                    >
                      {copiedUpi ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                      {copiedUpi ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Step Instructions */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl text-xs space-y-1 text-amber-800 dark:text-amber-300">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} /> Verification Instructions:
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 text-[11px] opacity-90">
                    <li>Make the payment of <strong>₹{amount}</strong> to the UPI ID above.</li>
                    <li>Copy the <strong>12-digit UTR / Reference ID</strong> from your UPI app receipt.</li>
                    <li>Upload your payment screenshot below and click Submit.</li>
                  </ol>
                </div>

                {/* UTR Input */}
                <div>
                  <label className="block text-xs font-bold text-brand-text dark:text-brand-dark-text mb-1">
                    12-digit UTR / Transaction ID *
                  </label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. 423456789012"
                    className="input text-xs font-mono tracking-wider"
                    required
                  />
                </div>

                {/* Screenshot Upload */}
                <div>
                  <label className="block text-xs font-bold text-brand-text dark:text-brand-dark-text mb-1">
                    Payment Screenshot / Receipt *
                  </label>
                  {screenshotBase64 ? (
                    <div className="relative p-2 border border-brand-border dark:border-brand-dark-border rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={screenshotBase64} alt="Proof preview" className="w-12 h-12 object-cover rounded-lg" />
                        <span className="text-xs font-medium text-brand-text dark:text-brand-dark-text">Screenshot attached</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setScreenshotBase64('')}
                        className="text-xs text-red-500 hover:text-red-600 font-semibold px-2 py-1"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-brand-border dark:border-brand-dark-border rounded-xl cursor-pointer hover:border-primary-500 dark:hover:border-primary-500 transition-colors bg-gray-50/50 dark:bg-white/5">
                      <UploadCloud size={24} className="text-brand-muted mb-1" />
                      <span className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">Click to upload screenshot</span>
                      <span className="text-[10px] text-brand-muted">PNG, JPG, or WEBP up to 5MB</span>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border text-xs font-semibold text-brand-muted hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-primary-500 text-white font-bold text-sm rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary-500/20"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Submit Payment for Verification'}
                  </button>
                </div>
              </form>
            )}

            {/* ─── STEP 3: Submitted / Under Review ────────────────────────────── */}
            {step === 'submitted' && (
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <Clock size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text">Payment Proof Submitted!</h3>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
                    Your payment proof with UTR <strong className="font-mono text-brand-text dark:text-brand-dark-text">#{utrNumber}</strong> has been sent to the admin team.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-brand-border dark:border-brand-dark-border text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Item:</span>
                    <span className="font-semibold text-brand-text dark:text-brand-dark-text">{title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Amount:</span>
                    <span className="font-bold text-primary-500">₹{amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Status:</span>
                    <span className="badge text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold">
                      Pending Admin Approval
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted">
                  Once the admin verifies your payment in the admin panel, your access will be activated immediately!
                </p>

                <button
                  onClick={onClose}
                  className="w-full py-3 bg-[#0A0A0A] dark:bg-white text-white dark:text-black font-bold text-sm rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                  Done
                </button>
              </div>
            )}

            {/* ─── Free Success ───────────────────────────────────────────────── */}
            {step === 'free_success' && (
              <div className="p-6 text-center space-y-4">
                <CheckCircle2 size={48} className="mx-auto text-primary-500" />
                <div>
                  <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text">You're Enrolled!</h3>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1">
                    You now have full free access to {title}.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-primary-500 text-white font-bold text-sm rounded-xl hover:bg-primary-600 transition-colors"
                >
                  Start Learning Now
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
