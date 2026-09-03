import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, ArrowRight, AlertCircle, RefreshCw, KeyRound, Mail, Zap, Timer } from 'lucide-react'
import Logo from '../components/Logo'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function AdminLogin() {
  const [adminId, setAdminId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { adminLogin, isAdminAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()

  // Redirect if already authenticated as Admin
  useEffect(() => {
    if (isAdminAuthenticated || user?.role === 'admin') {
      navigate('/admin', { replace: true })
    }
  }, [isAdminAuthenticated, user, navigate])

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
          setErrorMsg('')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current)
    }
  }, [lockoutSeconds])

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminId.trim()) {
      setErrorMsg('Please enter your Admin Email or ID')
      return
    }
    if (!adminPassword) {
      setErrorMsg('Please enter your password')
      return
    }

    setErrorMsg('')
    setLoading(true)

    const result = await adminLogin(adminId.trim(), adminPassword)
    setLoading(false)

    if (result.success) {
      toast.success('Admin authentication verified', { duration: 2500 })
      navigate('/admin')
    } else {
      const rl = result.rateLimitInfo
      if (rl?.blocked && rl.remainingMs > 0) {
        const secs = Math.ceil(rl.remainingMs / 1000)
        setLockoutSeconds(secs)
        setErrorMsg(`Access temporarily locked. Please wait ${secs}s before retrying.`)
        toast.error('Too many failed attempts — locked temporarily')
      } else {
        const left = rl?.attemptsLeft ?? null
        setAttemptsLeft(left)
        if (left !== null && left <= 3 && left > 0) {
          setErrorMsg(`Invalid credentials. ${left} attempt${left === 1 ? '' : 's'} remaining.`)
        } else {
          setErrorMsg(result.error || 'Invalid administrator ID or password.')
        }
        toast.error('Authentication failed: Access denied')
      }
    }
  }

  const isLocked = lockoutSeconds > 0

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between relative overflow-hidden font-sans select-none selection:bg-white selection:text-black">

      {/* Top Header Bar */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between border-b border-zinc-900 bg-black/80 backdrop-blur-md">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <Logo size="sm" asLink={false} />
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
            Admin Portal
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-zinc-900"
          >
            <ArrowLeft size={14} />
            <span>Back to site</span>
          </Link>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-[430px]"
        >
          <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl relative">
            {/* Minimalist Top White Line */}
            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-zinc-400/30 to-transparent" />

            {/* Card Header */}
            <div className="mb-7 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-inner mb-4">
                <ShieldCheck size={22} />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Admin Console
              </h1>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Sign in with verified administrator credentials to access system controls.
              </p>
            </div>

            {/* Error & Warning Banners */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 p-3.5 rounded-xl text-xs flex items-start gap-2.5 font-medium border bg-zinc-900 border-zinc-700 text-zinc-200"
                >
                  {isLocked ? (
                    <Timer size={16} className="shrink-0 mt-0.5 text-zinc-300" />
                  ) : (
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-zinc-300" />
                  )}
                  <div className="flex-1 leading-relaxed">
                    <span>{errorMsg}</span>
                    {isLocked && (
                      <div className="mt-1 font-mono text-[11px] text-white font-semibold">
                        Lockout expires in: {lockoutSeconds}s
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Remaining Attempts Gauge */}
            {attemptsLeft !== null && attemptsLeft <= 4 && !isLocked && attemptsLeft > 0 && (
              <div className="mb-5 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Security threshold:</span>
                <span className="font-mono font-semibold text-zinc-200">
                  {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining
                </span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAdminSubmit} className="space-y-4" noValidate>
              {/* Admin ID / Email */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Admin Email or Username
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                  />
                  <input
                    id="admin-id-input"
                    type="text"
                    value={adminId}
                    onChange={e => setAdminId(e.target.value)}
                    placeholder="admin@skills021.com"
                    disabled={isLocked || loading}
                    autoComplete="username"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 bg-black border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Security Password
                  </label>
                </div>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                  />
                  <input
                    id="admin-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={isLocked || loading}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-2.5 bg-black border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    disabled={isLocked || loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* High-Contrast Solid White Button with Crisp Black Text */}
              <button
                type="submit"
                disabled={loading || isLocked}
                style={{ backgroundColor: '#ffffff', color: '#000000' }}
                className="w-full mt-2 py-3 px-4 font-semibold text-sm rounded-xl transition-all shadow-md hover:bg-zinc-200 active:bg-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span className="text-black font-semibold">Verifying session…</span>
                  </>
                ) : isLocked ? (
                  <>
                    <Timer size={16} className="text-black" />
                    <span className="text-black font-semibold">Locked ({lockoutSeconds}s)</span>
                  </>
                ) : (
                  <>
                    <Lock size={15} className="text-black" />
                    <span className="text-black font-semibold">Sign In to Dashboard</span>
                    <ArrowRight size={14} className="text-black group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
