import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface AdminRouteProps {
  children: React.ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAdminAuthenticated, user } = useAuthStore()

  if (!isAdminAuthenticated && user?.role !== 'admin') {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
