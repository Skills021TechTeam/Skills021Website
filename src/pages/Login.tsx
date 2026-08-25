import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Zap, Eye, EyeOff, AlertCircle, Timer } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { resetPasswordForEmail } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const [forgotLoading, setForgotLoading] = useState(false)
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { loginWithSupabase } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

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
          clearInterval(lockoutTimerRef.current!)
          lockoutTimerRef.current = null
          setErrors({})
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current)
    }
  }, [lockoutSeconds])

  const isLocked = lockoutSeconds > 0

  const validate = () => {
    const errs: { email?: string; password?: string } = {}
    if (!email) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email address'
    if (!password) errs.password = 'Password is required'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLocked) return

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)

    // Check if input matches admin credentials
    const adminResult = await useAuthStore.getState().adminLogin(email.trim(), password)
    if (adminResult.success) {
      setLoading(false)
      toast.success('Admin Sign In Successful! 🎉', { duration: 2000 })
      navigate('/admin')
      return
    }

    const result = await loginWithSupabase(email.trim(), password)
    setLoading(false)

    if (result.success) {
      toast.success('Welcome back! 🎉', { duration: 2000 })
      const currentUser = useAuthStore.getState().user
      if (currentUser?.role === 'admin') {
        navigate('/admin')
      } else {
        const fromState = (location.state as any)?.from
        const targetPath = fromState?.pathname || '/dashboard'
        const targetSearch = fromState?.search || ''
        navigate(targetPath + targetSearch, { replace: true })
      }
    } else {
      const rl = result.rateLimitInfo
      if (rl?.blocked && rl.remainingMs > 0) {
        const secs = Math.ceil(rl.remainingMs / 1000)
        setLockoutSeconds(secs)
        setErrors({ email: `Too many failed attempts. Try again in ${secs}s.` })
        toast.error('Account temporarily locked due to too many failed attempts')
      } else {
        const left = rl?.attemptsLeft ?? null
        setAttemptsLeft(left)
        setErrors({ password: result.error || 'Invalid email or password.' })
        if (left !== null && left <= 2 && left > 0) {
          toast.error(`${left} attempt${left === 1 ? '' : 's'} remaining before lockout`)
        } else {
          toast.error(result.error || 'Invalid email or password.')
        }
      }
    }
  }

  const handleForgotPassword = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Enter your email address above first, then click Forgot password.' })
      return
    }
    setForgotLoading(true)
    try {
      await resetPasswordForEmail(email.trim())
      toast.success('Password reset email sent! Check your inbox.', { duration: 5000 })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reset email. Try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleGoogleClick = () => {
    toast('Google OAuth coming soon! 🚀', { icon: '🔜', duration: 2000 })
  }

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg flex items-center justify-center px-4 pt-20 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="card p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Zap size={22} className="text-white" />
              </div>
              <span className="text-2xl font-bold text-primary-500">Skills021</span>
            </Link>
            <h1 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Welcome back</h1>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-1">Sign in with your verified account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Lockout timer banner */}
            <AnimatePresence>
              {isLocked && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2 font-medium"
                >
                  <Timer size={14} className="shrink-0" />
                  <span>Account temporarily locked. Try again in <span className="font-mono font-bold">{lockoutSeconds}s</span>.</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attempt indicator */}
            {attemptsLeft !== null && attemptsLeft <= 4 && !isLocked && attemptsLeft > 0 && (
              <div className="flex gap-1.5 items-center">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i < 7 - attemptsLeft ? 'bg-red-400' : 'bg-gray-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
                <span className="text-[10px] text-brand-muted shrink-0 ml-1">{attemptsLeft} left</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLocked}
                  autoComplete="username"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all disabled:opacity-50 ${errors.email ? 'border-red-400' : 'border-brand-border dark:border-brand-dark-border'
                    }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="dynamic-button text-xs text-primary-500 hover:underline rounded-md px-1 disabled:opacity-60"
                >
                  {forgotLoading ? 'Sending…' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLocked}
                  autoComplete="current-password"
                  className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all disabled:opacity-50 ${errors.password ? 'border-red-400' : 'border-brand-border dark:border-brand-dark-border'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text dark:hover:text-brand-dark-text"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.password}
                </p>
              )}
            </div>

            {/* Login Button */}
            <motion.button
              id="login-submit"
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading || isLocked}
              className="w-full py-3.5 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isLocked ? (
                <>
                  <Timer size={16} /> Locked ({lockoutSeconds}s)
                </>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-border dark:border-brand-dark-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-brand-muted dark:text-brand-dark-muted bg-white dark:bg-brand-dark-card">
                or continue with
              </span>
            </div>
          </div>

          {/* Google OAuth (Placeholder) */}
          <button
            onClick={handleGoogleClick}
            className="w-full py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-medium text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2 opacity-70 cursor-not-allowed"
            disabled
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google (Coming Soon)
          </button>

          <p className="text-center text-sm text-brand-muted dark:text-brand-dark-muted mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-500 font-semibold hover:underline">
              Sign Up Free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
