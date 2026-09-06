import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Package, Lock, Unlock, CheckCircle2, AlertCircle, Clock,
  Play, FileText, ChevronDown, ChevronRight, ArrowLeft,
  Sparkles, ShieldCheck, HelpCircle, Check, Loader2,
  Calendar, Layers, Download, Upload, X, Copy, QrCode, Tag,
  BadgePercent, AlertTriangle, ExternalLink, BookOpen,
  Star, Users, Phone, Video
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import {
  fetchSemesterBundle,
  getUserSemesterBundleEntitlement,
  submitSemesterBundlePaymentProof,
} from '../lib/semesterBundleService'
import type {
  SemesterBundle,
  SemesterBundleSubject,
  SemesterBundleAccess,
  SemesterBundlePlan,
} from '../lib/semesterBundleTypes'
import { fetchSubjectCurriculum } from '../lib/subjectBundleService'
import type { SubjectUnit } from '../lib/subjectBundleTypes'
import { fetchCheckoutPrice, toCheckoutPricing, formatPrice } from '../lib/pricingService'
import type { CheckoutPricing } from '../lib/pricingTypes'
import { getPaymentSettings, type PaymentSettings } from '../lib/videoEngagementService'

export default function SemesterBundleView() {
  const { bundleId } = useParams<{ bundleId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'
  const isPremiumUser = Boolean(user?.isPremium)

  const [loading, setLoading] = useState(true)
  const [bundle, setBundle] = useState<SemesterBundle | null>(null)
  const [access, setAccess] = useState<SemesterBundleAccess>({ hasAccess: false })

  // Plan selector: 'six_month' vs 'lifetime'
  const [selectedPlan, setSelectedPlan] = useState<SemesterBundlePlan>('six_month')

  // Expanded subject preview states (subjectId -> SubjectUnit[])
  const [expandedSubjectId, setExpandedSubjectId] = useState<number | null>(null)
  const [curriculumCache, setCurriculumCache] = useState<Record<number, SubjectUnit[]>>({})
  const [loadingCurriculumSubjectId, setLoadingCurriculumSubjectId] = useState<number | null>(null)

  // Payment Checkout Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [step, setStep] = useState<'details' | 'upi_payment' | 'submitted'>('details')
  const [firstName, setFirstName] = useState(user?.name ? user.name.split(' ')[0] : '')
  const [lastName, setLastName] = useState(user?.name ? user.name.split(' ').slice(1).join(' ') : '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [utrNumber, setUtrNumber] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copiedUpi, setCopiedUpi] = useState(false)

  // Coupon state
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  // Payment settings (Admin UPI ID and QR code)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    upiId: 'skills021@upi',
    upiName: 'Skills021',
    qrCodeUrl: '',
  })

  // Authoritative server-verified pricing
  const [pricing, setPricing] = useState<CheckoutPricing>({
    originalPrice: 0,
    productDiscountAmount: 0,
    couponDiscountAmount: 0,
    couponCode: null,
    finalAmount: 0,
    isFree: false,
    discountId: null,
    couponId: null,
    isLoading: true,
    error: null,
  })

  // Load bundle data
  const loadData = async () => {
    if (!bundleId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await fetchSemesterBundle(bundleId)
      setBundle(data)

      if (data) {
        // Set default plan based on availability
        if (!data.sixMonthEnabled && data.lifetimeEnabled) {
          setSelectedPlan('lifetime')
        }

        // Check user access
        if (isAdmin || isPremiumUser) {
          setAccess({
            hasAccess: true,
            planType: 'lifetime',
            isLifetime: true,
          })
        } else if (user?.id) {
          const userAccess = await getUserSemesterBundleEntitlement(user.id, data.id)
          setAccess(userAccess)
        }
      }
    } catch (err) {
      console.error('[SemesterBundleView] Error loading semester bundle:', err)
      toast.error('Failed to load semester bundle')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [bundleId, user?.id, isAdmin, isPremiumUser])

  useEffect(() => {
    getPaymentSettings().then((s) => {
      if (s) setPaymentSettings(s)
    })
  }, [])

  // Update authoritative pricing when plan or bundle changes
  const loadAuthoritativePricing = async (couponCode?: string | null) => {
    if (!bundle) return

    const basePrice = selectedPlan === 'lifetime' ? bundle.lifetimePrice : bundle.sixMonthPrice
    const rawProductId = `${bundle.id}:${selectedPlan}`

    try {
      const breakdown = await fetchCheckoutPrice('semester_bundle', rawProductId, couponCode, user?.id || null)
      const p = toCheckoutPricing(breakdown)

      if (couponCode && p.couponError) {
        setCouponError(p.couponError)
        const base = await fetchCheckoutPrice('semester_bundle', rawProductId, null, user?.id || null)
        setPricing({ ...toCheckoutPricing(base), isLoading: false })
      } else {
        setCouponError(null)
        setPricing({ ...p, isLoading: false })
      }
    } catch {
      setPricing({
        originalPrice: basePrice,
        productDiscountAmount: 0,
        couponDiscountAmount: 0,
        couponCode: null,
        finalAmount: basePrice,
        isFree: basePrice === 0,
        discountId: null,
        couponId: null,
        isLoading: false,
        error: 'Failed to verify price with server',
      })
    }
  }

  useEffect(() => {
    if (bundle) {
      loadAuthoritativePricing(appliedCoupon)
    }
  }, [bundle?.id, selectedPlan, appliedCoupon, user?.id])

  // Handle coupon apply
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError(null)
    try {
      const code = couponInput.trim().toUpperCase()
      await loadAuthoritativePricing(code)
      setAppliedCoupon(code)
      toast.success(`Coupon "${code}" applied!`)
    } catch {
      setCouponError('Invalid or expired coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError(null)
    loadAuthoritativePricing(null)
    toast.success('Coupon removed')
  }

  // Toggle syllabus preview for a specific subject inside the semester bundle
  const toggleSubjectSyllabus = async (subjectId: number) => {
    if (expandedSubjectId === subjectId) {
      setExpandedSubjectId(null)
      return
    }

    setExpandedSubjectId(subjectId)
    if (!curriculumCache[subjectId]) {
      setLoadingCurriculumSubjectId(subjectId)
      try {
        const curr = await fetchSubjectCurriculum(subjectId)
        setCurriculumCache(prev => ({ ...prev, [subjectId]: curr.units }))
      } catch (err) {
        console.warn('[SemesterBundleView] Failed to load curriculum for preview:', err)
      } finally {
        setLoadingCurriculumSubjectId(null)
      }
    }
  }

  // Handle receipt image upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, etc.)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Receipt image must be under 5MB')
      return
    }

    setUploadingReceipt(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      setScreenshotUrl(reader.result as string)
      setUploadingReceipt(false)
      toast.success('Receipt attached!')
    }
    reader.onerror = () => {
      toast.error('Failed to read image file')
      setUploadingReceipt(false)
    }
    reader.readAsDataURL(file)
  }

  // Submit payment proof
  const handleSubmitPayment = async () => {
    if (!user) {
      toast.error('Please log in to enroll')
      navigate('/login')
      return
    }
    if (!bundle) return

    if (!firstName.trim()) {
      toast.error('Please enter your first name')
      return
    }
    if (!phone.trim() || phone.trim().length < 10) {
      toast.error('Please enter a valid phone number')
      return
    }
    if (!utrNumber.trim()) {
      toast.error('Please enter the 12-digit UPI / UTR Transaction ID')
      return
    }

    setSubmitting(true)
    try {
      await submitSemesterBundlePaymentProof({
        bundleId: bundle.id,
        semesterId: bundle.semesterId,
        semesterTitle: bundle.title,
        planType: selectedPlan,
        userId: user.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        amount: pricing.finalAmount,
        utrNumber: utrNumber.trim(),
        screenshotUrl: screenshotUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
        originalAmount: pricing.originalPrice,
        productDiscountAmount: pricing.productDiscountAmount,
        couponCode: pricing.couponCode,
        couponDiscountAmount: pricing.couponDiscountAmount,
        appliedDiscountId: pricing.discountId,
        appliedCouponId: pricing.couponId,
      })

      setStep('submitted')
      setAccess(prev => ({ ...prev, isPending: true, hasPending: true }))
      toast.success('Payment proof submitted successfully! 🎉')
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit payment proof')
    } finally {
      setSubmitting(false)
    }
  }

  // Value calculation: sum of individual subject bundles
  const { sumIndividual6m, sumIndividualLt } = useMemo(() => {
    if (!bundle?.subjects) return { sumIndividual6m: 0, sumIndividualLt: 0 }
    let s6 = 0
    let sLt = 0
    bundle.subjects.forEach(s => {
      s6 += s.sixMonthPrice || 0
      sLt += s.lifetimePrice || 0
    })
    return { sumIndividual6m: s6, sumIndividualLt: sLt }
  }, [bundle?.subjects])

  const benchmarkPrice = selectedPlan === 'lifetime' ? sumIndividualLt : sumIndividual6m
  const bundleCurrentPrice = pricing.finalAmount
  const savingsAmount = Math.max(0, benchmarkPrice - bundleCurrentPrice)
  const savingsPercent = benchmarkPrice > 0 ? Math.round((savingsAmount / benchmarkPrice) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-brand-dark-bg pt-24 pb-16 flex flex-col items-center justify-center">
        <Loader2 size={36} className="animate-spin text-primary-500 mb-3" />
        <p className="text-sm font-semibold text-brand-muted">Loading Semester Bundle...</p>
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="min-h-screen bg-white dark:bg-brand-dark-bg pt-28 pb-16 px-4">
        <div className="max-w-xl mx-auto text-center p-8 rounded-3xl border border-dashed border-brand-border bg-gray-50 dark:bg-white/5">
          <GraduationCap size={48} className="mx-auto text-brand-muted opacity-40 mb-3" />
          <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-2">Semester Bundle Not Found</h2>
          <p className="text-sm text-brand-muted mb-6">
            The requested semester bundle may have been moved, deactivated, or does not exist.
          </p>
          <Link to="/courses" className="btn-primary text-xs py-2.5 px-5 inline-flex items-center gap-2">
            <ArrowLeft size={14} /> Back to Courses
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-brand-dark-bg pt-20 pb-20 text-brand-text dark:text-brand-dark-text">
      {/* Top Breadcrumb Header */}
      <div className="border-b border-gray-100 dark:border-brand-dark-border bg-gray-50/50 dark:bg-brand-dark-card/30 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-semibold text-brand-muted">
          <div className="flex items-center gap-2 truncate">
            <Link to="/courses" className="hover:text-brand-text flex items-center gap-1">
              <ArrowLeft size={14} /> Courses
            </Link>
            <ChevronRight size={12} className="opacity-40" />
            <span className="truncate">
              {[bundle.collegeName, bundle.academicCourseName, bundle.branchCode || bundle.branchName].filter(Boolean).join(' · ')}
            </span>
            <ChevronRight size={12} className="opacity-40" />
            <span className="text-brand-text dark:text-brand-dark-text font-bold">
              Semester {bundle.semesterNumber} Bundle
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
            <Sparkles size={11} /> Multi-Subject Package
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Left Column (Curriculum & Details) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            {/* Hero Card */}
            <div className="relative rounded-3xl overflow-hidden border border-gray-800/80 dark:border-white/15 bg-[#0F0F12]/90 backdrop-blur-xl text-white p-6 sm:p-10 shadow-2xl">
              {bundle.thumbnailUrl && (
                <>
                  <img
                    src={bundle.thumbnailUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-45 select-none pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F12]/90 via-[#0F0F12]/55 to-black/20" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F12]/80 via-[#0F0F12]/40 to-transparent" />
                </>
              )}
              <div className="relative z-10 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/20 text-white">
                    Semester {bundle.semesterNumber}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 backdrop-blur-md text-white/90 border border-white/20">
                    {bundle.subjects?.length || 0} Complete Subjects
                  </span>
                  {access.hasAccess && (
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 backdrop-blur-md flex items-center gap-1 shadow-xs">
                      <CheckCircle2 size={13} className="text-emerald-400" /> Unlocked & Active
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  {bundle.title}
                </h1>

                <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
                  {bundle.description ||
                    `Master your entire Semester ${bundle.semesterNumber} curriculum. Get complete unit-by-unit video lectures, chapter notes, and exam revision guides across all subjects in this semester.`}
                </p>

                {/* Key Metrics Banner */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-white/70 font-bold">Subjects</span>
                    <span className="text-xl sm:text-2xl font-black text-white">{bundle.subjects?.length || 0}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-white/70 font-bold">Video Lectures</span>
                    <span className="text-xl sm:text-2xl font-black text-white">{bundle.totalVideos || 0}+</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-white/70 font-bold">Notes & PDFs</span>
                    <span className="text-xl sm:text-2xl font-black text-white">{bundle.totalResources || 0}+</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Access Granted Notification Banner */}
            {access.hasAccess && (
              <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-start gap-4">
                <div className="p-2 rounded-2xl bg-emerald-500 text-white shrink-0 mt-0.5">
                  <Unlock size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-300">
                    You have full access to this Semester Bundle!
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                    {access.isLifetime
                      ? 'You have Lifetime Access to all mapped subject video lectures, units, and notes in this semester.'
                      : access.expiresAt
                      ? `Active 6-Month Plan valid until ${new Date(access.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`
                      : 'All subjects, video lessons, and revision materials below are fully unlocked for you.'}
                  </p>
                </div>
              </div>
            )}

            {/* Included Subject Bundles Section */}
            <div id="included-subjects" className="space-y-4 scroll-mt-28">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2">
                    <Package size={20} className="text-brand-text dark:text-white" />
                    Included Subject Bundles ({bundle.subjects?.length || 0})
                  </h2>
                  <p className="text-xs text-brand-muted mt-0.5">
                    Click on any subject to preview its syllabus units and lectures.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {bundle.subjects?.map((subj) => {
                  const isExpanded = expandedSubjectId === subj.subjectId
                  const units = subj.subjectId ? curriculumCache[subj.subjectId] : []
                  const isLoadingCurr = loadingCurriculumSubjectId === subj.subjectId

                  return (
                    <div
                      key={subj.id}
                      className="rounded-2xl border border-brand-border bg-white dark:bg-brand-dark-card overflow-hidden transition-all shadow-xs"
                    >
                      {/* Subject Header Row */}
                      <div
                        onClick={() => subj.subjectId && toggleSubjectSyllabus(subj.subjectId)}
                        className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30 flex items-center justify-center shrink-0">
                            <BookOpen size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm sm:text-base font-bold text-brand-text dark:text-brand-dark-text truncate">
                                {subj.subjectName}
                              </h3>
                              {subj.subjectCode && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-brand-muted">
                                  {subj.subjectCode}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-brand-muted mt-0.5">
                              {subj.videoCount || 0} Video Lectures · {subj.resourceCount || 0} Revision Notes
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Link
                            to={`/subject-bundles/${subj.subjectId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
                          >
                            Subject View <ExternalLink size={12} />
                          </Link>
                          <button
                            type="button"
                            className="p-1 rounded-lg text-brand-muted hover:text-brand-text"
                          >
                            <ChevronDown
                              size={18}
                              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-violet-600' : ''}`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Syllabus Preview */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-brand-border bg-gray-50/50 dark:bg-black/20 p-4 sm:p-5 space-y-4"
                          >
                            {isLoadingCurr ? (
                              <div className="py-6 text-center text-xs text-brand-muted flex items-center justify-center gap-2">
                                <Loader2 size={16} className="animate-spin text-violet-600" />
                                Loading units & video lectures...
                              </div>
                            ) : units && units.length > 0 ? (
                              <div className="space-y-3">
                                {units.map((unit) => (
                                  <div key={unit.id} className="p-3 rounded-xl bg-white dark:bg-brand-dark-card border border-brand-border">
                                    <h4 className="text-xs font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 text-[10px] font-black flex items-center justify-center">
                                        {unit.unitNumber}
                                      </span>
                                      {unit.title}
                                    </h4>
                                    {unit.videos && unit.videos.length > 0 && (
                                      <div className="mt-2 space-y-1 pl-7">
                                        {unit.videos.slice(0, 4).map((v) => (
                                          <div key={v.id} className="flex items-center justify-between text-xs text-brand-muted py-0.5">
                                            <span className="truncate flex items-center gap-1.5">
                                              <Play size={10} className="text-violet-500 shrink-0" /> {v.title}
                                            </span>
                                            {v.duration && <span className="text-[10px] opacity-70 shrink-0">{v.duration}</span>}
                                          </div>
                                        ))}
                                        {unit.videos.length > 4 && (
                                          <p className="text-[10px] font-semibold text-violet-600 pt-1">
                                            + {unit.videos.length - 4} more lecture(s) in this unit
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-brand-muted italic text-center py-3">
                                Detailed syllabus units will appear here once loaded.
                              </p>
                            )}

                            <div className="flex justify-end pt-2">
                              <Link
                                to={`/subject-bundles/${subj.subjectId}`}
                                className="inline-flex items-center gap-1.5 btn-primary text-xs py-2 px-4 shadow-xs"
                              >
                                Open Full {subj.subjectName} Page <ArrowLeft size={12} className="rotate-180" />
                              </Link>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Column (Sticky Pricing & Enrollment Card) */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-24 space-y-5">
            {access.hasAccess ? (
              <div className="rounded-3xl border-2 border-emerald-500/30 bg-white dark:bg-brand-dark-card p-6 shadow-xl space-y-6 relative overflow-hidden">
                {/* Top decorative accent line */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

                {/* Status Header */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Enrolled & Active
                  </div>
                  <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">
                    {access.isLifetime || access.planType === 'lifetime' ? 'Lifetime Plan' : '6-Month Plan'}
                  </span>
                </div>

                {/* Active Plan Detail Box */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-base">
                    <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>Full Semester Pack Unlocked</span>
                  </div>
                  {access.isLifetime || access.planType === 'lifetime' ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                      You have unlimited lifetime access with no expiration. All {bundle.subjects?.length || 0} subjects, masterclasses, and revision guides are unlocked.
                    </p>
                  ) : access.expiresAt ? (
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 space-y-0.5">
                      <p>Full access active for 6 months.</p>
                      <p className="font-mono text-[11px] opacity-90">
                        Expires: {new Date(access.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                      All video masterclasses, units, and curated revision notes are fully accessible.
                    </p>
                  )}
                </div>

                {/* What's Unlocked Checklist */}
                <div className="space-y-2.5 text-xs text-brand-muted dark:text-brand-dark-muted border-t border-b border-brand-border py-4">
                  <div className="flex items-center gap-2.5 text-brand-text dark:text-brand-dark-text font-semibold">
                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                    <span>All {bundle.subjects?.length || 0} Subject Bundles Unlocked</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                    <span>Full video lectures & unit walkthroughs</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                    <span>Handwritten notes, solved papers & PDFs</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                    <span>Full access on mobile, tablet & desktop</span>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      const subjectsElem = document.getElementById('included-subjects')
                      if (subjectsElem) {
                        subjectsElem.scrollIntoView({ behavior: 'smooth' })
                      } else {
                        const firstSubj = bundle.subjects?.[0]
                        if (firstSubj?.subjectId) {
                          navigate(`/subject-bundles/${firstSubj.subjectId}`)
                        }
                      }
                    }}
                    className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <BookOpen size={16} /> Explore Included Subjects
                  </button>

                  {bundle.subjects && bundle.subjects.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-2">
                        Quick Jump to Subject:
                      </p>
                      <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                        {bundle.subjects.map((subj) => (
                          <Link
                            key={subj.id}
                            to={`/subject-bundles/${subj.subjectId}`}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-semibold text-brand-text dark:text-brand-dark-text border border-brand-border transition-all group"
                          >
                            <span className="truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                              {subj.subjectName}
                            </span>
                            <ArrowLeft size={13} className="rotate-180 text-brand-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-brand-border bg-white dark:bg-brand-dark-card p-6 shadow-xl space-y-6">
                
                {/* Plan Switcher */}
                {bundle.sixMonthEnabled && bundle.lifetimeEnabled ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted mb-2">
                      Select Access Plan
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-gray-100 dark:bg-white/5 border border-brand-border">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan('six_month')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                          selectedPlan === 'six_month'
                            ? 'bg-white dark:bg-brand-dark-card text-brand-text dark:text-white shadow-sm'
                            : 'text-brand-muted hover:text-brand-text'
                        }`}
                      >
                        6-Month Plan
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPlan('lifetime')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all relative ${
                          selectedPlan === 'lifetime'
                            ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black shadow-sm'
                            : 'text-brand-muted hover:text-brand-text'
                        }`}
                      >
                        Lifetime Plan
                        <span className="absolute -top-2 right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-400 text-black">
                          BEST
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted mb-1.5">
                      Access Plan
                    </label>
                    <div className="p-3 rounded-2xl bg-gray-100/80 dark:bg-white/5 border border-brand-border flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-text dark:text-white">
                        {bundle.lifetimeEnabled ? 'Lifetime Access Plan' : '6-Month Access Plan'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                        {bundle.lifetimeEnabled ? 'Unlimited Access' : 'Semester Prep'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Price & Savings Display */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-brand-border space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-brand-text dark:text-white">
                        ₹{pricing.finalAmount}
                      </span>
                      {benchmarkPrice > pricing.finalAmount && (
                        <span className="ml-2 text-sm line-through text-brand-muted">
                          ₹{benchmarkPrice}
                        </span>
                      )}
                    </div>
                    {savingsPercent > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Save {savingsPercent}%
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-brand-muted">
                    {selectedPlan === 'lifetime' ? 'Unlimited lifetime access with updates' : 'Full access for 6 months'}
                  </p>

                  {savingsAmount > 0 && (
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-brand-border flex items-center gap-1">
                      <Sparkles size={12} /> You save ₹{savingsAmount} compared to individual subject bundles!
                    </p>
                  )}
                </div>

                {/* Coupon input */}
                <div>
                  <label className="block text-xs font-semibold text-brand-muted mb-1.5">
                    Have a Coupon Code?
                  </label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/30 text-xs">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <Tag size={13} /> {appliedCoupon} applied (-₹{pricing.couponDiscountAmount})
                      </span>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-xs font-bold text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE"
                        className="input text-xs uppercase font-bold flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-bold disabled:opacity-40"
                      >
                        {couponLoading ? <Loader2 size={13} className="animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {couponError}
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                {access.isPending ? (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-center">
                    <span className="block text-xs font-bold text-amber-700 dark:text-amber-300">
                      ⏳ Payment Pending Approval
                    </span>
                    <span className="block text-[11px] text-amber-600/90 dark:text-amber-400/80 mt-0.5">
                      Your verification proof is under admin review. Access will activate shortly.
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        toast.error('Please sign in or register to purchase')
                        navigate('/login')
                        return
                      }
                      setShowCheckoutModal(true)
                    }}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#0A0A0A] hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:-translate-y-0.5"
                  >
                    <GraduationCap size={18} /> Enroll in Entire Semester (₹{pricing.finalAmount})
                  </button>
                )}

                {/* Trust Badges */}
                <div className="space-y-2 pt-2 border-t border-brand-border text-xs text-brand-muted">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500" />
                    <span>Unlocks all {bundle.subjects?.length || 0} Subject Bundles instantly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500" />
                    <span>Full access on mobile, tablet & desktop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500" />
                    <span>Manual UPI payment with fast 1-click verification</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Manual UPI Payment Modal */}
      <AnimatePresence>
        {showCheckoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-brand-dark-card border border-brand-border rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="p-5 border-b border-brand-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600">
                    <GraduationCap size={20} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text">
                      {step === 'submitted' ? 'Payment Submitted' : 'Enroll in Semester Bundle'}
                    </h3>
                    <p className="text-[11px] text-brand-muted truncate max-w-xs">
                      {bundle.title} · {selectedPlan === 'lifetime' ? 'Lifetime Access' : '6-Month Plan'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="p-1.5 text-brand-muted hover:text-brand-text rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[80vh] space-y-5">
                {step === 'submitted' ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                      <CheckCircle2 size={32} />
                    </div>
                    <h4 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">
                      Payment Proof Received!
                    </h4>
                    <p className="text-xs text-brand-muted max-w-sm mx-auto leading-relaxed">
                      Your payment of <strong>₹{pricing.finalAmount}</strong> is submitted with UTR: <strong>{utrNumber}</strong>. Our admin team will verify it and activate your complete semester access shortly.
                    </p>
                    <button
                      onClick={() => setShowCheckoutModal(false)}
                      className="btn-primary text-xs py-2 px-6 mt-4 inline-flex"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Amount to pay banner */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-brand-border flex items-center justify-between">
                      <div>
                        <span className="text-[11px] uppercase font-bold text-brand-muted">Total Payable</span>
                        <p className="text-2xl font-black text-brand-text dark:text-white">₹{pricing.finalAmount}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white dark:bg-brand-dark-card border border-brand-border">
                        {selectedPlan === 'lifetime' ? 'Lifetime Access' : '6 Months'}
                      </span>
                    </div>

                    {/* UPI Details & QR */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-brand-border text-center space-y-3">
                      {paymentSettings.qrCodeUrl ? (
                        <img
                          src={paymentSettings.qrCodeUrl}
                          alt="UPI QR Code"
                          className="w-40 h-40 object-contain mx-auto rounded-xl border bg-white p-1"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-xl bg-white dark:bg-brand-dark-card border mx-auto flex items-center justify-center text-brand-muted">
                          <QrCode size={48} />
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-2">
                        <code className="text-xs font-mono font-bold bg-white dark:bg-brand-dark-card px-3 py-1.5 rounded-xl border">
                          {paymentSettings.upiId}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(paymentSettings.upiId)
                            setCopiedUpi(true)
                            setTimeout(() => setCopiedUpi(false), 2000)
                            toast.success('UPI ID copied!')
                          }}
                          className="p-1.5 rounded-xl border hover:bg-gray-100 text-xs font-semibold flex items-center gap-1"
                        >
                          {copiedUpi ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-brand-muted">Pay via GPay, PhonePe, Paytm, or any UPI app</p>
                    </div>

                    {/* Student Info inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-brand-muted mb-1">First Name *</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="input text-xs w-full"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-brand-muted mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="input text-xs w-full"
                          placeholder="10-digit mobile"
                        />
                      </div>
                    </div>

                    {/* UTR Input */}
                    <div>
                      <label className="block text-xs font-bold text-brand-text dark:text-brand-dark-text mb-1">
                        UPI Reference / UTR Number (12 Digits) *
                      </label>
                      <input
                        type="text"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        placeholder="e.g. 423456789012"
                        className="input text-xs w-full font-mono font-bold"
                      />
                      <p className="text-[10px] text-brand-muted mt-1">Found in your payment app transaction history</p>
                    </div>

                    {/* Screenshot Receipt Upload */}
                    <div>
                      <label className="block text-xs font-semibold text-brand-muted mb-1">
                        Payment Screenshot / Receipt (Optional)
                      </label>
                      <label className="flex flex-col items-center justify-center p-3 rounded-2xl border border-dashed border-brand-border cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
                        {screenshotUrl ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                            <CheckCircle2 size={16} /> Screenshot Attached
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-brand-muted">
                            <Upload size={14} /> Upload receipt screenshot
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>

                    {/* Submit CTA */}
                    <button
                      type="button"
                      onClick={handleSubmitPayment}
                      disabled={submitting || uploadingReceipt}
                      className="w-full py-3 px-5 rounded-xl btn-primary text-xs font-bold flex items-center justify-center gap-2 shadow-md"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      Submit Payment Verification (₹{pricing.finalAmount})
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
