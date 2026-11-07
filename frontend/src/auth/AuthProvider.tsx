import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { logout, me } from '../api/auth'
import type { AuthUser } from '../api/auth'
import { AuthContext } from './context'

/**
 * The session itself lives in an HTTP-only cookie set by the API. On load we ask
 * the API who is logged in (`/auth/me`) so a refresh or new tab keeps the session.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    me()
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setChecking(false))
    return () => {
      cancelled = true
    }
  }, [])

  function signIn(u: AuthUser) {
    setUser(u)
  }

  function signOut() {
    setUser(null)
    logout().catch(() => {
      /* the cookie expires on its own; nothing else to do */
    })
  }

  return (
    <AuthContext.Provider value={{ user, checking, signIn, signOut }}>{children}</AuthContext.Provider>
  )
}
