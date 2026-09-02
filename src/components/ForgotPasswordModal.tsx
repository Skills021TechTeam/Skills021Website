import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  RefreshCw,
  Volume2,
  Mail,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { resetPasswordForEmail } from '../lib/supabase'

interface ForgotPasswordModalProps {
  isOpen: boolean
  initialEmail?: string
  onClose: () => void
  onSuccess?: (email: string) => void
}

// Generate random captcha string (omits ambiguous chars like 0, O, I, l, 1)
function generateCaptchaCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export default function ForgotPasswordModal({
  isOpen,
  initialEmail = '',
  onClose,
  onSuccess,
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(initialEmail)
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaError, setCaptchaError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [shake, setShake] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const captchaInputRef = useRef<HTMLInputElement | null>(null)

  // Update initial email when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '')
      setCaptchaInput('')
      setCaptchaError('')
      setEmailError('')
      setIsSuccess(false)
      setIsSubmitting(false)
      generateNewCaptcha()
    }
  }, [isOpen, initialEmail])

  // Draw captcha onto canvas
  const drawCaptcha = useCallback((code: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Background gradient
    const isDark = document.documentElement.classList.contains('dark')
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    if (isDark) {
      gradient.addColorStop(0, '#18181b')
      gradient.addColorStop(0.5, '#27272a')
      gradient.addColorStop(1, '#18181b')
    } else {
      gradient.addColorStop(0, '#f8fafc')
      gradient.addColorStop(0.5, '#e2e8f0')
      gradient.addColorStop(1, '#f1f5f9')
    }
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Add noise dots
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = isDark
        ? `rgba(255, 255, 255, ${Math.random() * 0.15 + 0.05})`
        : `rgba(0, 0, 0, ${Math.random() * 0.15 + 0.05})`
      ctx.beginPath()
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 2 + 1,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }

    // Add wavy interference lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = isDark
        ? `rgba(56, 189, 248, ${Math.random() * 0.35 + 0.15})`
        : `rgba(14, 165, 233, ${Math.random() * 0.4 + 0.2})`
      ctx.lineWidth = Math.random() * 2 + 1
      ctx.beginPath()
      ctx.moveTo(0, Math.random() * height)
      ctx.bezierCurveTo(
        width * 0.25,
        Math.random() * height,
        width * 0.75,
        Math.random() * height,
        width,
        Math.random() * height
      )
      ctx.stroke()
    }

    // Draw characters
    const charList = code.split('')
    const startX = 20
    const charSpacing = (width - 40) / charList.length

    charList.forEach((char, index) => {
      ctx.save()
      const x = startX + index * charSpacing + Math.random() * 4
      const y = height / 2 + (Math.random() * 8 - 4)

      // Random rotation
      const angle = (Math.random() - 0.5) * 0.4
      ctx.translate(x, y)
      ctx.rotate(angle)

      // Font styling
      const fontSize = Math.floor(Math.random() * 6) + 24
      ctx.font = `bold ${fontSize}px monospace, 'Courier New', sans-serif`
      
      // Color variation
      const colors = isDark
        ? ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa']
        : ['#0284c7', '#4f46e5', '#059669', '#db2777', '#d97706', '#7c3aed']
      ctx.fillStyle = colors[index % colors.length]
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Character shadow
      ctx.shadowColor = isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.15)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1

      ctx.fillText(char, 0, 0)
      ctx.restore()
    })
  }, [])

  const generateNewCaptcha = () => {
    setIsRefreshing(true)
    const newCode = generateCaptchaCode(6)
    setCaptchaCode(newCode)
    setTimeout(() => {
      drawCaptcha(newCode)
      setIsRefreshing(false)
    }, 50)
  }

  // Speak captcha code using SpeechSynthesis for accessibility
  const handleSpeakCaptcha = () => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported on this browser')
      return
    }
    window.speechSynthesis.cancel()
    const textToSpeak = captchaCode.split('').join(' ')
    const utterance = new SpeechSynthesisUtterance(`Security code: ${textToSpeak}`)
    utterance.rate = 0.8
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    setCaptchaError('')

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setEmailError('Please enter your email address')
      return
    }
    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }

    if (!captchaInput.trim()) {
      setCaptchaError('Please enter the captcha code')
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }

    // Case-insensitive check
    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setCaptchaError('Incorrect security code. Please try again.')
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setCaptchaInput('')
      generateNewCaptcha()
      captchaInputRef.current?.focus()
      return
    }

    // Captcha passed! Now dispatch password reset email
    setIsSubmitting(true)
    try {
      await resetPasswordForEmail(cleanEmail)
      setIsSuccess(true)
      toast.success('Password reset email sent! 🚀', { duration: 4000 })
      if (onSuccess) {
        onSuccess(cleanEmail)
      }
    } catch (err: any) {
      console.error('Password reset error:', err)
      setCaptchaError(err?.message || 'Failed to send reset link. Please try again.')
      generateNewCaptcha()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-7"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          {isSuccess ? (
            /* ═══════════════════════════════════════════════════════════════
               SUCCESS STATE
            ═══════════════════════════════════════════════════════════════ */
            <div className="text-center py-4 space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center"
              >
                <CheckCircle2 size={36} />
              </motion.div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Reset Link Sent!
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-2 max-w-xs mx-auto leading-relaxed">
                  We've sent a password reset email to{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">{email}</span>.
                  Click the link in the message to set a new password.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-100 dark:border-zinc-700/50 text-[11px] text-slate-500 dark:text-zinc-400">
                Didn't receive an email? Check your spam folder or try again in a few minutes.
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Back to Sign In</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            /* ═══════════════════════════════════════════════════════════════
               CAPTCHA & RESET FORM
            ═══════════════════════════════════════════════════════════════ */
            <div>
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-primary-500/10 dark:bg-primary-500/20 rounded-xl flex items-center justify-center text-primary-500">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Reset Password
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Complete the security check to receive a reset link
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                    Account Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value)
                        if (emailError) setEmailError('')
                      }}
                      placeholder="name@gmail.com"
                      disabled={isSubmitting}
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                        emailError
                          ? 'border-red-500'
                          : 'border-slate-200 dark:border-zinc-800'
                      }`}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} /> {emailError}
                    </p>
                  )}
                </div>

                {/* Security CAPTCHA Box */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                    Security Verification (CAPTCHA)
                  </label>

                  <div className="border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 rounded-xl p-3 space-y-3">
                    {/* Canvas & Controls */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700/80 shadow-inner bg-slate-100 dark:bg-zinc-900">
                        <canvas
                          ref={canvasRef}
                          width={190}
                          height={52}
                          className="block cursor-pointer select-none"
                          onClick={generateNewCaptcha}
                          title="Click to refresh captcha"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={generateNewCaptcha}
                          disabled={isSubmitting || isRefreshing}
                          title="Generate new captcha code"
                          className="p-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <RefreshCw
                            size={15}
                            className={isRefreshing ? 'animate-spin text-primary-500' : ''}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={handleSpeakCaptcha}
                          disabled={isSubmitting}
                          title="Listen to captcha code"
                          className="p-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <Volume2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* CAPTCHA Input */}
                    <motion.div
                      animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <input
                        ref={captchaInputRef}
                        type="text"
                        value={captchaInput}
                        onChange={e => {
                          setCaptchaInput(e.target.value)
                          if (captchaError) setCaptchaError('')
                        }}
                        placeholder="Enter characters above"
                        maxLength={8}
                        autoComplete="off"
                        spellCheck="false"
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 rounded-lg border text-sm font-mono uppercase tracking-widest text-center bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                          captchaError
                            ? 'border-red-500'
                            : 'border-slate-200 dark:border-zinc-700'
                        }`}
                      />
                    </motion.div>
                  </div>

                  {captchaError && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {captchaError}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="w-1/3 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-medium text-slate-600 dark:text-zinc-400 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 py-2.5 px-4 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-sm"
                  >
                    {isSubmitting ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Verify & Send</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
