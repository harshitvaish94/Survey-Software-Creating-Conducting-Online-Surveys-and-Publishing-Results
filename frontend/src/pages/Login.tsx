import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../auth/context'
import AuthShell from '../components/AuthShell'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signIn } = useAuth()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      signIn(user)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="lead">Log in to pick up your surveys where you left them.</p>
        <form className="form" onSubmit={onSubmit}>
          <label>
            Email
            <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <div className="pw">
              <input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="link-btn" onClick={() => setShow(!show)}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
          <p className="switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </form>
        <p className="hint assure">Only you can see and edit your surveys.</p>
      </div>
    </AuthShell>
  )
}