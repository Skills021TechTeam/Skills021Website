import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { showAuthRequiredToast } from './AuthRequiredToast'

interface ProtectedRouteProps {
  children: React.ReactNode
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/courses')) return 'Courses & Lectures'
  if (pathname.startsWith('/resources')) return 'Study Resources & Notes'
  if (pathname.startsWith('/quizzes')) return 'Quizzes & Practice Tests'
  if (pathname.startsWith('/roadmaps')) return 'Career Roadmaps'
  if (pathname.startsWith('/mentorship')) return '1-on-1 Mentorship'
  if (pathname.startsWith('/hackathons')) return 'Hackathons & Contests'
  if (pathname.startsWith('/dashboard')) return 'Student Dashboard'
  if (pathname.startsWith('/pathfinder')) return 'Career Pathfinder'
  return 'this page'
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()
  const hasToastedRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated && !hasToastedRef.current) {
      hasToastedRef.current = true
      const sectionName = getPageTitle(location.pathname)
      showAuthRequiredToast({
        title: 'Sign In Required',
        message: `Please sign in with your Skills021 account to access ${sectionName}.`,
      })
    }
  }, [isAuthenticated, location.pathname])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
