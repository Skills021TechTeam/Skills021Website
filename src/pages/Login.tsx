import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Lock,
  Zap,
  Eye,
  EyeOff,
  AlertCircle,
  Timer,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  UserPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore, checkRateLimit, clearRateLimit } from '../store/authStore'
import { resetPasswordForEmail, resendVerificationEmail } from '../lib/supabase'
import { lookupUserPublicProfile } from '../lib/accountLookup'
import ForgotPasswordModal from '../components/ForgotPasswordModal'
import Logo from '../components/Logo'

type LoginStep = 'email' | 'password'

interface UserProfilePreview {
  name: string
  avatarUrl: string
  role: 'user' | 'admin'
  isAdmin: boolean
  isCached: boolean
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function Login() {
  const [step, setStep] = useState<LoginStep>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resolvingProfile, setResolvingProfile] = useState(false)
  const [profilePreview, setProfilePreview] = useState<UserProfilePreview | null>(null)
  const [avatarImageSrc, setAvatarImageSrc] = useState<string>('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resendingVerification, setResendingVerification] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [accountNotFound, setAccountNotFound] = useState(false)

  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resendCooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const { loginWithSupabase, isAuthenticated, user, isAdminAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Automatically redirect away if already logged in
  useEffect(() => {
    if (isAuthenticated || isAdminAuthenticated) {
      const fromState = (location.state as any)?.from
      const targetPath = fromState?.pathname || (user?.role === 'admin' || isAdminAuthenticated ? '/admin' : '/dashboard')
      const targetSearch = fromState?.search || ''
      navigate(targetPath + targetSearch, { replace: true })
    }
  }, [isAuthenticated, isAdminAuthenticated, user, navigate, location])

  // Check URL parameters or navigation state for verified flag & pre-filled email
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    if (searchParams.get('verified') === 'true' || location.hash.includes('type=signup')) {
      toast.success('Email verified successfully! Please sign in.', { duration: 5000, id: 'email-verified' })
    }
    const prefilled = (location.state as any)?.prefillEmail
    if (prefilled && typeof prefilled === 'string') {
      setEmail(prefilled)
    }
  }, [location])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) {
      if (resendCooldownTimerRef.current) {
        clearInterval(resendCooldownTimerRef.current)
        resendCooldownTimerRef.current = null
      }
      return
    }

    resendCooldownTimerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          if (resendCooldownTimerRef.current) clearInterval(resendCooldownTimerRef.current)
          resendCooldownTimerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (resendCooldownTimerRef.current) clearInterval(resendCooldownTimerRef.current)
    }
  }, [resendCooldown])

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) {
      if (lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current)
        lockoutTimerRef.current = null
      }
      return
    }

    lockoutTimerRef.current = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current)
          lockoutTimerRef.current = null
          setErrors({})
          if (email) {
            const rl = checkRateLimit(email)
            if (!rl.blocked) {
              setAttemptsLeft(rl.attemptsLeft)
            }
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current)
      }
    }
  }, [lockoutSeconds, email])

  const syncRateLimitForEmail = (targetEmail: string) => {
    if (!targetEmail) return
    const rl = checkRateLimit(targetEmail)
    if (rl.blocked && rl.remainingMs > 0) {
      const secs = Math.ceil(rl.remainingMs / 1000)
      setLockoutSeconds(secs)
      setAttemptsLeft(0)
    } else {
      setLockoutSeconds(0)
      setAttemptsLeft(rl.attemptsLeft < 3 ? rl.attemptsLeft : null)
    }
  }

  // Handle Step 1: Email Validation & Account / Avatar Lookup
  const handleEmailNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanEmail = email.trim()

    if (!cleanEmail) {
      setErrors({ email: 'Email is required' })
      setAccountNotFound(false)
      return
    }
    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      setErrors({ email: 'Enter a valid email address' })
      setAccountNotFound(false)
      return
    }

    setErrors({})
    setAccountNotFound(false)
    setResolvingProfile(true)
    syncRateLimitForEmail(cleanEmail)

    try {
      const profile = await lookupUserPublicProfile(cleanEmail)
      if (!profile.exists) {
        setAccountNotFound(true)
        setErrors({ email: 'No account exists with this email' })
        return
      }

      setAccountNotFound(false)
      setProfilePreview(profile)
      setAvatarImageSrc(profile.avatarUrl || '')
      setStep('password')
      setTimeout(() => {
        passwordInputRef.current?.focus()
      }, 120)
    } catch {
      setAccountNotFound(true)
      setErrors({ email: 'No account exists with this email' })
    } finally {
      setResolvingProfile(false)
    }
  }

  // Handle Step 2: Password Submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim()
    const isLocked = lockoutSeconds > 0

    if (isLocked) {
      toast.error(`Locked. Try again in ${formatCountdown(lockoutSeconds)}`)
      return
    }

    if (!password) {
      setErrors({ password: 'Password is required' })
      return
    }

    setErrors({})
    setLoading(true)

    // Check if input matches admin credentials
    if (profilePreview?.isAdmin) {
      const adminResult = await useAuthStore.getState().adminLogin(cleanEmail, password)
      if (adminResult.success) {
        clearRateLimit(cleanEmail)
        setAttemptsLeft(null)
        setLockoutSeconds(0)
        setErrors({})
        setLoading(false)
        toast.success('Admin verified 🎉', { duration: 2000 })
        navigate('/admin', { replace: true })
        return
      }
    }

    // Attempt regular Supabase login
    const result = await loginWithSupabase(cleanEmail, password)
    setLoading(false)

    if (result.success) {
      setUnverifiedEmail(null)
      clearRateLimit(cleanEmail)
      setAttemptsLeft(null)
      setLockoutSeconds(0)
      setErrors({})
      toast.success('Welcome back! 🎉', { duration: 2000 })
      const currentUser = useAuthStore.getState().user
      if (currentUser?.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        const fromState = (location.state as any)?.from
        const targetPath = fromState?.pathname || '/dashboard'
        const targetSearch = fromState?.search || ''
        navigate(targetPath + targetSearch, { replace: true })
      }
      return
    } else {
      if (result.isUnverifiedEmail) {
        setUnverifiedEmail(cleanEmail)
        setErrors({
          password: 'Email unverified. Check your inbox.',
        })
        toast.error('Please verify your email before logging in.', { duration: 4500 })
        return
      }

      setUnverifiedEmail(null)
      const rl = result.rateLimitInfo
      if (rl?.blocked && rl.remainingMs > 0) {
        const secs = Math.ceil(rl.remainingMs / 1000)
        setLockoutSeconds(secs)
        setAttemptsLeft(0)
        setErrors({
          password: `Locked (${formatCountdown(secs)} left)`,
        })
        toast.error(`Account locked for ${secs}s (3 failed attempts).`)
      } else {
        const left = rl?.attemptsLeft ?? null
        setAttemptsLeft(left)
        setErrors({ password: 'Incorrect password' })
        if (left !== null && left <= 2 && left > 0) {
          toast.error(`Incorrect password (${left} attempt${left === 1 ? '' : 's'} remaining before lockout)`)
        } else {
          toast.error(result.error || 'Incorrect password')
        }
      }
    }
  }

  const handleResendVerification = async () => {
    const target = unverifiedEmail || email
    if (!target || resendingVerification || resendCooldown > 0) return
    setResendingVerification(true)
    try {
      await resendVerificationEmail(target.trim())
      setResendCooldown(60)
      toast.success('Verification link resent to your email! 📩', { duration: 4000 })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resend email.')
    } finally {
      setResendingVerification(false)
    }
  }

  // Switch Account / Return to Step 1
  const handleSwitchAccount = () => {
    setStep('email')
    setPassword('')
    setErrors({})
    setAvatarImageSrc('')
    setTimeout(() => {
      emailInputRef.current?.focus()
    }, 120)
  }

  // Handle Forgot Password
  const handleForgotPassword = () => {
    setIsForgotModalOpen(true)
  }

  const handleGoogleClick = () => {
    toast('Google OAuth coming soon! 🚀', { icon: '🔜', duration: 2000 })
  }

  const isLocked = lockoutSeconds > 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c0d14] flex items-center justify-center px-4 pt-16 pb-12 selection:bg-primary-500 selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-[400px]"
      >
        {/* Minimalist Card Container */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none">
          {/* Brand Header */}
          <div className="flex items-center justify-between mb-5">
            <Logo size="sm" />

            <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
              {step === 'email' ? '1 of 2' : '2 of 2'}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {/* ══════════════════════════════════════════════════════════════════
                STEP 1: EMAIL INPUT (MINIMAL)
            ══════════════════════════════════════════════════════════════════ */}
            {step === 'email' ? (
              <motion.div
                key="step-email"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
              >
                <div className="mb-5">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Sign in
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    to continue to your account
                  </p>
                </div>

                {(location.state as any)?.from && (
                  <div className="mb-4 rounded-xl border border-violet-200/80 bg-violet-50/70 p-3 text-left dark:border-violet-900/40 dark:bg-violet-950/25 flex items-start gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm">
                      <ShieldCheck size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-violet-900 dark:text-violet-200 uppercase tracking-wider">
                        Sign in required
                      </div>
                      <div className="mt-0.5 text-xs text-violet-700 dark:text-violet-300/80">
                        Sign in with your Skills021 account to access this section.
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleEmailNext} className="space-y-3.5" noValidate>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                        Email address
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 hover:underline cursor-pointer"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Mail
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none"
                      />
                      <input
                        ref={emailInputRef}
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={e => {
                          setEmail(e.target.value)
                          if (errors.email) setErrors({})
                          if (accountNotFound) setAccountNotFound(false)
                        }}
                        placeholder="name@gmail.com"
                        disabled={resolvingProfile}
                        autoComplete="username"
                        autoFocus
                        className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                          errors.email
                            ? 'border-red-500'
                            : 'border-slate-200 dark:border-zinc-800'
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1 font-medium">
                        <AlertCircle size={12} /> {errors.email}
                      </p>
                    )}

                    {/* Account Not Found Notice Card with Create Account CTA */}
                    {accountNotFound && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2.5 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs space-y-2"
                      >
                        <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300 font-medium">
                          <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                          <div>
                            <p className="font-semibold text-xs text-amber-800 dark:text-amber-200">
                              Account doesn't exist
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                              No account is associated with <span className="font-semibold text-slate-900 dark:text-zinc-200">{email}</span>.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/register', { state: { prefillEmail: email.trim() } })}
                          className="w-full py-2 px-3 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <UserPlus size={13} />
                          <span>Create Free Account</span>
                          <ArrowRight size={13} />
                        </button>
                      </motion.div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={resolvingProfile}
                    className="w-full mt-1 py-2.5 px-4 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {resolvingProfile ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Next</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </form>

                {/* Minimal Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100 dark:border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 text-[11px] text-slate-400 dark:text-zinc-500 bg-white dark:bg-zinc-900">
                      or
                    </span>
                  </div>
                </div>

                {/* Google Sign-in Option */}
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="w-full py-2.5 px-3 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 rounded-xl text-xs font-medium text-slate-700 dark:text-zinc-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <p className="text-center text-xs text-slate-500 dark:text-zinc-400 mt-5">
                  No account?{' '}
                  <Link
                    to="/register"
                    className="text-primary-500 font-semibold hover:underline"
                  >
                    Create one
                  </Link>
                </p>
              </motion.div>
            ) : (
              /* ══════════════════════════════════════════════════════════════════
                  STEP 2: AVATAR + PASSWORD (MINIMAL)
              ══════════════════════════════════════════════════════════════════ */
              <motion.div
                key="step-password"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.18 }}
              >
                {/* Minimal Header & Avatar Greeting */}
                <div className="flex flex-col items-center text-center mb-5">
                  {(avatarImageSrc || profilePreview?.avatarUrl) ? (
                    <div className="relative mb-2.5">
                      <div className="w-16 h-16 rounded-full p-0.5 border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 shadow-sm overflow-hidden">
                        <img
                          src={avatarImageSrc || profilePreview?.avatarUrl}
                          alt={profilePreview?.name || 'User Avatar'}
                          onError={() => {
                            setAvatarImageSrc('')
                            if (profilePreview) {
                              setProfilePreview({ ...profilePreview, avatarUrl: '' })
                            }
                          }}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>

                      {profilePreview?.isAdmin && (
                        <div
                          className="absolute bottom-0 right-0 p-0.5 bg-zinc-950 rounded-full border border-teal-400 text-teal-400"
                          title="Admin"
                        >
                          <ShieldCheck size={12} />
                        </div>
                      )}
                    </div>
                  ) : profilePreview?.isAdmin ? (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-semibold mb-2">
                      <ShieldCheck size={13} />
                      Admin
                    </div>
                  ) : null}

                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {profilePreview?.name || 'Welcome back'}
                  </h2>

                  {/* Clean email + switch account */}
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                    <span className="max-w-[200px] truncate">{email}</span>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleSwitchAccount}
                      className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Minimalist Lockout Alert */}
                {isLocked && (
                  <div className="mb-3.5 py-2 px-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5">
                      <Timer size={13} className="animate-spin-slow text-amber-500" />
                      Locked (3 failed attempts)
                    </span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                      {formatCountdown(lockoutSeconds)}
                    </span>
                  </div>
                )}

                {/* Unverified Email Warning Card */}
                {unverifiedEmail && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3.5 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs space-y-2"
                  >
                    <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300 font-medium">
                      <Mail size={15} className="shrink-0 mt-0.5 text-amber-500" />
                      <div>
                        <p className="font-semibold text-xs text-amber-800 dark:text-amber-200">Email Verification Required</p>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          We sent a link to <span className="font-semibold text-slate-900 dark:text-zinc-200">{unverifiedEmail}</span>. Please verify to log in.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendingVerification || resendCooldown > 0}
                      className="w-full py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={resendingVerification ? 'animate-spin' : ''} />
                      {resendingVerification ? (
                        'Sending…'
                      ) : resendCooldown > 0 ? (
                        `Resend in ${resendCooldown}s`
                      ) : (
                        'Resend Verification Email'
                      )}
                    </button>
                  </motion.div>
                )}

                {/* Password Form */}
                <form onSubmit={handlePasswordSubmit} className="space-y-3.5" noValidate>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 hover:underline cursor-pointer"
                      >
                        Forgot?
                      </button>
                    </div>

                    <div className="relative">
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none"
                      />
                      <input
                        ref={passwordInputRef}
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => {
                          setPassword(e.target.value)
                          if (errors.password) setErrors({})
                        }}
                        placeholder="••••••••••••"
                        disabled={isLocked || loading}
                        autoComplete="current-password"
                        autoFocus
                        className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all disabled:opacity-50 ${
                          errors.password
                            ? 'border-red-500'
                            : 'border-slate-200 dark:border-zinc-800'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        disabled={isLocked || loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    {/* Minimal Inline Error */}
                    {errors.password && (
                      <div className="mt-1.5 text-xs text-red-500 flex items-center justify-between font-medium">
                        <span className="flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" />
                          {errors.password}
                        </span>
                        {attemptsLeft !== null && attemptsLeft > 0 && attemptsLeft <= 2 && !isLocked && (
                          <span className="text-[11px] font-mono text-red-600 dark:text-red-400 font-semibold shrink-0">
                            {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={handleSwitchAccount}
                      disabled={loading}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-medium text-slate-600 dark:text-zinc-400 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft size={13} />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      id="login-submit"
                      disabled={loading || isLocked}
                      className="flex-1 py-2.5 px-4 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : isLocked ? (
                        <span>Locked ({formatCountdown(lockoutSeconds)})</span>
                      ) : (
                        <span>Sign In</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Forgot Password CAPTCHA Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        initialEmail={email}
        onClose={() => setIsForgotModalOpen(false)}
        onSuccess={(sentEmail) => {
          if (!email && sentEmail) {
            setEmail(sentEmail)
          }
        }}
      />
    </div>
  )
}
