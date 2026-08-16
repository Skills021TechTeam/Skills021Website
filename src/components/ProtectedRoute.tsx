import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()
  const hasToastedRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated && !hasToastedRef.current) {
      hasToastedRef.current = true
      toast.error('Please sign in to access this page 🔒', { id: 'auth-required-toast', duration: 3000 })
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
