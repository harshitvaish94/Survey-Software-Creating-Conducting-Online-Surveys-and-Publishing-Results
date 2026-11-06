import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './context'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, checking } = useAuth()
  if (checking) return <p role="status">Checking your session...</p>
  return user ? <>{children}</> : <Navigate to="/login" replace />
}