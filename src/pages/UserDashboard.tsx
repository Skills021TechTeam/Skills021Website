import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Settings,
  Clock, CheckCircle, TrendingUp, Play, Save,
  User, Phone, School, Lock, AlertCircle, CreditCard, ShieldCheck, Loader2, Sparkles, Copy, Camera, Image as ImageIcon, LogOut,
  GraduationCap, Calendar, BookMarked, FileText, ChevronDown, ChevronUp, BarChart3, Target,
  Smartphone, Volume2, Download
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import LogoutConfirmModal from '../components/LogoutConfirmModal'
import { fetchPublishedSiteCourses } from '../lib/courseService'
import { fetchPublishedResources, type Resource, triggerResourceDownload } from '../lib/resourceService'
import { Course } from '../store/contentStore'
import { getEnrollmentsForUser, Enrollment, getPaymentSettings } from '../lib/videoEngagementService'
import { updateUserAuthPassword } from '../lib/supabase'
import VideoPlayerModal from '../components/VideoPlayerModal'
import EnrollModal from '../components/EnrollModal'
import AvatarPickerModal from '../components/AvatarPickerModal'
import toast from 'react-hot-toast'
import { haptic } from '../lib/haptics'

type DashboardTab = 'overview' | 'courses' | 'resources' | 'transactions' | 'profile'

const sidebarItems = [
  { id: 'overview' as DashboardTab, label: 'Overview', icon: LayoutDashboard },
  { id: 'courses' as DashboardTab, label: 'My Courses', icon: BookOpen },
  { id: 'resources' as DashboardTab, label: 'My Resources', icon: FileText },
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
  const { user, updateProfileInSupabase, logoutUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [coursesList, setCoursesList] = useState<Course[]>([])
  const [resourcesList, setResourcesList] = useState<Resource[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [activePlayCourse, setActivePlayCourse] = useState<Course | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [allAccessPrice, setAllAccessPrice] = useState(999)

  const handleConfirmLogout = async () => {
    await logoutUser()
    toast.success('Logged out successfully')
    setShowLogoutModal(false)
  }

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    college: user?.college || '',
    phone: user?.phone || '',
    password: '',
    confirmPassword: '',
    age: user?.age || '',
    branch: user?.branch || '',
    currentSemester: user?.currentSemester || '',
    bio: user?.bio || '',
    semesterSGPA: user?.semesterSGPA || ({} as Record<string, number>),
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [showSGPASection, setShowSGPASection] = useState(false)
  const [hapticsEnabled, setHapticsEnabled] = useState(() => haptic.isEnabled())
  const [hapticsSoundEnabled, setHapticsSoundEnabled] = useState(() => haptic.isSoundEnabled())

  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        name: user.name || '',
        college: user.college || '',
        phone: user.phone || '',
        age: user.age || '',
        branch: user.branch || '',
        currentSemester: user.currentSemester || '',
        bio: user.bio || '',
        semesterSGPA: user.semesterSGPA || {},
      }))
    }
  }, [user])

  // Branch options
  const branchOptions = [
    'Computer Science & Engineering (CSE)',
    'Information Technology (IT)',
    'Electronics & Communication (ECE)',
    'Electrical Engineering (EE)',
    'Mechanical Engineering (ME)',
    'Civil Engineering (CE)',
    'Chemical Engineering',
    'Biotechnology',
    'Aerospace Engineering',
    'Data Science & AI',
    'Mathematics & Computing',
    'BCA',
    'BBA',
    'B.Sc',
    'B.Com',
    'Other',
  ]

  // Semester to year helper
  const getYearFromSemester = (sem: number): string => {
    if (sem <= 2) return '1st Year'
    if (sem <= 4) return '2nd Year'
    if (sem <= 6) return '3rd Year'
    return '4th Year'
  }

  // Profile completion calculator
  const calculateProfileCompletion = (): { percentage: number; missing: string[] } => {
    const fields: { key: string; label: string; check: () => boolean }[] = [
      { key: 'name', label: 'Full Name', check: () => Boolean(user?.name && user.name.trim()) },
      { key: 'email', label: 'Email', check: () => Boolean(user?.email) },
      { key: 'phone', label: 'Phone Number', check: () => Boolean(user?.phone && user.phone.trim()) },
      { key: 'college', label: 'College', check: () => Boolean(user?.college && user.college.trim() && user.college !== 'Student Institution') },
      { key: 'avatar', label: 'Profile Picture', check: () => Boolean(user?.avatarUrl) },
      { key: 'age', label: 'Age', check: () => Boolean(user?.age) },
      { key: 'branch', label: 'Branch', check: () => Boolean(user?.branch && user.branch.trim()) },
      { key: 'semester', label: 'Current Semester', check: () => Boolean(user?.currentSemester) },
      { key: 'bio', label: 'Bio', check: () => Boolean(user?.bio && user.bio.trim()) },
      { key: 'sgpa', label: 'Academic Record', check: () => {
        if (Number(user?.currentSemester) === 1) return true
        const sgpa = user?.semesterSGPA
        return Boolean(sgpa && Object.keys(sgpa).length > 0 && Object.values(sgpa).some(v => v > 0))
      }},
    ]
    const filled = fields.filter(f => f.check())
    const missing = fields.filter(f => !f.check()).map(f => f.label)
    return { percentage: Math.round((filled.length / fields.length) * 100), missing }
  }

  const profileCompletion = calculateProfileCompletion()

  const loadData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [allCourses, allResources, userEnrollments] = await Promise.all([
        fetchPublishedSiteCourses().catch(() => []),
        fetchPublishedResources().catch(() => []),
        getEnrollmentsForUser(user.id).catch(() => []),
      ])
      setCoursesList(allCourses)
      setResourcesList(allResources)
      setEnrollments(userEnrollments)
    } catch (err) {
      console.error('Failed to load user dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadData()
    getPaymentSettings().then((s) => {
      if (s?.allAccessPrice) setAllAccessPrice(s.allAccessPrice)
    })
  }, [loadData])

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  // Filter only active courses (approved 'paid' or 'free', strictly excluding resources and memberships)
  const activeCourseEnrollments = enrollments.filter(
    (enr) =>
      (enr.status === 'paid' || enr.status === 'free') &&
      enr.itemType !== 'premium_membership' &&
      enr.itemType !== 'resource' &&
      enr.itemType !== 'resource_bundle' &&
      !String(enr.courseId).startsWith('resource_')
  )

  // Map active enrolled courses
  const enrolledCoursesWithMeta = activeCourseEnrollments.map((enr) => {
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

  // Filter and map active purchased resources
  const activeResourceEnrollments = enrollments.filter(
    (enr) =>
      (enr.status === 'paid' || enr.status === 'free') &&
      (enr.itemType === 'resource' || String(enr.courseId).startsWith('resource_'))
  )

  const enrolledResourcesWithMeta = activeResourceEnrollments.map((enr) => {
    const rawId = String(enr.courseId).replace(/^resource_/, '')
    const matchedResource = resourcesList.find((r) => String(r.id) === rawId)
    return {
      enrollment: enr,
      resource: matchedResource || null,
      id: rawId,
      title: matchedResource?.title || enr.itemTitle || `Resource #${rawId}`,
      description: matchedResource?.description || 'Study material & notes',
      downloadUrl: matchedResource?.downloadUrl || '',
      type: matchedResource?.type || 'Notes / Document',
    }
  })

  const handleDownloadPurchasedResource = async (item: { title: string; downloadUrl: string }) => {
    if (!item.downloadUrl) {
      toast.error('Download file is not available yet.')
      return
    }
    try {
      await triggerResourceDownload(item.downloadUrl, item.title || 'document.pdf')
      toast.success('Download started! 📄')
    } catch {
      window.open(item.downloadUrl, '_blank')
    }
  }

  const paidEnrollments = enrollments.filter((e) => e.status === 'paid')
  const freeEnrollments = enrollments.filter((e) => e.status === 'free')
  const totalAmountPaid = paidEnrollments.reduce((sum, e) => sum + (e.amount || 0), 0)

  const handleSaveAvatar = async (newAvatarUrl: string): Promise<boolean> => {
    return await updateProfileInSupabase({ avatarUrl: newAvatarUrl })
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    const semNum = profileForm.currentSemester ? Number(profileForm.currentSemester) : undefined
    const success = await updateProfileInSupabase({
      name: profileForm.name.trim(),
      college: profileForm.college.trim(),
      phone: profileForm.phone.trim(),
      age: profileForm.age ? Number(profileForm.age) : undefined,
      branch: profileForm.branch,
      currentSemester: semNum,
      yearOfStudy: semNum ? getYearFromSemester(semNum) : undefined,
      bio: profileForm.bio.trim(),
      semesterSGPA: profileForm.semesterSGPA,
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
                  Ready to continue your learning journey today?
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
                    <Sparkles size={13} /> Upgrade to All-Access (₹{allAccessPrice.toLocaleString()})
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
                  value: activeCourseEnrollments.length.toString(),
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

            {/* Purchased Resources & Notes */}
            {enrolledResourcesWithMeta.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2">
                    <FileText size={18} className="text-indigo-500" />
                    Your Purchased Notes & Resources
                  </h3>
                  {enrolledResourcesWithMeta.length > 2 && (
                    <button
                      onClick={() => setActiveTab('resources')}
                      className="text-xs font-semibold text-primary-500 hover:underline"
                    >
                      View All ({enrolledResourcesWithMeta.length})
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {enrolledResourcesWithMeta.slice(0, 3).map((item) => (
                    <div key={item.enrollment.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 text-white font-bold">
                        <FileText size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="badge text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                            {item.type}
                          </span>
                          <span className="text-[11px] text-brand-muted dark:text-brand-dark-muted">
                            Purchased on {new Date(item.enrollment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-semibold text-sm text-brand-text dark:text-brand-dark-text truncate">
                          {item.title}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadPurchasedResource(item)}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors flex-shrink-0"
                      >
                        <Download size={13} /> Download File
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      case 'resources':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">My Purchased Resources & Notes</h2>
                <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
                  All study materials, formula sheets, and notes unlocked on your account
                </p>
              </div>
              <a
                href="/resources"
                className="btn-primary text-xs px-4 py-2"
              >
                Browse More Resources
              </a>
            </div>

            {enrolledResourcesWithMeta.length === 0 ? (
              <div className="card p-12 text-center">
                <FileText size={48} className="mx-auto text-brand-muted dark:text-brand-dark-muted mb-3 opacity-40" />
                <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text">You haven't purchased any notes or resources yet</h3>
                <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1 max-w-sm mx-auto mb-5">
                  Browse our curated collection of notes, roadmaps, formula sheets, and lab manuals.
                </p>
                <a href="/resources" className="btn-primary inline-flex text-xs px-5 py-2.5">
                  Explore Resources
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrolledResourcesWithMeta.map((item) => (
                  <div key={item.enrollment.id} className="card overflow-hidden flex flex-col justify-between">
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="badge text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                          {item.type}
                        </span>
                        <span className="text-[11px] text-brand-muted dark:text-brand-dark-muted">
                          Purchased on {new Date(item.enrollment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-brand-text dark:text-brand-dark-text mb-2 line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-brand-muted dark:text-brand-dark-muted line-clamp-2 mb-4">
                        {item.description}
                      </p>
                    </div>
                    <div className="p-5 pt-0 border-t border-brand-border dark:border-brand-dark-border mt-auto">
                      <div className="flex items-center justify-between text-xs text-brand-muted dark:text-brand-dark-muted py-3">
                        <span>Paid: ₹{item.enrollment.amount}</span>
                        <span className="text-emerald-500 font-semibold">Active & Unlocked</span>
                      </div>
                      <button
                        onClick={() => handleDownloadPurchasedResource(item)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        <Download size={13} /> Download Resource
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

            {/* Transactions List — Responsive Table on Desktop, Cards on Mobile */}
            <div className="card overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      {['Item / Course', 'Type', 'Amount', 'UTR / Ref Number', 'Skills021 Access Status', 'Date Submitted'].map((h) => (
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
                      const isSkills021Grant =
                        enr.utrNumber === 'Granted by Skills021' ||
                        enr.utrNumber === 'GRANTED_BY_SKILLS021' ||
                        Boolean(enr.utrNumber?.toLowerCase().includes('skills021')) ||
                        (!enr.utrNumber && !enr.screenshotUrl && (enr.status === 'paid' || enr.status === 'free'))
                      const cleanReason = (enr.rejectionReason || '').replace(/admin/gi, 'Skills021')

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
                            {isSkills021Grant ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-primary-600 dark:text-primary-400 text-xs bg-primary-50 dark:bg-primary-900/20 px-2.5 py-1 rounded-lg border border-primary-500/20">
                                <Sparkles size={11} className="text-amber-500" /> Granted by Skills021
                              </span>
                            ) : enr.utrNumber ? (
                              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded">
                                {enr.utrNumber}
                              </span>
                            ) : (
                              <span className="text-xs text-brand-muted italic">N/A (Free)</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isSkills021Grant ? (
                              <span className="badge text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold flex items-center gap-1 w-fit shadow-sm">
                                ✅ GRANTED BY SKILLS021
                              </span>
                            ) : isPaid ? (
                              <span className="badge text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">
                                ✅ APPROVED BY SKILLS021
                              </span>
                            ) : isPending ? (
                              <span className="badge text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold animate-pulse">
                                ⏳ PENDING SKILLS021 VERIFICATION
                              </span>
                            ) : isRejected ? (
                              <span className="badge text-xs bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-bold">
                                ❌ REJECTED {cleanReason ? `(${cleanReason})` : ''}
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

              {/* Mobile Cards View */}
              <div className="sm:hidden divide-y divide-brand-border dark:divide-brand-dark-border">
                {enrollments.length === 0 ? (
                  <div className="p-8 text-center text-brand-muted text-xs">
                    No transaction records found.
                  </div>
                ) : (
                  enrollments.map((enr) => {
                    const matched = coursesList.find((c) => String(c.id) === String(enr.courseId))
                    const isPremium = enr.itemType === 'premium_membership'
                    const isPaid = enr.status === 'paid'
                    const isPending = enr.status === 'pending'
                    const isRejected = enr.status === 'rejected'
                    const isSkills021Grant =
                      enr.utrNumber === 'Granted by Skills021' ||
                      enr.utrNumber === 'GRANTED_BY_SKILLS021' ||
                      Boolean(enr.utrNumber?.toLowerCase().includes('skills021')) ||
                      (!enr.utrNumber && !enr.screenshotUrl && (enr.status === 'paid' || enr.status === 'free'))
                    const cleanReason = (enr.rejectionReason || '').replace(/admin/gi, 'Skills021')

                    return (
                      <div key={enr.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-sm text-brand-text dark:text-brand-dark-text leading-snug">
                            {enr.itemTitle || matched?.title || (isPremium ? 'All-Access Premium Membership' : `Course #${enr.courseId}`)}
                          </p>
                          <span className="font-bold text-sm text-brand-text dark:text-brand-dark-text shrink-0">
                            {enr.amount > 0 ? `₹${enr.amount}` : 'FREE'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span
                            className={`badge text-[10px] font-bold ${
                              isSkills021Grant || isPaid
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : isPending
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : isRejected
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isSkills021Grant
                              ? '✅ GRANTED BY SKILLS021'
                              : isPaid
                              ? '✅ APPROVED BY SKILLS021'
                              : isPending
                              ? '⏳ PENDING VERIFICATION'
                              : isRejected
                              ? `❌ REJECTED ${cleanReason ? `(${cleanReason})` : ''}`
                              : 'FREE'}
                          </span>
                          <span className="text-[11px] text-brand-muted">
                            {enr.createdAt ? new Date(enr.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>

                        <div className="text-[11px] text-brand-muted bg-gray-50 dark:bg-white/5 px-2.5 py-1 rounded-lg flex items-center justify-between">
                          <span>UTR / Ref:</span>
                          {isSkills021Grant ? (
                            <span className="font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                              <Sparkles size={11} className="text-amber-500" /> Granted by Skills021
                            </span>
                          ) : enr.utrNumber ? (
                            <span className="font-mono font-bold text-brand-text dark:text-brand-dark-text">{enr.utrNumber}</span>
                          ) : (
                            <span className="italic">N/A (Free)</span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )

      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Profile Settings</h2>
                {profileCompletion.percentage === 100 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 shadow-xs">
                    <CheckCircle size={13} className="text-emerald-500" />
                    Profile Completed
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-0.5">
                Manage your profile picture, personal information &amp; password
              </p>
            </div>

            {/* Profile Completion Ring Card - Only shown when profile is incomplete (< 100%) */}
            {profileCompletion.percentage < 100 && (
              <div className="card p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* SVG Ring */}
                  <div className="relative flex-shrink-0">
                    <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-white/10" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        strokeWidth="8" strokeLinecap="round"
                        stroke={profileCompletion.percentage >= 70 ? '#f59e0b' : '#ef4444'}
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - profileCompletion.percentage / 100)}`}
                        style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.5s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-brand-text dark:text-brand-dark-text">{profileCompletion.percentage}%</span>
                      <span className="text-[9px] font-semibold text-brand-muted uppercase tracking-wider">Complete</span>
                    </div>
                  </div>

                  {/* Info Text & Missing Fields */}
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2 justify-center sm:justify-start">
                      <Target size={18} className="text-primary-500" />
                      {profileCompletion.percentage >= 70
                        ? '✨ Almost there!'
                        : '📝 Complete your profile'}
                    </h3>
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1">
                      {`Fill in ${profileCompletion.missing.length} more field${profileCompletion.missing.length > 1 ? 's' : ''} to complete your profile.`}
                    </p>
                    {profileCompletion.missing.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
                        {profileCompletion.missing.map((field) => (
                          <span
                            key={field}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30"
                          >
                            <AlertCircle size={10} />
                            {field}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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

                  {/* Age */}
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">
                      Age
                    </label>
                    <div className="relative">
                      <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="number"
                        min={16}
                        max={60}
                        value={profileForm.age}
                        onChange={(e) => setProfileForm((p) => ({ ...p, age: e.target.value }))}
                        placeholder="e.g. 20"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Branch */}
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">
                      Branch / Department
                    </label>
                    <div className="relative">
                      <GraduationCap size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <select
                        value={profileForm.branch}
                        onChange={(e) => setProfileForm((p) => ({ ...p, branch: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
                      >
                        <option value="">Select your branch</option>
                        {branchOptions.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                    </div>
                  </div>

                  {/* Current Semester */}
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">
                      Current Semester
                    </label>
                    <div className="relative">
                      <BookMarked size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <select
                        value={profileForm.currentSemester}
                        onChange={(e) => {
                          const val = e.target.value
                          setProfileForm((p) => ({ ...p, currentSemester: val }))
                        }}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
                      >
                        <option value="">Select semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={s}>Semester {s}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                    </div>
                  </div>

                  {/* Year of Study (auto) */}
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">
                      Year of Study
                    </label>
                    <div className="relative">
                      <School size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="text"
                        value={profileForm.currentSemester ? getYearFromSemester(Number(profileForm.currentSemester)) : '—'}
                        disabled
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-gray-50 dark:bg-white/5 text-sm text-brand-muted dark:text-brand-dark-muted cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[10px] text-brand-muted mt-1 italic">Auto-calculated from semester</p>
                  </div>
                </div>

                {/* Bio */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">
                    <FileText size={14} className="inline mr-1.5 text-brand-muted" />
                    Short Bio
                    <span className="text-[10px] text-brand-muted ml-2 font-normal">({(profileForm.bio || '').length}/200)</span>
                  </label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => {
                      if (e.target.value.length <= 200) {
                        setProfileForm((p) => ({ ...p, bio: e.target.value }))
                      }
                    }}
                    rows={3}
                    placeholder="Tell us a bit about yourself..."
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
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

            {/* Academic Record (SGPA) Section */}
            {profileForm.currentSemester && Number(profileForm.currentSemester) >= 2 && (
              <div className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSGPASection(!showSGPASection)}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-primary-500" />
                    <h3 className="font-bold text-brand-text dark:text-brand-dark-text">
                      Academic Record
                    </h3>
                    <span className="badge text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold">
                      Optional
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const sgpa = profileForm.semesterSGPA || {}
                      const vals = Object.values(sgpa).filter((v) => v > 0)
                      if (vals.length > 0) {
                        const cgpa = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
                        return (
                          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                            CGPA: {cgpa}
                          </span>
                        )
                      }
                      return null
                    })()}
                    {showSGPASection ? (
                      <ChevronUp size={18} className="text-brand-muted" />
                    ) : (
                      <ChevronDown size={18} className="text-brand-muted" />
                    )}
                  </div>
                </button>

                {showSGPASection && (
                  <div className="px-6 pb-6 space-y-5 border-t border-brand-border dark:border-brand-dark-border pt-5">
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted">
                      Enter your SGPA for each completed semester. This helps track your academic progress.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {Array.from({ length: Number(profileForm.currentSemester) - 1 }, (_, i) => i + 1).map((sem) => {
                        const val = profileForm.semesterSGPA?.[String(sem)] ?? ''
                        const barWidth = val ? Math.min((Number(val) / 10) * 100, 100) : 0
                        const barColor = Number(val) >= 8 ? 'bg-emerald-500' : Number(val) >= 6 ? 'bg-amber-500' : Number(val) >= 4 ? 'bg-orange-500' : 'bg-red-500'

                        return (
                          <div key={sem} className="bg-gray-50 dark:bg-white/5 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">
                                Sem {sem}
                              </span>
                              {val && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  Number(val) >= 8 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : Number(val) >= 6 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {Number(val) >= 8 ? 'Excellent' : Number(val) >= 6 ? 'Good' : 'Needs Work'}
                                </span>
                              )}
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="10"
                              value={val}
                              onChange={(e) => {
                                const v = e.target.value
                                if (v === '' || (Number(v) >= 0 && Number(v) <= 10)) {
                                  setProfileForm((p) => ({
                                    ...p,
                                    semesterSGPA: {
                                      ...p.semesterSGPA,
                                      [String(sem)]: v === '' ? 0 : Number(v),
                                    },
                                  }))
                                }
                              }}
                              placeholder="0.00 – 10.00"
                              className="w-full px-3 py-2 rounded-lg border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 text-center font-mono"
                            />
                            {/* Mini progress bar */}
                            <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${barColor} transition-all duration-500`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* CGPA Summary */}
                    {(() => {
                      const sgpa = profileForm.semesterSGPA || {}
                      const vals = Object.values(sgpa).filter((v) => v > 0)
                      if (vals.length === 0) return null
                      const cgpa = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
                      const maxSgpa = Math.max(...vals).toFixed(2)
                      const minSgpa = Math.min(...vals).toFixed(2)
                      return (
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div className="bg-gradient-to-br from-primary-500/10 to-indigo-500/10 dark:from-primary-500/20 dark:to-indigo-500/20 rounded-xl p-4 text-center border border-primary-200/50 dark:border-primary-500/20">
                            <p className="text-[10px] text-brand-muted uppercase tracking-wider font-semibold">CGPA</p>
                            <p className="text-xl font-black text-primary-600 dark:text-primary-400 mt-0.5">{cgpa}</p>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-4 text-center border border-emerald-200/50 dark:border-emerald-500/20">
                            <p className="text-[10px] text-brand-muted uppercase tracking-wider font-semibold">Highest</p>
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{maxSgpa}</p>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 text-center border border-amber-200/50 dark:border-amber-500/20">
                            <p className="text-[10px] text-brand-muted uppercase tracking-wider font-semibold">Lowest</p>
                            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{minSgpa}</p>
                          </div>
                        </div>
                      )
                    })()}

                    <div className="pt-2">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        disabled={savingProfile}
                        onClick={async () => {
                          setSavingProfile(true)
                          const semNum = profileForm.currentSemester ? Number(profileForm.currentSemester) : undefined
                          const success = await updateProfileInSupabase({
                            semesterSGPA: profileForm.semesterSGPA,
                            currentSemester: semNum,
                            yearOfStudy: semNum ? getYearFromSemester(semNum) : undefined,
                          })
                          setSavingProfile(false)
                          if (success) toast.success('Academic record saved! 📚')
                          else toast.error('Failed to save academic record.')
                        }}
                        className="flex items-center gap-2 btn-primary disabled:opacity-60 text-xs px-5 py-2.5"
                      >
                        {savingProfile ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Save size={15} />
                        )}
                        {savingProfile ? 'Saving...' : 'Save Academic Record'}
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            )}

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

            {/* Haptic & Tactile Feedback Preferences */}
            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2">
                    <Smartphone size={18} className="text-primary-500" />
                    Haptic & Tactile Experience
                  </h3>
                  <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-1">
                    Configure device vibrations and subtle tactile clicks for buttons, quizzes, and navigation across the entire website.
                  </p>
                </div>
                <span className="badge text-[11px] px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Haptic Vibration Toggle */}
                <div className="p-4 rounded-xl border border-brand-border dark:border-brand-dark-border bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-brand-text dark:text-brand-dark-text flex items-center gap-1.5">
                      <Smartphone size={15} className="text-primary-500" />
                      Mobile Vibration
                    </p>
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted">
                      Native motor vibration on supported mobile devices & PWAs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !hapticsEnabled
                      setHapticsEnabled(next)
                      haptic.setEnabled(next)
                      if (next) haptic.success()
                    }}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hapticsEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Tactile Audio Micro-clicks Toggle */}
                <div className="p-4 rounded-xl border border-brand-border dark:border-brand-dark-border bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-brand-text dark:text-brand-dark-text flex items-center gap-1.5">
                      <Volume2 size={15} className="text-primary-500" />
                      Tactile Micro-response
                    </p>
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted">
                      Subtle tactile feedback for desktop & non-vibrating devices.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !hapticsSoundEnabled
                      setHapticsSoundEnabled(next)
                      haptic.setSoundEnabled(next)
                      if (next) haptic.light()
                    }}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hapticsSoundEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        hapticsSoundEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Live Test Patterns */}
              <div className="pt-2 border-t border-brand-border dark:border-brand-dark-border">
                <p className="text-xs font-semibold text-brand-text dark:text-brand-dark-text mb-2.5">
                  Test Feedback Patterns:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-haptic="light"
                    onClick={() => haptic.light()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-brand-text dark:text-brand-dark-text transition-colors"
                  >
                    Light Tap
                  </button>
                  <button
                    type="button"
                    data-haptic="medium"
                    onClick={() => haptic.medium()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-brand-text dark:text-brand-dark-text transition-colors"
                  >
                    Medium Click
                  </button>
                  <button
                    type="button"
                    data-haptic="heavy"
                    onClick={() => haptic.heavy()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-brand-text dark:text-brand-dark-text transition-colors"
                  >
                    Heavy Impact
                  </button>
                  <button
                    type="button"
                    data-haptic="success"
                    onClick={() => haptic.success()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    Success Pulse 🎉
                  </button>
                  <button
                    type="button"
                    data-haptic="warning"
                    onClick={() => haptic.warning()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    Warning Pulse ⚠️
                  </button>
                  <button
                    type="button"
                    data-haptic="error"
                    onClick={() => haptic.error()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                  >
                    Error Pulse ❌
                  </button>
                </div>
              </div>
            </div>
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
                {user?.branch && (
                  <span className="mt-1 badge bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-[10px]">
                    {user.branch}
                  </span>
                )}
                {user?.currentSemester && (
                  <span className="mt-1 badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                    Sem {user.currentSemester} · {getYearFromSemester(user.currentSemester)}
                  </span>
                )}
                {user?.phone && (
                  <span className="text-[11px] text-brand-muted dark:text-brand-dark-muted mt-1 flex items-center gap-1">
                    <Phone size={11} /> {user.phone}
                  </span>
                )}

                {/* Completion Status */}
                {profileCompletion.percentage === 100 ? (
                  <div className="mt-3 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 text-xs font-semibold w-full">
                    <CheckCircle size={14} className="text-emerald-500" />
                    Profile Completed
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2.5 w-full">
                    <div className="relative flex-shrink-0">
                      <svg width="36" height="36" viewBox="0 0 36 36" className="transform -rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200 dark:text-white/10" />
                        <circle
                          cx="18" cy="18" r="14" fill="none"
                          strokeWidth="3" strokeLinecap="round"
                          stroke={profileCompletion.percentage >= 70 ? '#f59e0b' : '#ef4444'}
                          strokeDasharray={`${2 * Math.PI * 14}`}
                          strokeDashoffset={`${2 * Math.PI * 14 * (1 - profileCompletion.percentage / 100)}`}
                          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-brand-text dark:text-brand-dark-text">{profileCompletion.percentage}%</span>
                    </div>
                    <span className="text-[10px] text-brand-muted dark:text-brand-dark-muted font-medium">Profile ({profileCompletion.percentage}%)</span>
                  </div>
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

                <div className="pt-2 border-t border-brand-border dark:border-brand-dark-border mt-2">
                  <button
                    type="button"
                    onClick={() => setShowLogoutModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors cursor-pointer"
                  >
                    <LogOut size={17} />
                    Sign Out
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 pb-20 lg:pb-0">
            {/* Mobile Segmented Tab Switcher at Top of Content */}
            <div className="lg:hidden mb-5 flex gap-1.5 overflow-x-auto no-scrollbar p-1.5 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-brand-dark-border">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeTab === item.id
                      ? 'bg-white dark:bg-brand-dark-card text-primary-600 dark:text-primary-400 shadow-xs'
                      : 'text-brand-muted dark:text-brand-dark-muted hover:text-brand-text'
                  }`}
                >
                  <item.icon size={15} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

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
          premiumAmount={allAccessPrice}
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

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        isAdmin={false}
        userNameOrEmail={user?.email || user?.name}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  )
}
