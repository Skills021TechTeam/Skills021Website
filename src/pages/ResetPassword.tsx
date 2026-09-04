import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Lock,
  Eye,
  EyeOff,
  Zap,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase, updateUserAuthPassword } from '../lib/supabase'
import { clearRateLimit } from '../store/authStore'

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [userEmail, setUserEmail] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    // Check if a recovery session or active session exists from the email link
    const checkRecoverySession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) {
          // Listen for onAuthStateChange in case token is currently being parsed from URL hash
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && s?.user)) {
              setIsSessionValid(true)
              if (s?.user?.email) setUserEmail(s.user.email)
            }
          })
          
          // Wait briefly for token extraction from URL
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession()
            if (retrySession?.user) {
              setIsSessionValid(true)
              if (retrySession.user.email) setUserEmail(retrySession.user.email)
            } else {
              setIsSessionValid(false)
            }
            subscription.unsubscribe()
          }, 1000)
        } else {
          setIsSessionValid(true)
          if (session.user?.email) setUserEmail(session.user.email)
        }
      } catch {
        setIsSessionValid(false)
      }
    }

    checkRecoverySession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!newPassword) {
      setErrorMsg('Please enter a new password')
      return
    }

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long')
      return
    }

    if (!confirmPassword) {
      setErrorMsg('Please confirm your new password')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await updateUserAuthPassword(newPassword)
      
      // Clear rate limit for the user if they were locked out
      if (userEmail) {
        clearRateLimit(userEmail)
      }

      toast.success('Password updated successfully! 🎉', { duration: 3000 })
      
      // Sign out to ensure clean state with new password or redirect to login
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update password. Please try again.')
      toast.error(err?.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c0d14] flex items-center justify-center px-4 pt-16 pb-12 selection:bg-primary-500 selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-[400px]"
      >
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Reset Password
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {userEmail ? `Enter a new password for ${userEmail}` : 'Enter your new secure password'}
            </p>
          </div>

          {isSessionValid === false ? (
            <div className="py-4 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Invalid or Expired Link
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  This password reset link is invalid or has expired. Please request a new one from the sign-in page.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs rounded-xl transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              {/* New Password */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none"
                  />
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => {
                      setNewPassword(e.target.value)
                      if (errorMsg) setErrorMsg('')
                    }}
                    placeholder="At least 8 characters"
                    disabled={loading}
                    autoComplete="new-password"
                    autoFocus
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none"
                  />
                  <input
                    id="reset-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value)
                      if (errorMsg) setErrorMsg('')
                    }}
                    placeholder="Re-enter your password"
                    disabled={loading}
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {errorMsg && (
                <p className="text-xs text-red-500 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} className="shrink-0" /> {errorMsg}
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium transition-colors"
                >
                  Cancel & Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
