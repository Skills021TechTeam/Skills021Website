import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, BookOpen, GraduationCap, Trophy, Settings,
  Clock, CheckCircle, TrendingUp, Play, ExternalLink, Save,
  User, Phone, School, Lock, ChevronRight, AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { courses } from '../data/courses'
import toast from 'react-hot-toast'

type DashboardTab = 'overview' | 'courses' | 'counseling' | 'hackathons' | 'profile'

const sidebarItems = [
  { id: 'overview' as DashboardTab, label: 'Overview', icon: LayoutDashboard },
  { id: 'courses' as DashboardTab, label: 'My Courses', icon: BookOpen },
  { id: 'counseling' as DashboardTab, label: 'Counseling Status', icon: GraduationCap },
  { id: 'hackathons' as DashboardTab, label: 'Hackathons', icon: Trophy },
  { id: 'profile' as DashboardTab, label: 'Profile Settings', icon: Settings },
]

// Mock enrolled courses for demo
const mockProgress = ['course-1', 'course-3', 'course-6']
const progressData: Record<string, number> = { 'course-1': 65, 'course-3': 30, 'course-6': 10 }

export default function UserDashboard() {
  const { user, updateProfile } = useAuthStore()
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    college: user?.college || '',
    phone: user?.phone || '',
    password: '',
    confirmPassword: '',
  })
  const [saving, setSaving] = useState(false)

  const enrolledCourses = courses.filter(c => mockProgress.includes(c.id))
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    updateProfile({ name: profileForm.name, college: profileForm.college, phone: profileForm.phone })
    setSaving(false)
    toast.success('Profile updated successfully!')
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">
                Welcome back, {user?.name?.split(' ')[0]}! 👋
              </h2>
              <p className="text-brand-muted dark:text-brand-dark-muted mt-1">Here's your learning progress</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Enrolled Courses', value: '3', icon: BookOpen, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
                { label: 'Completed', value: '0', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
                { label: 'Hours Learned', value: '24', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Hackathons', value: '2', icon: Trophy, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
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
              <h3 className="font-bold text-brand-text dark:text-brand-dark-text mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-primary-500" />
                Continue Learning
              </h3>
              <div className="space-y-3">
                {enrolledCourses.slice(0, 2).map((course) => (
                  <div key={course.id} className="card p-4 flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${course.gradientFrom}, ${course.gradientTo})` }}
                    >
                      <BookOpen size={22} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-brand-text dark:text-brand-dark-text truncate">{course.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 bg-gray-200 dark:bg-white/10 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-primary-500"
                            style={{ width: `${progressData[course.id] || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-brand-muted dark:text-brand-dark-muted whitespace-nowrap">
                          {progressData[course.id] || 0}%
                        </span>
                      </div>
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 text-white text-xs font-semibold rounded-xl hover:bg-primary-600 transition-colors flex-shrink-0">
                      <Play size={12} /> Continue
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="font-bold text-brand-text dark:text-brand-dark-text mb-4">Recent Activity</h3>
              <div className="card overflow-hidden">
                {[
                  { text: 'Enrolled in "DSA with Java — Complete Bootcamp"', time: '2 days ago', icon: BookOpen, color: 'text-primary-500' },
                  { text: 'Completed Module 3: Linked Lists', time: '3 days ago', icon: CheckCircle, color: 'text-green-500' },
                  { text: 'Applied for AKTU Counseling', time: '1 week ago', icon: GraduationCap, color: 'text-teal-500' },
                  { text: 'Registered for XEN-O-THON 2026', time: '1 week ago', icon: Trophy, color: 'text-amber-500' },
                ].map((activity, i) => (
                  <div key={i} className={`flex items-center gap-3 px-5 py-4 ${i !== 3 ? 'border-b border-brand-border dark:border-brand-dark-border' : ''}`}>
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                      <activity.icon size={15} className={activity.color} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-brand-text dark:text-brand-dark-text">{activity.text}</p>
                    </div>
                    <span className="text-xs text-brand-muted dark:text-brand-dark-muted whitespace-nowrap">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'courses':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">My Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrolledCourses.map((course) => (
                <div key={course.id} className="card overflow-hidden">
                  <div
                    className="h-28 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${course.gradientFrom}, ${course.gradientTo})` }}
                  >
                    <BookOpen size={36} className="text-white/60" />
                  </div>
                  <div className="p-5">
                    <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-xs mb-2">{course.category}</span>
                    <h3 className="font-bold text-sm text-brand-text dark:text-brand-dark-text mb-3">{course.title}</h3>
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-brand-muted dark:text-brand-dark-muted mb-1.5">
                        <span>Progress</span>
                        <span className="font-semibold">{progressData[course.id] || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-primary-500 transition-all duration-1000"
                          style={{ width: `${progressData[course.id] || 0}%` }}
                        />
                      </div>
                    </div>
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-colors">
                      <Play size={14} /> Continue Learning
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'counseling':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Counseling Status</h2>
            <div className="space-y-4">
              {[
                { program: 'AKTU Counseling', applied: '2025-05-12', status: 'Under Review', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
                { program: 'JoSAA Counseling', applied: '2025-05-18', status: 'Pending', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800' },
              ].map((app) => (
                <div key={app.program} className="card p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                      <GraduationCap size={22} className="text-primary-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-brand-text dark:text-brand-dark-text">{app.program}</p>
                      <p className="text-xs text-brand-muted dark:text-brand-dark-muted">Applied: {app.applied}</p>
                    </div>
                  </div>
                  <span className={`badge ${app.bg} ${app.color} text-xs`}>{app.status}</span>
                </div>
              ))}
            </div>
            <div className="card p-6 border-2 border-dashed border-primary-200 dark:border-primary-900/50 text-center">
              <GraduationCap size={32} className="text-primary-400 mx-auto mb-3" />
              <h3 className="font-bold text-brand-text dark:text-brand-dark-text mb-2">Apply for More Programs</h3>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-4">Get expert guidance for IPU, JAC Delhi, and more</p>
              <a
                href="https://forms.gle/BpcgGfoKjG1SVgFPA"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 btn-primary text-sm"
              >
                <ExternalLink size={14} /> Apply Now
              </a>
            </div>
          </div>
        )

      case 'hackathons':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">My Hackathons</h2>
            <div className="space-y-4">
              {[
                { name: 'XEN-O-THON 2026', status: 'Registered', date: 'Jun 15-17, 2026', mode: 'Offline', prize: '₹50,000' },
                { name: 'Delhi Hacks 2026', status: 'Interested', date: 'Sep 5-6, 2026', mode: 'Offline', prize: '₹25,000' },
              ].map((h) => (
                <div key={h.name} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                        <Trophy size={22} className="text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-brand-text dark:text-brand-dark-text">{h.name}</p>
                        <p className="text-xs text-brand-muted dark:text-brand-dark-muted">{h.date} · {h.mode} · {h.prize}</p>
                      </div>
                    </div>
                    <span className={`badge text-xs ${h.status === 'Registered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {h.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <a href="/hackathons" className="inline-flex items-center gap-2 text-primary-500 text-sm font-semibold hover:underline">
                Browse All Hackathons <ChevronRight size={16} />
              </a>
            </div>
          </div>
        )

      case 'profile':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-text dark:text-brand-dark-text">Profile Settings</h2>
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="card p-6 space-y-5">
                <h3 className="font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2">
                  <User size={18} className="text-primary-500" /> Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">Email (read-only)</label>
                    <div className="relative">
                      <AlertCircle size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input type="email" value={user?.email} disabled className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-gray-50 dark:bg-white/5 text-sm text-brand-muted dark:text-brand-dark-muted cursor-not-allowed" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">Phone</label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">College</label>
                    <div className="relative">
                      <School size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="text"
                        value={profileForm.college}
                        onChange={e => setProfileForm(p => ({ ...p, college: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6 space-y-4">
                <h3 className="font-bold text-brand-text dark:text-brand-dark-text flex items-center gap-2">
                  <Lock size={18} className="text-primary-500" /> Change Password
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="password"
                        value={profileForm.password}
                        onChange={e => setProfileForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="Leave blank to keep current"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-brand-dark-text mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="password"
                        value={profileForm.confirmPassword}
                        onChange={e => setProfileForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        placeholder="Repeat new password"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-white dark:bg-brand-dark-bg text-sm text-brand-text dark:text-brand-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 btn-primary disabled:opacity-60"
              >
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </motion.button>
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
                <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl font-bold mb-3">
                  {getInitials(user?.name || 'U')}
                </div>
                <h3 className="font-bold text-brand-text dark:text-brand-dark-text">{user?.name}</h3>
                <p className="text-xs text-brand-muted dark:text-brand-dark-muted mt-0.5">{user?.email}</p>
                <span className="mt-2 badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-xs">
                  {user?.college}
                </span>
              </div>
              <nav className="space-y-1">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeTab === item.id
                        ? 'bg-primary-500 text-white shadow-sm'
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
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                  activeTab === item.id ? 'text-primary-500' : 'text-brand-muted dark:text-brand-dark-muted'
                }`}
              >
                <item.icon size={20} />
                <span className="hidden sm:block">{item.label.split(' ')[0]}</span>
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
    </div>
  )
}
