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
import Courses from './pages/Courses'
import Resources from './pages/Resources'
import VideosBrowse from './pages/VideosBrowse'
import Quizzes from './pages/Quizzes'
import Roadmaps from './pages/Roadmaps'
import Counseling from './pages/Counseling'
import Hackathons from './pages/Hackathons'
import Internships from './pages/Internships'
import Mentorship from './pages/Mentorship'
import SuccessStories from './pages/SuccessStories'
import UserDashboard from './pages/UserDashboard'
import AdminDashboard from './pages/AdminDashboard'

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
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Courses */}
            <Route path="/courses" element={<Courses />} />
            {/* Resources */}
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/videos" element={<VideosBrowse />} />
            <Route path="/quizzes" element={<Quizzes />} />
            <Route path="/roadmaps" element={<Roadmaps />} />
            {/* Counseling */}
            <Route path="/counseling" element={<Counseling />} />
            {/* Events */}
            <Route path="/hackathons" element={<Hackathons />} />
            <Route path="/internships" element={<Internships />} />
            {/* Mentorship */}
            <Route path="/mentorship" element={<Mentorship />} />
            {/* Stories */}
            <Route path="/success-stories" element={<SuccessStories />} />
            {/* Protected */}
            {/* Protected */}
            <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {showFooter && <Footer />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <AnimatedRoutes />
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
