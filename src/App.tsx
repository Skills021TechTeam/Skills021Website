import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminLogin from './pages/AdminLogin'
import Courses from './pages/Courses'
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
import { supabase, getUserProfile } from './lib/supabase'
import { getEnrollmentsForUser } from './lib/videoEngagementService'
import { useAuthStore, User } from './store/authStore'
import MobileBottomNav from './components/MobileBottomNav'
import WebinarVisitPopup from './components/WebinarVisitPopup'

// Apply saved dark mode preference on load
const applyTheme = () => {
  const saved = localStorage.getItem('skills021_theme')
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
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected Learning & Platform Features */}
            <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
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
    const syncUserFromSupabase = async (u: any) => {
      try {
        const [profile, enrollments] = await Promise.all([
          getUserProfile(u.id).catch(() => null),
          getEnrollmentsForUser(u.id).catch(() => []),
        ])

        const mappedUser: User = {
          id: u.id,
          name: profile?.name || u.user_metadata?.name || u.email?.split('@')[0] || 'User',
          email: u.email || '',
          role: profile?.role || u.user_metadata?.role || 'user',
          college: profile?.college || u.user_metadata?.college || 'Student Institution',
          phone: profile?.phone || u.user_metadata?.phone || '',
          avatarUrl: profile?.avatar_url || u.user_metadata?.avatar_url || '',
          isPremium: Boolean(profile?.is_premium ?? u.user_metadata?.is_premium ?? false),
          joinedDate: profile?.created_at
            ? new Date(profile.created_at).toISOString().split('T')[0]
            : new Date(u.created_at).toISOString().split('T')[0],
          enrolledCourses: enrollments.map(e => e.courseId),
        }
        setUser(mappedUser)
      } catch {
        const mappedUser: User = {
          id: u.id,
          name: u.user_metadata?.name || u.email?.split('@')[0] || 'User',
          email: u.email || '',
          role: u.user_metadata?.role || 'user',
          college: u.user_metadata?.college || 'Student Institution',
          phone: u.user_metadata?.phone || '',
          avatarUrl: u.user_metadata?.avatar_url || '',
          isPremium: Boolean(u.user_metadata?.is_premium ?? false),
          joinedDate: new Date(u.created_at).toISOString().split('T')[0],
          enrolledCourses: [],
        }
        setUser(mappedUser)
      }
    }

    // On mount: verify the actual Supabase session and reconcile persisted state.
    // This clears stale localStorage auth if the session expired or was revoked.
    hydrateFromSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        // Clear ALL auth state — including admin flags — on real sign-out
        logout()
      } else if (session?.user) {
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
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A2E',
            color: '#F1F1FF',
            borderRadius: '12px',
            border: '1px solid #2A2A3D',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#00BFA6', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  )
}
