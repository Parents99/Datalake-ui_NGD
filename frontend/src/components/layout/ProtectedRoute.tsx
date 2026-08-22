import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  requiredRole?: 'user' | 'admin'
}

export function ProtectedRoute({ requiredRole }: Props) {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole === 'admin' && role !== 'admin') {
    return <Navigate to="/app/sources" replace />
  }

  return <Outlet />
}
