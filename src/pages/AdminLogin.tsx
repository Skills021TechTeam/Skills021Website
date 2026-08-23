import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Lock, UserCheck, KeyRound, AlertCircle, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function AdminLogin() {
  const [adminId, setAdminId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { adminLogin } = useAuthStore()
  const navigate = useNavigate()

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminId.trim()) {
      setErrorMsg('Admin ID or Email is required')
      return
    }
    if (!adminPassword) {
      setErrorMsg('Admin Password is required')
      return
    }

    setErrorMsg('')
    setLoading(true)

    // Brief transition delay
    await new Promise(r => setTimeout(r, 600))

    const success = await adminLogin(adminId, adminPassword)
    setLoading(false)

    if (success) {
      toast.success('Admin Authentication Successful! Welcome to System Dashboard ⚡', { duration: 2500 })
      navigate('/admin')
    } else {
      setErrorMsg('Invalid Admin Credentials. Check Admin ID and Admin Password.')
      toast.error('Access Denied: Invalid Admin Credentials')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 pt-20 pb-12 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary-500/20 border border-primary-400/30">
              <Shield size={28} className="text-white" />
            </div>

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase bg-primary-500/10 text-primary-400 border border-primary-500/20">
                <Sparkles size={12} /> Restricted Access
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white mt-2">
                Admin Control Portal
              </h1>
              <p className="text-xs text-slate-400">
                Enter your dedicated Admin ID and Security Password to manage system operations.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 font-medium">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Admin ID / Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Admin ID / Email
              </label>
              <div className="relative">
                <UserCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={adminId}
                  onChange={e => setAdminId(e.target.value)}
                  placeholder="admin@skills021.com or admin"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Admin Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Admin Security Password
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 text-white font-bold rounded-xl text-sm shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock size={16} /> Access Admin Dashboard
                </>
              )}
            </motion.button>
          </form>

          {/* Credentials Hint Box */}
          <div className="p-3.5 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-center space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Admin Credentials</p>
            <p className="text-xs font-mono text-primary-400 font-semibold">
              Admin ID: <span className="text-white">{import.meta.env.VITE_ADMIN_ID || 'admin@skills021.com'}</span>
            </p>
            <p className="text-xs font-mono text-primary-400 font-semibold">
              Password: <span className="text-white">{import.meta.env.VITE_ADMIN_PASSWORD ? '•••••••• (Configured in .env)' : 'admin123'}</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
