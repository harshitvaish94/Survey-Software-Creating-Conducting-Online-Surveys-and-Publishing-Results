import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AuthProvider from './AuthProvider'
import ProtectedRoute from './ProtectedRoute'
import { useAuth } from './context'

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function Who() {
  const { user } = useAuth()
  return <p>Signed in as {user?.email}</p>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route path="/dashboard" element={<ProtectedRoute><Who /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AuthProvider (SMS-14)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('restores the session from the cookie via /auth/me, sending credentials', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => json(200, { id: 1, email: 'me@example.com', role: 'Creator' }))
    renderAt('/dashboard')
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session')
    expect(await screen.findByText('Signed in as me@example.com')).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/\/auth\/me$/)
    expect(init?.credentials).toBe('include')
  })

  it('sends people without a session to the login page', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => json(401, { message: 'Please log in to continue.' }))
    renderAt('/dashboard')
    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })

  it('blocks a Respondent from creator pages (SMS-15)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => json(200, { id: 2, email: 'r@example.com', role: 'Respondent' }))
    renderAt('/dashboard')
    expect(await screen.findByRole('alert')).toHaveTextContent("can't open this page")
    expect(screen.queryByText(/Signed in as/)).not.toBeInTheDocument()
  })

  it('treats an unreachable server as logged out', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.reject(new TypeError('offline')))
    renderAt('/dashboard')
    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })
})
