import { ApiError, request } from './http'

export type UserRole = 'Creator' | 'Respondent' | 'Administrator'

export interface AuthUser {
  id: number
  email: string
  role: UserRole
}

const post = (body: unknown) => ({
  method: 'POST',
  body: JSON.stringify(body),
})

/** Starts a session using an HTTP-only cookie. */
export const login = (email: string, password: string, captchaToken?: string) =>
  request<AuthUser>('/auth/login', post({ email, password, ...(captchaToken ? { captchaToken } : {}) }))

/** Creates a new account. */
export const register = (email: string, password: string) =>
  request<AuthUser>('/auth/register', post({ email, password }))

export const logout = () =>
  request<void>('/auth/logout', { method: 'POST' })

/** Returns the logged-in user, or null if the session is invalid. */
export async function me(): Promise<AuthUser | null> {
  try {
    return await request<AuthUser>('/auth/me')
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null
    }
    throw err
  }
}

/** Requests a password-reset email. */
export const forgotPassword = (email: string) =>
  request<{ message: string }>(
    '/auth/forgot-password',
    post({ email }),
  )

/** Resets the password using the emailed token. */
export const resetPassword = (token: string, newPassword: string) =>
  request<{ message: string }>(
    '/auth/reset-password',
    post({ token, newPassword }),
  )
