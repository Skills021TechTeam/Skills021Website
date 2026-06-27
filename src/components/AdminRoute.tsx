import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface AdminRouteProps {
  children: React.ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
