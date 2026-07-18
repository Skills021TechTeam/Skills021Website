import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Eye, EyeOff, Zap, AlertCircle, School } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

const colleges = [
  'AKTU-affiliated',
  'IPU-affiliated',
  'Delhi University',
  'IIT',
  'NIT',
  'IIIT',
  'Other',
]

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    college: '',
    agreed: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { register } = useAuthStore()
  const navigate = useNavigate()

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Full name is required'
    else if (form.name.trim().length < 3) errs.name = 'Name must be at least 3 characters'
    if (!form.email) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters'
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password'
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match'
    if (!form.college) errs.college = 'Please select your college affiliation'
    if (!form.agreed) errs.agreed = 'Please accept the Terms and Privacy Policy'
    return errs
  }

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
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
    await new Promise((r) => setTimeout(r, 800))

    const success = register({
      name: form.name.trim(),
      email: form.email,
      password: form.password,
      college: form.college,
    })

    setLoading(false)

    if (success) {
      toast.success('Account created! Welcome to Skills021 🎉', { duration: 3000 })
      navigate('/dashboard')
    } else {
      toast.error('An account with this email already exists.')
      setErrors({ email: 'Email already registered' })
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
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Zap size={22} className="text-white" />
              </div>
              <span className="text-2xl font-bold text-primary-500">Skills021</span>
            </Link>
            <h1 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Create your account</h1>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-1">Join 12,000+ students today</p>
          </div>

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
                  placeholder="Min 6 characters"
                  className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm bg-white dark:bg-brand-dark-bg text-brand-text dark:text-brand-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.password ? 'border-red-400' : 'border-brand-border dark:border-brand-dark-border'}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted">
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
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
        </div>
      </motion.div>
    </div>
  )
}
