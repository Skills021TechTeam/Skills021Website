import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Settings,
  Clock, CheckCircle, TrendingUp, Play, Save,
  User, Phone, School, Lock, AlertCircle, CreditCard, ShieldCheck, Loader2, Sparkles, Copy, Camera, Image as ImageIcon
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { fetchPublishedSiteCourses } from '../lib/courseService'
import { Course } from '../store/contentStore'
import { getEnrollmentsForUser, Enrollment } from '../lib/videoEngagementService'
import { updateUserAuthPassword } from '../lib/supabase'
import VideoPlayerModal from '../components/VideoPlayerModal'
import EnrollModal from '../components/EnrollModal'
import AvatarPickerModal from '../components/AvatarPickerModal'
import toast from 'react-hot-toast'

type DashboardTab = 'overview' | 'courses' | 'transactions' | 'profile'

const sidebarItems = [
  { id: 'overview' as DashboardTab, label: 'Overview', icon: LayoutDashboard },
  { id: 'courses' as DashboardTab, label: 'My Courses', icon: BookOpen },
  { id: 'transactions' as DashboardTab, label: 'Paid Enrollments', icon: CreditCard },
  { id: 'profile' as DashboardTab, label: 'Profile Settings', icon: Settings },
]

function UserAvatarDisplay({
  avatarUrl,
  name,
}: {
  avatarUrl?: string
  name?: string
}) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [avatarUrl])

  const getInitials = (n: string) =>
    (n || 'U')
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  if (avatarUrl && !imgError) {
    return (
      <img
        key={avatarUrl}
        src={avatarUrl}
        alt={name || 'User Avatar'}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    )
  }

  return <span>{getInitials(name || 'U')}</span>
}

export default function UserDashboard() {
  const { user, updateProfileInSupabase } = useAuthStore()
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [coursesList, setCoursesList] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [activePlayCourse, setActivePlayCourse] = useState<Course | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    college: user?.college || '',
    phone: user?.phone || '',
    password: '',
    confirmPassword: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        name: user.name || '',
        college: user.college || '',
        phone: user.phone || '',
      }))
    }
  }, [user])

  const loadData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [allCourses, userEnrollments] = await Promise.all([
        fetchPublishedSiteCourses().catch(() => []),
        getEnrollmentsForUser(user.id).catch(() => []),
      ])
      setCoursesList(allCourses)
      setEnrollments(userEnrollments)
    } catch (err) {
      console.error('Failed to load user dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  // Filter only active courses (approved 'paid' or 'free', excluding rejected and pending)
  const activeEnrollments = enrollments.filter(
    (enr) => (enr.status === 'paid' || enr.status === 'free') && enr.itemType !== 'premium_membership'
  )

  // Map active enrolled courses
  const enrolledCoursesWithMeta = activeEnrollments.map((enr) => {
    const matchedCourse = coursesList.find((c) => String(c.id) === String(enr.courseId))
    return {
      enrollment: enr,
      course: (matchedCourse || {
        id: enr.courseId,
        title: enr.itemTitle || `Course #${enr.courseId}`,
        description: 'Enrolled via Skills021 Platform',
        group: 'College & Tech Courses',
        subcategory: 'Web Development',
        instructor: 'Skills021 Faculty',
        duration: 'Self-paced',
        lectures: 1,
        level: 'All Levels',
        rating: 4.8,
        reviews: 12,
        price: enr.amount > 0 ? enr.amount : 'FREE',
        tags: [],
        modules: [],
        status: 'Published',
        enrolled: 1,
        gradientFrom: '#00BFA6',
        gradientTo: '#00897B',
        createdAt: enr.createdAt,
      }) as Course,
    }
  })

  const paidEnrollments = enrollments.filter((e) => e.status === 'paid')
  const freeEnrollments = enrollments.filter((e) => e.status === 'free')
  const totalAmountPaid = paidEnrollments.reduce((sum, e) => sum + (e.amount || 0), 0)

  const handleSaveAvatar = async (newAvatarUrl: string): Promise<boolean> => {
    return await updateProfileInSupabase({ avatarUrl: newAvatarUrl })
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    const success = await updateProfileInSupabase({
      name: profileForm.name.trim(),
      college: profileForm.college.trim(),
      phone: profileForm.phone.trim(),
    })
    setSavingProfile(false)
    if (success) {
      toast.success('Profile details updated successfully! 🎉')
    } else {
      toast.error('Failed to update profile. Please try again.')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileForm.password) {
      toast.error('Please enter a new password')
      return
    }
    if (profileForm.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (profileForm.password !== profileForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setSavingPassword(true)
    try {
      await updateUserAuthPassword(profileForm.password)
      setProfileForm((p) => ({ ...p, password: '', confirmPassword: '' }))
      toast.success('Password updated successfully! 🔐')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 size={36} className="animate-spin text-primary-500 mb-3" />
          <p className="text-sm text-brand-muted dark:text-brand-dark-muted">Loading your learning records...</p>
        </div>
      )
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">
                  Welcome back, {user?.name?.split(' ')[0]}! 👋
                </h2>
                <p className="text-brand-muted dark:text-brand-dark-muted mt-1 text-sm">
                  Student ID: <span className="font-mono text-xs opacity-75">{user?.id}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {user?.isPremium ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold shadow-sm">
                    ⭐ All-Access Premium Member
                  </div>
                ) : user?.role !== 'admin' ? (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-primary-500 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-90 transition-all"
                  >
                    <Sparkles size={13} /> Upgrade to All-Access (₹999)
                  </button>
                ) : null}
                {paidEnrollments.length > 0 && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <ShieldCheck size={14} /> Course Purchaser ({paidEnrollments.length} Paid Course{paidEnrollments.length > 1 ? 's' : ''})
                  </div>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Enrolled Courses',
                  value: activeEnrollments.length.toString(),
                  icon: BookOpen,
                  color: 'text-primary-500',
                  bg: 'bg-primary-50 dark:bg-primary-900/20',
                },
                {
                  label: 'Paid Courses Taken',
                  value: paidEnrollments.length.toString(),
                  icon: CreditCard,
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                },
                {
                  label: 'Free Courses Enrolled',
                  value: freeEnrollments.length.toString(),
                  icon: CheckCircle,
                  color: 'text-blue-500',
                  bg: 'bg-blue-50 dark:bg-blue-900/20',
                },
                {
                  label: 'Total Invested',
                  value: `₹${totalAmountPaid.toLocaleString()}`,
                  icon: TrendingUp,
                  color: 'text-amber-500',
                  bg: 'bg-amber-50 dark:bg-amber-900/20',
                },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-5"
                >
                  <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                    <stat.icon size={20} className={stat.color} />
                  </div>
                  <div className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">{stat.value}</div>
                  <div className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Continue Learning */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary-500" />
                  Your Active Courses
                </h3>
                {enrolledCoursesWithMeta.length > 2 && (
                  <button
                    onClick={() => setActiveTab('courses')}
                    className="text-xs font-semibold text-primary-500 hover:underline"
                  >
                    View All ({enrolledCoursesWithMeta.length})
                  </button>
                )}
              </div>

              {enrolledCoursesWithMeta.length === 0 ? (
                <div className="card p-8 text-center">
                  <BookOpen size={36} className="mx-auto text-brand-muted dark:text-brand-dark-muted mb-2 opacity-50" />
                  <p className="font-semibold text-brand-text dark:text-brand-dark-text">No courses enrolled yet</p>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1 mb-4">
                    Explore our expert-led courses and start learning today!
                  </p>
                  <a
                    href="/courses"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-xs font-semibold rounded-xl hover:bg-primary-600 transition-colors"
                  >
                    Browse Courses
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrolledCoursesWithMeta.slice(0, 3).map(({ enrollment, course }) => (
                    <div key={enrollment.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center flex-shrink-0 text-white font-bold">
                        <BookOpen size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`badge text-[10px] px-2 py-0.5 ${enrollment.status === 'paid' || enrollment.amount > 0
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}
                          >
                            {enrollment.status === 'paid' || enrollment.amount > 0
                              ? `Paid ₹${enrollment.amount}`
                              : 'Free Course'}
                          </span>
                          <span className="text-[11px] text-brand-muted dark:text-brand-dark-muted">
                            Enrolled on {new Date(enrollment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-semibold text-sm text-brand-text dark:text-brand-dark-text truncate">
                          {course.title}
                        </p>
                      </div>
                      <button
                        onClick={() => setActivePlayCourse(course)}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary-500 text-white text-xs font-semibold rounded-xl hover:bg-primary-600 transition-colors flex-shrink-0"
                      >
                        <Play size={12} /> Watch Video
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      case 'courses':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">My Enrolled Courses</h2>
                <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
                  All courses saved to your account
                </p>
              </div>
              <a
                href="/courses"
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-brand-text dark:text-brand-dark-text hover:bg-gray-200 transition-colors"
              >
                + Explore More Courses
              </a>
            </div>

            {enrolledCoursesWithMeta.length === 0 ? (
              <div className="card p-12 text-center">
                <BookOpen size={48} className="mx-auto text-brand-muted dark:text-brand-dark-muted mb-3 opacity-40" />
                <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text">You haven't enrolled in any courses yet</h3>
                <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1 max-w-sm mx-auto mb-5">
                  Browse our catalog of Free and Premium courses to accelerate your skills.
                </p>
                <a href="/courses" className="btn-primary inline-flex text-xs px-5 py-2.5">
                  Browse Courses Catalog
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrolledCoursesWithMeta.map(({ enrollment, course }) => (
                  <div key={enrollment.id} className="card overflow-hidden flex flex-col justify-between">
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`badge text-xs ${enrollment.status === 'paid' || enrollment.amount > 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                            }`}
                        >
                          {enrollment.status === 'paid' || enrollment.amount > 0
                            ? `PAID COURSE — ₹${enrollment.amount}`
                            : 'FREE COURSE'}
                        </span>
                        <span className="text-[11px] text-brand-muted dark:text-brand-dark-muted">
                          {new Date(enrollment.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-brand-text dark:text-brand-dark-text mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-xs text-brand-muted dark:text-brand-dark-muted line-clamp-2 mb-4">
                        {course.description}
                      </p>
                    </div>

                    <div className="p-5 pt-0 border-t border-brand-border dark:border-brand-dark-border mt-auto">
                      <div className="flex items-center justify-between text-xs text-brand-muted dark:text-brand-dark-muted py-3">
                        <span>Instructor: {course.instructor || 'Skills021'}</span>
                        <span className="font-semibold">{course.duration || 'Full Access'}</span>
                      </div>
                      <button
                        onClick={() => setActivePlayCourse(course)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-500 text-white text-xs font-bold rounded-xl hover:bg-primary-600 transition-colors"
                      >
                        <Play size={13} /> Watch Course Video
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'transactions':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Paid Course Enrollments & Receipts</h2>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
                Complete record of your paid course transactions
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-4">
                <p className="text-xs text-brand-muted dark:text-brand-dark-muted">Total Paid Courses</p>
                <p className="text-xl font-bold text-brand-text dark:text-brand-dark-text mt-1">{paidEnrollments.length}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-brand-muted dark:text-brand-dark-muted">Total Amount Paid</p>
                <p className="text-xl font-bold text-emerald-500 mt-1">₹{totalAmountPaid.toLocaleString()}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-brand-muted dark:text-brand-dark-muted">Account Status</p>
                <p className="text-xl font-bold text-primary-500 mt-1">Verified User</p>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      {['Item / Course', 'Type', 'Amount', 'UTR / Ref Number', 'Admin Approval Status', 'Date Submitted'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-brand-muted dark:text-brand-dark-muted uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border dark:divide-brand-dark-border">
                    {enrollments.map((enr) => {
                      const matched = coursesList.find((c) => String(c.id) === String(enr.courseId))
                      const isPremium = enr.itemType === 'premium_membership'
                      const isPaid = enr.status === 'paid'
                      const isPending = enr.status === 'pending'
                      const isRejected = enr.status === 'rejected'

                      return (
                        <tr key={enr.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 font-medium text-brand-text dark:text-brand-dark-text max-w-xs">
                            <p className="font-semibold text-sm truncate">
                              {enr.itemTitle || matched?.title || (isPremium ? 'All-Access Premium Membership' : `Course #${enr.courseId}`)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`badge text-xs font-bold ${
                                isPremium
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : enr.amount > 0
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}
                            >
                              {isPremium ? '⭐ PREMIUM PASS' : enr.amount > 0 ? 'PAID COURSE' : 'FREE'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-brand-text dark:text-brand-dark-text">
                            {enr.amount > 0 ? `₹${enr.amount}` : '₹0 (Free)'}
                          </td>
                          <td className="px-4 py-3">
                            {enr.utrNumber ? (
                              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded">
                                {enr.utrNumber}
                              </span>
                            ) : (
                              <span className="text-xs text-brand-muted italic">N/A (Free)</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isPaid ? (
                              <span className="badge text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">
                                ✅ APPROVED & ACTIVE
                              </span>
                            ) : isPending ? (
                              <span className="badge text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold animate-pulse">
                                ⏳ PENDING ADMIN APPROVAL
                              </span>
                            ) : isRejected ? (
                              <span className="badge text-xs bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-bold">
                                ❌ REJECTED {enr.rejectionReason ? `(${enr.rejectionReason})` : ''}
                              </span>
                            ) : (
                              <span className="badge text-xs bg-blue-100 text-blue-700 font-bold">
                                ACTIVE FREE
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-brand-muted dark:text-brand-dark-muted whitespace-nowrap">
                            {enr.createdAt ? new Date(enr.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      )
                    })}
                    {enrollments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-brand-muted text-sm">
                          No transaction records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Profile Settings</h2>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
                Manage your profile picture, personal information & password
              </p>
            </div>

            {/* Profile Avatar Card */}
            <div className="card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => setShowAvatarModal(true)}
                    title="Click to change profile picture"
                  >
                    <div className="w-20 h-20 rounded-2xl ring-4 ring-primary-500/20 dark:ring-primary-400/20 overflow-hidden shadow-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold transition-transform group-hover:scale-105">
                      <UserAvatarDisplay avatarUrl={user?.avatarUrl} name={user?.name} />
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                      <Camera size={20} />
                      <span className="text-[10px] font-bold mt-0.5">Change</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-brand-text dark:text-brand-dark-text">
                        Profile Avatar & Picture
                      </h3>
                      <span className="badge text-[10px] px-2 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-semibold">
                        Active Profile
                      </span>
                    </div>
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1">
                      {user?.avatarUrl
                        ? 'Custom photo / pre-made graphic active on your account'
                        : 'Using default initials monogram badge'}
                    </p>
                    <div className="flex items-center gap-2.5 mt-3">
                      <button
                        type="button"
                        onClick={() => setShowAvatarModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold shadow-sm transition-colors"
                      >
                        <Sparkles size={13} />
                        {user?.avatarUrl ? 'Change Avatar / Photo' : 'Choose Photo or Graphic'}
                      </button>
                      {user?.avatarUrl && (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await updateProfileInSupabase({ avatarUrl: '' })
                            if (res) toast.success('Profile avatar reset successfully!')
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          Reset to Initials
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Details Form */}
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="card p-6 space-y-5">
                <h3 className="font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2">
                  <User size={18} className="text-primary-500" /> Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <AlertCircle size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="email"
                        value={user?.email}
                        disabled
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-gray-50 dark:bg-white/5 text-sm text-brand-muted dark:text-brand-dark-muted cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">
                      College Affiliation
                    </label>
                    <div className="relative">
                      <School size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="text"
                        value={profileForm.college}
                        onChange={(e) => setProfileForm((p) => ({ ...p, college: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={savingProfile}
                    className="flex items-center gap-2 btn-primary disabled:opacity-60 text-xs px-5 py-2.5"
                  >
                    {savingProfile ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={15} />
                    )}
                    {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                  </motion.button>
                </div>
              </div>
            </form>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="card p-6 space-y-4">
                <h3 className="font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2">
                  <Lock size={18} className="text-primary-500" /> Update Password
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="password"
                        value={profileForm.password}
                        onChange={(e) => setProfileForm((p) => ({ ...p, password: e.target.value }))}
                        placeholder="Min 6 characters"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="password"
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                        placeholder="Repeat new password"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={savingPassword || !profileForm.password}
                    className="flex items-center gap-2 btn-primary disabled:opacity-60 text-xs px-5 py-2.5"
                  >
                    {savingPassword ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Lock size={15} />
                    )}
                    {savingPassword ? 'Updating Password...' : 'Update Password'}
                  </motion.button>
                </div>
              </div>
            </form>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col w-64 flex-shrink-0">
            <div className="card p-5 sticky top-24">
              {/* User Avatar */}
              <div className="flex flex-col items-center text-center mb-6 pb-6 border-b border-brand-border dark:border-brand-dark-border">
                <div
                  className="relative group cursor-pointer mb-3"
                  onClick={() => setShowAvatarModal(true)}
                  title="Click to customize avatar"
                >
                  <div className="w-18 h-18 rounded-full ring-4 ring-primary-500/20 dark:ring-primary-400/20 overflow-hidden shadow-md bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold transition-transform group-hover:scale-105">
                    <UserAvatarDisplay avatarUrl={user?.avatarUrl} name={user?.name} />
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <Camera size={18} />
                    <span className="text-[9px] font-bold mt-0.5">Edit</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAvatarModal(true)
                    }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-brand-dark-card hover:bg-primary-600 transition-colors"
                    title="Change profile picture"
                  >
                    <Camera size={11} />
                  </button>
                </div>

                <h3 className="font-bold text-brand-text dark:text-brand-dark-text">{user?.name}</h3>
                <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-0.5">{user?.email}</p>
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className="mt-2 text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles size={11} /> Change Avatar
                </button>
                <span className="mt-2 badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-xs">
                  {user?.college || 'Student'}
                </span>
                {user?.phone && (
                  <span className="text-[11px] text-brand-muted dark:text-brand-dark-muted mt-1 flex items-center gap-1">
                    <Phone size={11} /> {user.phone}
                  </span>
                )}
              </div>
              <nav className="space-y-1">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === item.id
                      ? 'bg-primary-500 text-white shadow-sm font-semibold'
                      : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Mobile Tab Bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-brand-dark-card border-t border-brand-border dark:border-brand-dark-border flex">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${activeTab === item.id ? 'text-primary-500 font-bold' : 'text-brand-muted dark:text-brand-dark-muted'
                  }`}
              >
                <item.icon size={20} />
                <span className="text-[10px]">{item.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <main className="flex-1 min-w-0 pb-20 lg:pb-0">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </main>
        </div>
      </div>

      {activePlayCourse && (
        <VideoPlayerModal
          course={activePlayCourse}
          userId={user?.id || ''}
          userName={user?.name || 'Student'}
          isAdmin={user?.role === 'admin'}
          canWatch={true}
          onClose={() => setActivePlayCourse(null)}
        />
      )}

      {showUpgradeModal && (
        <EnrollModal
          isPremiumMembership={true}
          premiumAmount={999}
          userId={user?.id || `user-${Date.now()}`}
          defaultEmail={user?.email}
          defaultName={user?.name}
          onClose={() => setShowUpgradeModal(false)}
          onEnrolled={() => {
            loadData()
            setShowUpgradeModal(false)
          }}
        />
      )}

      {showAvatarModal && (
        <AvatarPickerModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          currentAvatarUrl={user?.avatarUrl}
          userName={user?.name || 'Student'}
          userId={user?.id || ''}
          onSaveAvatar={handleSaveAvatar}
        />
      )}
    </div>
  )
}
