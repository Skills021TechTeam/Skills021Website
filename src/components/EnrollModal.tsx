import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Loader2, CheckCircle2, QrCode, Copy, Check,
  UploadCloud, AlertCircle, Phone, GraduationCap, Sparkles, Clock,
  Tag, ChevronRight, BadgePercent, XCircle, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Course, Resource } from '../store/contentStore'
import { submitPaymentProof, createEnrollment, getPaymentSettings, PaymentSettings } from '../lib/videoEngagementService'
import {
  fetchCheckoutPrice,
  initialCheckoutPricing,
  toCheckoutPricing,
  formatPrice,
} from '../lib/pricingService'
import type { CheckoutPricing, ProductType } from '../lib/pricingTypes'

export interface EnrollModalProps {
  course?: Course | null
  resource?: Resource | null
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
  resource,
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

  // ─── Pricing state ────────────────────────────────────────────────────────
  const itemType: ProductType = isPremiumMembership
    ? 'premium_membership'
    : resource
      ? 'resource'
      : 'course'

  const isFree = !isPremiumMembership && (
    resource
      ? (!resource.isPremium || !resource.price || resource.price === 0)
      : course?.price === 'FREE'
  )

  const title = isPremiumMembership
    ? 'All-Access Premium Membership'
    : resource
      ? (resource.title || 'Resource Access')
      : (course?.title || 'Course Access')

  const itemId = isPremiumMembership
    ? 'premium_all_access'
    : resource
      ? String(resource.id)
      : (course?.id || 'course_generic')

  // Server-verified pricing (the source of truth for the payment amount)
  const [pricing, setPricing] = useState<CheckoutPricing>(
    initialCheckoutPricing(
      isPremiumMembership
        ? premiumAmount
        : resource
          ? (resource.price || 0)
          : (typeof course?.price === 'number' ? course.price : 0)
    )
  )

  // Coupon input UI state
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  const pricingFetchRef = useRef<number>(0)

  // ─── Load authoritative pricing from server ───────────────────────────────
  const loadPricing = async (couponCode?: string | null) => {
    if (isFree) {
      setPricing({
        originalPrice:         0,
        productDiscountAmount: 0,
        couponDiscountAmount:  0,
        couponCode:            null,
        finalAmount:           0,
        isFree:                true,
        discountId:            null,
        couponId:              null,
        isLoading:             false,
        error:                 null,
      })
      return
    }

    const token = ++pricingFetchRef.current
    try {
      const breakdown = await fetchCheckoutPrice(
        itemType,
        itemId,
        couponCode,
        userId || null
      )
      if (token !== pricingFetchRef.current) return // Stale response — discard
      const p = toCheckoutPricing(breakdown)

      if (couponCode && p.couponError) {
        setCouponError(p.couponError)
        // Pricing without coupon
        const base = await fetchCheckoutPrice(itemType, itemId, null, userId || null)
        if (token !== pricingFetchRef.current) return
        setPricing({ ...toCheckoutPricing(base), isLoading: false })
      } else {
        setCouponError(null)
        setPricing({ ...p, isLoading: false })
      }
    } catch (err) {
      if (token !== pricingFetchRef.current) return
      setPricing(prev => ({ ...prev, isLoading: false, error: 'Failed to load pricing.' }))
    }
  }

  useEffect(() => {
    getPaymentSettings().then((s) => { if (s) setPaymentSettings(s) })
    loadPricing(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const effectivePremiumAmount = paymentSettings.allAccessPrice || premiumAmount
  // Always use server-calculated amount — NEVER trust a frontend-derived amount
  const displayAmount = pricing.isLoading
    ? (isPremiumMembership
        ? effectivePremiumAmount
        : isFree
          ? 0
          : (resource ? (resource.price || 0) : (typeof course?.price === 'number' ? course.price : 499)))
    : pricing.finalAmount

  const activeUpiId = paymentSettings.upiId || 'skills021@upi'
  const activePayeeName = paymentSettings.upiName || 'Skills021'
  const upiIntentUrl = `upi://pay?pa=${activeUpiId}&pn=${encodeURIComponent(activePayeeName)}&am=${displayAmount}&cu=INR&tn=${encodeURIComponent(`Skills021 - ${title.slice(0, 30)}`)}`
  const qrDisplayUrl = paymentSettings.qrCodeUrl?.trim()
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
    reader.onload = () => setScreenshotBase64(reader.result as string)
    reader.readAsDataURL(file)
  }

  // ─── Coupon Handlers ──────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    const code = couponInput.trim()
    if (!code) {
      setCouponError('Please enter a coupon code.')
      return
    }

    setCouponLoading(true)
    setCouponError(null)

    try {
      await loadPricing(code)
      // After loadPricing completes, check if pricing has the coupon applied
      // We check the ref via a fresh fetch to get the state
      const breakdown = await fetchCheckoutPrice(itemType, itemId, code, userId || null)
      const result = toCheckoutPricing(breakdown)

      if (result.couponError) {
        setCouponError(result.couponError)
        setAppliedCoupon(null)
      } else if (result.couponCode) {
        setAppliedCoupon(result.couponCode)
        setCouponError(null)
        setPricing({ ...result, isLoading: false })
        toast.success(`Coupon "${result.couponCode}" applied! 🎉`)
      } else {
        // Coupon may have been rejected in favor of product discount
        if (pricing.productDiscountAmount > 0) {
          toast.success('Product discount is already better than this coupon.')
        }
        setAppliedCoupon(null)
      }
    } catch {
      setCouponError('Unable to validate coupon. Please try again.')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError(null)
    loadPricing(null)
    toast.success('Coupon removed.')
  }

  // ─── Step handlers ────────────────────────────────────────────────────────
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

    if (isFree) {
      setSubmitting(true)
      try {
        await createEnrollment({
          courseId: itemId,
          userId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          status: 'free',
          amount: 0,
          itemTitle: title,
          itemType: itemType === 'resource' ? 'resource' : 'course',
        })
        toast.success('Enrolled successfully for Free! 🎉')
        setStep('free_success')
        onEnrolled(itemId)
      } catch (err: unknown) {
        toast.error((err as Error).message || 'Failed to enroll')
      } finally {
        setSubmitting(false)
      }
      return
    }

    // Re-fetch authoritative price before proceeding to payment
    if (!pricing.isLoading) {
      await loadPricing(appliedCoupon)
    }

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
      // Re-fetch authoritative pricing one final time to get the server-confirmed amount
      const finalBreakdown = await fetchCheckoutPrice(
        itemType,
        itemId,
        appliedCoupon,
        userId || null
      )
      const confirmedAmount = finalBreakdown.finalAmount

      await submitPaymentProof({
        userId,
        itemType: itemType === 'premium_membership' ? 'premium_membership' : (itemType === 'resource' ? 'resource' : 'course'),
        itemId,
        itemTitle: title,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        amount: confirmedAmount,
        utrNumber: trimmedUtr,
        screenshotUrl: screenshotBase64,
        // Pricing snapshot fields
        originalAmount: finalBreakdown.originalPrice,
        productDiscountAmount: finalBreakdown.productDiscountAmount,
        couponCode: finalBreakdown.couponCode,
        couponDiscountAmount: finalBreakdown.couponDiscountAmount,
        appliedDiscountId: finalBreakdown.discountId,
        appliedCouponId: finalBreakdown.couponId,
      })

      toast.success('Payment proof submitted for admin review! ⏳')
      setStep('submitted')
      onEnrolled(itemId)
    } catch (err: unknown) {
      console.error(err)
      toast.error((err as Error).message || 'Failed to submit payment proof')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Pricing Breakdown Display ────────────────────────────────────────────
  const hasProductDiscount = !pricing.isLoading && pricing.productDiscountAmount > 0
  const hasCouponDiscount = !pricing.isLoading && pricing.couponDiscountAmount > 0
  const showBreakdown = hasProductDiscount || hasCouponDiscount

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
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
                {isPremiumMembership ? <Sparkles size={18} /> : (resource ? <FileText size={18} /> : <GraduationCap size={18} />)}
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text leading-tight">
                  {isPremiumMembership ? 'Upgrade to Premium' : isFree ? 'Free Access' : (resource ? 'Purchase Resource' : 'Purchase Course')}
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
            {/* ─── STEP 1: Contact Details ───────────────────────────────────── */}
            {step === 'details' && (
              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                {/* ── Pricing Summary Card ── */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary-50 to-teal-50 dark:from-primary-950/30 dark:to-teal-950/30 border border-primary-100 dark:border-primary-900/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-brand-muted dark:text-brand-dark-muted font-medium">Selected Item</p>
                      <p className="text-sm font-bold text-brand-text dark:text-brand-dark-text">{title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-brand-muted dark:text-brand-dark-muted font-medium">Payable Amount</p>
                      {pricing.isLoading ? (
                        <Loader2 size={16} className="animate-spin text-primary-500 ml-auto mt-1" />
                      ) : isFree ? (
                        <p className="text-lg font-black text-primary-500">FREE</p>
                      ) : (
                        <div className="text-right">
                          {hasProductDiscount && (
                            <p className="text-xs line-through text-brand-muted dark:text-brand-dark-muted">
                              {formatPrice(pricing.originalPrice)}
                            </p>
                          )}
                          <p className="text-lg font-black text-primary-500">{formatPrice(displayAmount)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing breakdown (shown when discounts apply) */}
                  {showBreakdown && (
                    <div className="mt-3 pt-3 border-t border-primary-100 dark:border-primary-900/30 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-brand-muted dark:text-brand-dark-muted">Original Price</span>
                        <span className="font-medium text-brand-text dark:text-brand-dark-text">
                          {formatPrice(pricing.originalPrice)}
                        </span>
                      </div>
                      {hasProductDiscount && (
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <BadgePercent size={11} /> Sale Discount
                          </span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            −{formatPrice(pricing.productDiscountAmount)}
                          </span>
                        </div>
                      )}
                      {hasCouponDiscount && (
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                            <Tag size={11} /> Coupon ({pricing.couponCode})
                          </span>
                          <span className="font-semibold text-violet-600 dark:text-violet-400">
                            −{formatPrice(pricing.couponDiscountAmount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs border-t border-primary-100 dark:border-primary-900/30 pt-1.5 mt-1">
                        <span className="font-bold text-brand-text dark:text-brand-dark-text">Total</span>
                        <span className="font-black text-primary-500">{formatPrice(pricing.finalAmount)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Coupon Input (only for paid items) ── */}
                {!isFree && !pricing.isLoading && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-brand-muted dark:text-brand-dark-muted">
                      Coupon Code (Optional)
                    </label>
                    {appliedCoupon ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30">
                        <Tag size={14} className="text-violet-500 flex-shrink-0" />
                        <span className="text-xs font-bold text-violet-700 dark:text-violet-300 flex-1 font-mono">
                          {appliedCoupon}
                        </span>
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                          −{formatPrice(pricing.couponDiscountAmount)}
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="p-1 text-brand-muted hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                          title="Remove coupon"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase())
                            setCouponError(null)
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                          placeholder="Enter code e.g. SKILLS50"
                          className="input text-xs flex-1 font-mono uppercase"
                          maxLength={50}
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          {couponLoading ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <>
                              <ChevronRight size={13} /> Apply
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {couponError && (
                      <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                        <XCircle size={12} /> {couponError}
                      </p>
                    )}
                  </div>
                )}

                {/* Contact form fields */}
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
                  disabled={submitting || pricing.isLoading}
                  className="w-full mt-2 py-3 bg-primary-500 text-white font-bold text-sm rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary-500/20 disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : isFree ? (
                    'Enroll Instantly for Free'
                  ) : pricing.isLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Loading price…</>
                  ) : (
                    `Proceed to UPI Payment (${formatPrice(displayAmount)})`
                  )}
                </button>
              </form>
            )}

            {/* ─── STEP 2: UPI QR Code & UTR Submission ───────────────────────── */}
            {step === 'upi_payment' && (
              <form onSubmit={handlePaymentProofSubmit} className="space-y-4">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-500 mb-1">UPI Payment Portal</p>
                  <h4 className="text-xl font-bold text-brand-text dark:text-brand-dark-text">
                    Scan &amp; Pay {formatPrice(displayAmount)}
                  </h4>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-0.5">
                    Use Google Pay, PhonePe, Paytm, BHIM, or any UPI App
                  </p>
                </div>

                {/* Price breakdown on payment step */}
                {showBreakdown && (
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-brand-dark-border text-xs space-y-1">
                    {hasProductDiscount && (
                      <div className="flex justify-between">
                        <span className="text-brand-muted">Sale Discount</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">−{formatPrice(pricing.productDiscountAmount)}</span>
                      </div>
                    )}
                    {hasCouponDiscount && (
                      <div className="flex justify-between">
                        <span className="text-brand-muted">Coupon ({pricing.couponCode})</span>
                        <span className="text-violet-600 dark:text-violet-400 font-semibold">−{formatPrice(pricing.couponDiscountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-gray-200 dark:border-white/10 pt-1">
                      <span className="text-brand-text dark:text-brand-dark-text">Final Amount</span>
                      <span className="text-primary-500">{formatPrice(pricing.finalAmount)}</span>
                    </div>
                  </div>
                )}

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-brand-dark-border">
                  <div className="p-2 bg-white rounded-xl shadow-sm max-w-[200px] max-h-[200px] flex items-center justify-center overflow-hidden">
                    <img
                      src={qrDisplayUrl}
                      alt="Skills021 UPI QR Code"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  </div>
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
                    <li>Make the payment of <strong>{formatPrice(displayAmount)}</strong> to the UPI ID above.</li>
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
                  {pricing.productDiscountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-brand-muted">Sale Discount:</span>
                      <span className="text-green-600 dark:text-green-400 font-semibold">−{formatPrice(pricing.productDiscountAmount)}</span>
                    </div>
                  )}
                  {pricing.couponDiscountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-brand-muted">Coupon ({pricing.couponCode}):</span>
                      <span className="text-violet-600 dark:text-violet-400 font-semibold">−{formatPrice(pricing.couponDiscountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 dark:border-white/10 pt-1.5">
                    <span className="text-brand-muted">Amount Paid:</span>
                    <span className="font-bold text-primary-500">{formatPrice(pricing.finalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Status:</span>
                    <span className="badge text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold">
                      Pending Skills021 Verification
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted">
                  Once the Skills021 team verifies your payment details, your access will be activated immediately!
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
