import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Zap,
  AlertCircle,
  School,
  Phone,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Inbox,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { resendVerificationEmail } from '../lib/supabase'
import Logo from '../components/Logo'

const colleges = [
  'AKTU-affiliated',
  'IPU-affiliated',
  'Delhi University',
  'IIT',
  'NIT',
  'IIIT',
  'Other',
]

// ── Password strength scorer ──────────────────────────────────────────────────
type StrengthLevel = 'too-short' | 'weak' | 'fair' | 'strong' | 'very-strong'
interface PasswordStrength {
  level: StrengthLevel
  score: number   // 0–4
  label: string
  color: string
  hint: string
}

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return { level: 'too-short', score: 0, label: '', color: '', hint: '' }
  if (password.length < 8) return { level: 'too-short', score: 0, label: 'Too short', color: 'bg-red-500', hint: 'Must be at least 8 characters' }

  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { level: 'weak',      score: 1, label: 'Weak',      color: 'bg-red-500',    hint: 'Add uppercase letters, numbers, or symbols' }
  if (score === 2) return { level: 'fair',      score: 2, label: 'Fair',      color: 'bg-amber-500',  hint: 'Add a symbol or more characters' }
  if (score === 3) return { level: 'strong',    score: 3, label: 'Strong',    color: 'bg-emerald-500', hint: 'Great! You can make it even stronger' }
  return               { level: 'very-strong', score: 4, label: 'Very Strong', color: 'bg-teal-500',   hint: 'Excellent password! 🛡️' }
}

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    college: '',
    agreed: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { registerWithSupabase, isAuthenticated, user, isAdminAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const prefill = (location.state as any)?.prefillEmail
    if (prefill && typeof prefill === 'string') {
      setForm(prev => ({ ...prev, email: prefill }))
    }
  }, [location])

  useEffect(() => {
    if (isAuthenticated || isAdminAuthenticated) {
      navigate(user?.role === 'admin' || isAdminAuthenticated ? '/admin' : '/dashboard', { replace: true })
    }
  }, [isAuthenticated, isAdminAuthenticated, user, navigate])

  // Countdown timer for resending verification email
  useEffect(() => {
    if (resendCooldown <= 0) {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current)
        cooldownTimerRef.current = null
      }
      return
    }

    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
          cooldownTimerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    }
  }, [resendCooldown])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Full name is required'
    else if (form.name.trim().length < 3) errs.name = 'Name must be at least 3 characters'
    if (!form.email) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address'
    if (!form.phone.trim()) errs.phone = 'Phone number is required'
    else if (!/^\d{10}$/.test(form.phone.trim())) errs.phone = 'Enter a valid 10-digit phone number'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters'
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Password must contain at least one uppercase letter'
    else if (!/[0-9]/.test(form.password)) errs.password = 'Password must contain at least one number'
    else if (!/[^A-Za-z0-9]/.test(form.password)) errs.password = 'Password must contain at least one special character (!@#$…)'
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password'
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match'
    if (!form.college) errs.college = 'Please select your college affiliation'
    if (!form.agreed) errs.agreed = 'Please accept the Terms and Privacy Policy'
    return errs
  }

  const handleChange = (field: string, value: string | boolean) => {
    let nextValue = value

    if (field === 'phone' && typeof value === 'string') {
      nextValue = value.replace(/\D/g, '').slice(0, 10)
    }

    setForm((prev) => ({ ...prev, [field]: nextValue }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setLoading(true)

    const result = await registerWithSupabase({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
      college: form.college,
    })

    setLoading(false)

    if (result.success) {
      setIsRegistered(true)
      setResendCooldown(60)
      toast.success('Registration successful! Please verify your email.', { duration: 5000 })
    } else {
      const errorMsg = result.error || 'Registration failed or account with this email already exists.'
      toast.error(errorMsg)
      setErrors({ email: errorMsg })
    }
  }

  const handleResend = async () => {
    if (!form.email || resendCooldown > 0 || resending) return
    setResending(true)
    try {
      await resendVerificationEmail(form.email.trim())
      setResendCooldown(60)
      toast.success('Verification link resent! Check your inbox 📩', { duration: 4000 })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resend email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg flex items-center justify-center px-4 pt-20 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="card p-8">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <Logo size="md" />
            </div>

            {isRegistered ? (
              <div>
                <h1 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Verify your email</h1>
                <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-1">One last step to activate your account</p>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Create your account</h1>
                <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-1">Join 12,000+ students on Skills021</p>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {isRegistered ? (
              /* ══════════════════════════════════════════════════════════════════
                 EMAIL VERIFICATION SCREEN (POST-REGISTRATION)
              ══════════════════════════════════════════════════════════════════ */
              <motion.div
                key="verification-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 text-center"
              >
                {/* Visual Badge */}
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 bg-primary-500/20 dark:bg-primary-500/30 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-20 h-20 bg-gradient-to-tr from-primary-500 to-teal-400 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-500/20 mx-auto">
                    <Inbox size={36} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-zinc-900 rounded-full border border-emerald-500 text-emerald-500 shadow">
                    <CheckCircle2 size={16} />
                  </div>
                </div>

                {/* Information */}
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-brand-text dark:text-brand-dark-text">
                    Check your inbox
                  </h3>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted leading-relaxed max-w-sm mx-auto">
                    We've sent a verification link to{' '}
                    <span className="font-semibold text-brand-text dark:text-white underline decoration-primary-500/50">
                      {form.email}
                    </span>
                    . Please verify your email before logging in.
                  </p>
                </div>

                {/* Guidance Tips */}
                <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-brand-border dark:border-brand-dark-border text-left space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-text dark:text-brand-dark-text">
                    <Sparkles size={14} className="text-primary-500" />
                    <span>Next steps:</span>
                  </div>
                  <ol className="text-[11px] text-brand-muted dark:text-brand-dark-muted space-y-1 list-decimal list-inside pl-1">
                    <li>Open the email sent from Skills021.</li>
                    <li>Click the <strong>Confirm your email</strong> link.</li>
                    <li>Return here to sign in to your dashboard.</li>
                  </ol>
                </div>

                {/* Primary Sign In Button */}
                <button
                  type="button"
                  onClick={() => navigate('/login', { state: { prefillEmail: form.email } })}
                  className="w-full py-3 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Go to Sign In</span>
                  <ArrowRight size={14} />
                </button>

                {/* Resend Action */}
                <div className="pt-1 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || resendCooldown > 0}
                    className="inline-flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                    {resending ? (
                      'Resending email…'
                    ) : resendCooldown > 0 ? (
                      `Resend link in ${resendCooldown}s`
                    ) : (
                      'Resend verification link'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRegistered(false)}
                    className="text-[11px] text-brand-muted hover:text-brand-text dark:hover:text-brand-dark-text transition-colors cursor-pointer"
                  >
                    Need to change your email? <span className="underline">Edit form</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ══════════════════════════════════════════════════════════════════
                 REGISTRATION FORM
              ══════════════════════════════════════════════════════════════════ */
              <motion.div
                key="registration-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        id="reg-name"
                        type="text"
                        value={form.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Rahul Sharma"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.name ? 'border-red-400' : 'border-brand-border dark:border-brand-dark-border'}`}
                      />
                    </div>
                    {errors.name && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/>{errors.name}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        id="reg-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="rahul@example.com"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.email ? 'border-red-400' : 'border-brand-border dark:border-brand-dark-border'}`}
                      />
                    </div>
                    {errors.email && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/>{errors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        id="reg-phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={form.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="9876543210"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.phone ? 'border-red-400' : 'border-brand-border dark:border-brand-dark-border'}`}
                      />
                    </div>
                    {errors.phone && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/>{errors.phone}</p>}
                  </div>

                  {/* College */}
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">College Affiliation</label>
                    <div className="relative">
                      <School size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <select
                        id="reg-college"
                        value={form.college}
                        onChange={(e) => handleChange('college', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none ${errors.college ? 'border-red-400' : 'border-brand-border dark:border-brand-dark-border'}`}
                      >
                        <option value="">Select your college</option>
                        {colleges.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {errors.college && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/>{errors.college}</p>}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        placeholder="Min 8 chars, uppercase, number & symbol"
                        autoComplete="new-password"
                        className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.password ? 'border-red-400' : 'border-brand-border dark:border-brand-dark-border'}`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted" tabIndex={-1}>
                        {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                    {/* Password Strength Meter */}
                    {form.password.length > 0 && (() => {
                      const strength = getPasswordStrength(form.password)
                      return (
                        <div className="mt-2 space-y-1.5">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map(level => (
                              <div
                                key={level}
                                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                  strength.score >= level ? strength.color : 'bg-gray-200 dark:bg-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            {strength.label && (
                              <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                                strength.level === 'very-strong' ? 'text-teal-500'
                                : strength.level === 'strong' ? 'text-emerald-500'
                                : strength.level === 'fair' ? 'text-amber-500'
                                : 'text-red-500'
                              }`}>
                                <ShieldCheck size={11} /> {strength.label}
                              </span>
                            )}
                            <span className="text-[10px] text-brand-muted dark:text-brand-dark-muted">{strength.hint}</span>
                          </div>
                        </div>
                      )
                    })()}
                    {errors.password && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/>{errors.password}</p>}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        id="reg-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        placeholder="Repeat your password"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.confirmPassword ? 'border-red-400' : 'border-brand-border dark:border-brand-dark-border'}`}
                      />
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/>{errors.confirmPassword}</p>}
                  </div>

                  {/* Terms Checkbox */}
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        id="reg-terms"
                        type="checkbox"
                        checked={form.agreed}
                        onChange={(e) => handleChange('agreed', e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-brand-border text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm text-brand-muted dark:text-brand-dark-muted">
                        I agree to the{' '}
                        <Link to="/" className="text-primary-500 hover:underline">Terms of Service</Link>{' '}
                        and{' '}
                        <Link to="/" className="text-primary-500 hover:underline">Privacy Policy</Link>
                      </span>
                    </label>
                    {errors.agreed && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/>{errors.agreed}</p>}
                  </div>

                  {/* Submit */}
                  <motion.button
                    id="register-submit"
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Create Account'
                    )}
                  </motion.button>
                </form>

                <p className="text-center text-sm text-brand-muted dark:text-brand-dark-muted mt-6">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary-500 font-semibold hover:underline">
                    Sign In
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
