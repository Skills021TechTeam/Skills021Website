import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import CustomToaster from './components/CustomToaster'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import AdminLogin from './pages/AdminLogin'
import Courses from './pages/Courses'
import SubjectBundleView from './pages/SubjectBundleView'
import Resources from './pages/Resources'
import PathFinder from './pages/PathFinder'
import VideosBrowse from './pages/VideosBrowse'
import Quizzes from './pages/Quizzes'
import Roadmaps from './pages/Roadmaps'
import Mentorship from './pages/Mentorship'
import Hackathons from './pages/Hackathons'
import HackathonDetails from './pages/HackathonDetails'
import UserDashboard from './pages/UserDashboard'
import AdminDashboard from './pages/AdminDashboard'
import Apply from './pages/Apply'
import Contact from './pages/Contact'
import Blog from './pages/Blog'
import { supabase, getUserProfile } from './lib/supabase'
import { getEnrollmentsForUser } from './lib/videoEngagementService'
import { useAuthStore, User } from './store/authStore'
import MobileBottomNav from './components/MobileBottomNav'
import WebinarVisitPopup from './components/WebinarVisitPopup'
import NewCoursePopup from './components/NewCoursePopup'
import CookieBanner from './components/CookieBanner'
import { initGlobalHaptics } from './lib/haptics'
import { getCookie } from './lib/cookieService'

// Apply saved dark mode preference on load
const applyTheme = () => {
  const saved = localStorage.getItem('skills021_theme') || getCookie('skills021_theme')
  if (saved === 'dark') document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
}
applyTheme()

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 },
}

const pageTransition = { type: 'tween', ease: 'easeInOut', duration: 0.22 } as const

const noFooterRoutes = ['/dashboard', '/admin']

function AnimatedRoutes() {
  const location = useLocation()
  const showFooter = !noFooterRoutes.some(r => location.pathname.startsWith(r))

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
          className="min-h-screen"
        >
          <Routes location={location} key={location.pathname}>
            {/* Public Home & Auth Pages */}
            <Route path="/" element={<Home />} />
            <Route path="/apply" element={<Apply />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected Learning & Platform Features */}
            <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
            <Route path="/courses/bundles/:subjectId" element={<ProtectedRoute><SubjectBundleView /></ProtectedRoute>} />
            <Route path="/subject-bundles/:subjectId" element={<ProtectedRoute><SubjectBundleView /></ProtectedRoute>} />
            <Route path="/resources/bundles/:subjectId" element={<ProtectedRoute><SubjectBundleView /></ProtectedRoute>} />
            <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
            <Route path="/resources/videos" element={<ProtectedRoute><VideosBrowse /></ProtectedRoute>} />
            <Route path="/pathfinder" element={<ProtectedRoute><PathFinder /></ProtectedRoute>} />
            <Route path="/quizzes" element={<ProtectedRoute><Quizzes /></ProtectedRoute>} />
            <Route path="/roadmaps" element={<ProtectedRoute><Roadmaps /></ProtectedRoute>} />
            <Route path="/mentorship" element={<ProtectedRoute><Mentorship /></ProtectedRoute>} />
            <Route path="/hackathons" element={<ProtectedRoute><Hackathons /></ProtectedRoute>} />
            <Route path="/hackathons/:id" element={<ProtectedRoute><HackathonDetails /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />

            {/* Admin Portal */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {showFooter && <Footer />}
    </>
  )
}

export default function App() {
  const setUser = useAuthStore(s => s.setUser)
  const hydrateFromSession = useAuthStore(s => s.hydrateFromSession)
  const logout = useAuthStore(s => s.logout)

  useEffect(() => {
    return initGlobalHaptics()
  }, [])

  useEffect(() => {
    let hasHydrated = false

    const syncUserFromSupabase = async (u: any) => {
      try {
        const [profile, enrollments] = await Promise.all([
          getUserProfile(u.id).catch(() => null),
          getEnrollmentsForUser(u.id).catch(() => []),
        ])

        const configuredAdminEmail = ((import.meta.env.VITE_ADMIN_ID as string) || '').toLowerCase().trim()
        const isConfiguredAdmin = Boolean(configuredAdminEmail) && (u.email || '').toLowerCase().trim() === configuredAdminEmail
        const isCurrentAdmin = useAuthStore.getState().isAdminAuthenticated || useAuthStore.getState().user?.role === 'admin'
        const isAdmin = profile?.role === 'admin' || u.user_metadata?.role === 'admin' || isConfiguredAdmin || isCurrentAdmin

        const mappedUser: User = {
          id: u.id,
          name: profile?.name || u.user_metadata?.name || u.email?.split('@')[0] || (isAdmin ? 'System Administrator' : 'User'),
          email: u.email || '',
          role: isAdmin ? 'admin' : 'user',
          college: profile?.college || u.user_metadata?.college || (isAdmin ? 'Skills021 Central HQ' : 'Student Institution'),
          phone: profile?.phone || u.user_metadata?.phone || '',
          avatarUrl: profile?.avatar_url || u.user_metadata?.avatar_url || '',
          isPremium: Boolean(profile?.is_premium ?? u.user_metadata?.is_premium ?? isAdmin),
          joinedDate: profile?.created_at
            ? new Date(profile.created_at).toISOString().split('T')[0]
            : new Date(u.created_at).toISOString().split('T')[0],
          enrolledCourses: enrollments.map(e => e.courseId),
          age: profile?.age ?? u.user_metadata?.age,
          branch: profile?.branch ?? u.user_metadata?.branch ?? '',
          currentSemester: profile?.current_semester ?? u.user_metadata?.current_semester,
          semesterSGPA: profile?.semester_sgpa ?? u.user_metadata?.semester_sgpa ?? {},
          yearOfStudy: profile?.year_of_study ?? u.user_metadata?.year_of_study ?? '',
          bio: profile?.bio ?? u.user_metadata?.bio ?? '',
        }
        setUser(mappedUser)
      } catch {
        const configuredAdminEmail = ((import.meta.env.VITE_ADMIN_ID as string) || '').toLowerCase().trim()
        const isConfiguredAdmin = Boolean(configuredAdminEmail) && (u.email || '').toLowerCase().trim() === configuredAdminEmail
        const isCurrentAdmin = useAuthStore.getState().isAdminAuthenticated || useAuthStore.getState().user?.role === 'admin'
        const isAdmin = u.user_metadata?.role === 'admin' || isConfiguredAdmin || isCurrentAdmin

        const mappedUser: User = {
          id: u.id,
          name: u.user_metadata?.name || u.email?.split('@')[0] || (isAdmin ? 'System Administrator' : 'User'),
          email: u.email || '',
          role: isAdmin ? 'admin' : 'user',
          college: u.user_metadata?.college || (isAdmin ? 'Skills021 Central HQ' : 'Student Institution'),
          phone: u.user_metadata?.phone || '',
          avatarUrl: u.user_metadata?.avatar_url || '',
          isPremium: Boolean(u.user_metadata?.is_premium ?? isAdmin),
          joinedDate: new Date(u.created_at).toISOString().split('T')[0],
          enrolledCourses: [],
          age: u.user_metadata?.age,
          branch: u.user_metadata?.branch ?? '',
          currentSemester: u.user_metadata?.current_semester,
          semesterSGPA: u.user_metadata?.semester_sgpa ?? {},
          yearOfStudy: u.user_metadata?.year_of_study ?? '',
          bio: u.user_metadata?.bio ?? '',
        }
        setUser(mappedUser)
      }
    }

    // On mount: verify the actual Supabase session and reconcile persisted state.
    // This clears stale localStorage auth if the session expired or was revoked.
    hydrateFromSession().then(() => { hasHydrated = true })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip INITIAL_SESSION — hydrateFromSession already handles it to avoid duplicate fetches
      if (event === 'INITIAL_SESSION') return

      const authState = useAuthStore.getState()
      const isLocalAdmin = authState.isAdminAuthenticated || authState.user?.role === 'admin'

      if (event === 'SIGNED_OUT' || !session) {
        // Only clear state on real student sign-out, never log out an active Admin
        if (!isLocalAdmin) {
          logout()
        }
      } else if (session?.user && hasHydrated) {
        syncUserFromSupabase(session.user)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, hydrateFromSession, logout])

  return (
    <BrowserRouter>
      <Navbar />
      <div className="pb-16 lg:pb-0">
        <AnimatedRoutes />
      </div>
      <MobileBottomNav />
      <WebinarVisitPopup />
      <NewCoursePopup />
      <CookieBanner />
      <CustomToaster />
    </BrowserRouter>
  )
}
