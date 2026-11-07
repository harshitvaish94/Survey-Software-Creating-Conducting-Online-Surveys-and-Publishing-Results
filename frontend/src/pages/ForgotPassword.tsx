import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth'
import AuthShell from '../components/AuthShell'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const result = await forgotPassword(email)
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Forgot password?</h1>
        <p className="lead">
          Enter your registered email address. We'll send you a password reset link.
        </p>

        <form className="form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          {message && <p role="status">{message}</p>}
          {error && <p className="error" role="alert">{error}</p>}

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>

          <p className="switch">
            Remember your password? <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </AuthShell>
  )
}