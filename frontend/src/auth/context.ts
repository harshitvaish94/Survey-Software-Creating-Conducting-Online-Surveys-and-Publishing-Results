import { createContext, useContext } from 'react'
import type { AuthUser, UserRole } from '../api/auth'

/** Survey management screens are for Creators and Administrators (SMS-15). */
export const CREATOR_ROLES: UserRole[] = ['Creator', 'Administrator']

export interface AuthState {
  user: AuthUser | null
  /** True until the first session check with the API has finished. */
  checking: boolean
  signIn: (user: AuthUser) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}