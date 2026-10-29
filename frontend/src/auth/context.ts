import { createContext, useContext } from 'react'
import type { AuthUser } from '../api/auth'

export interface AuthState {
  user: AuthUser | null
  signIn: (user: AuthUser) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}