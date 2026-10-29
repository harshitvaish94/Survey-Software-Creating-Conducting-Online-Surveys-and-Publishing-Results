import { useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser } from '../api/auth'
import { AuthContext } from './context'

const KEY = 'sms_user'

function load(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(load)

  function signIn(u: AuthUser) {
    setUser(u)
    try {
      sessionStorage.setItem(KEY, JSON.stringify(u))
    } catch {
      /* ignore */
    }
  }

  function signOut() {
    setUser(null)
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  }

  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>
}