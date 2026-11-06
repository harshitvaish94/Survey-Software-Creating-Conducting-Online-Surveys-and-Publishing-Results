import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { UserRole } from '../api/auth'
import { CREATOR_ROLES, useAuth } from './context'

export default function ProtectedRoute({
  children,
  roles = CREATOR_ROLES,
}: {
  children: ReactNode
  roles?: UserRole[]
}) {
  const { user, checking } = useAuth()
  if (checking) return <p role="status">Checking your session...</p>
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) {
    return (
      <div className="auth-card">
        <h1>Not available</h1>
        <p role="alert">Your account ({user.role}) can't open this page. Survey tools are for creators.</p>
      </div>
    )
  }
  return <>{children}</>
}
