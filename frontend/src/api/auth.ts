import { ApiError, request } from './http'

export type UserRole = 'Creator' | 'Respondent' | 'Administrator'

export interface AuthUser {
  id: number
  email: string
  role: UserRole
}

const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) })

/** Starts a session. The server sets an HTTP-only cookie; no token is stored in the browser. */
export const login = (email: string, password: string) =>
  request<AuthUser>('/auth/login', post({ email, password }))

/** Creates the account. The user logs in afterwards. */
export const register = (email: string, password: string) =>
  request<AuthUser>('/auth/register', post({ email, password }))

export const logout = () => request<void>('/auth/logout', { method: 'POST' })

/** The logged-in user, or null when there is no valid session. */
export async function me(): Promise<AuthUser | null> {
  try {
    return await request<AuthUser>('/auth/me')
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}
