import { useEffect } from 'react'
import {
  Routes,
  Route,
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateSurvey from './pages/CreateSurvey'
import ProtectedRoute from './auth/ProtectedRoute'
import { CREATOR_ROLES, useAuth } from './auth/context'
import SurveyCreate from './pages/SurveyCreate'
import SurveyPreview from './pages/SurveyPreview'
import SurveyRespond from './pages/SurveyRespond'
import ResultsPage from './pages/ResultsPage'
import { pageTitle } from './lib/pageTitle'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

function Mark() {
  return (
    <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" />
      <path d="M7 12.5l3.2 3.2L17 9" />
    </svg>
  )
}

export default function App() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // SMS-37: Set an appropriate title for each page.
  useEffect(() => {
    document.title = pageTitle(pathname)
  }, [pathname])

  function onLogout() {
    signOut()
    navigate('/')
  }

  return (
    <>
      {/* SMS-37: Accessibility skip link */}
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Skip to main content
      </a>

      <nav className="nav" aria-label="Main">
        <NavLink to="/" end className="brand">
          <Mark />
          Survey Management
        </NavLink>

        <div className="links">
          {user ? (
            <>
              {CREATOR_ROLES.includes(user.role) && (
                <>
                  <NavLink to="/dashboard">Dashboard</NavLink>
                  <NavLink to="/surveys/new">New survey</NavLink>
                </>
              )}

              <span className="who">{user.email}</span>

              <button
                type="button"
                className="logout"
                onClick={onLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <NavLink to="/register">Create account</NavLink>
            </>
          )}
        </div>
      </nav>

      <main id="main" tabIndex={-1} className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* SMS-25: Password reset */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* SMS-16: Create a new survey */}
          <Route
            path="/surveys/new"
            element={
              <ProtectedRoute>
                <SurveyCreate key="new" />
              </ProtectedRoute>
            }
          />

          {/* Existing survey builder */}
          <Route
            path="/surveys/:id/edit"
            element={
              <ProtectedRoute>
                <CreateSurvey key="edit" />
              </ProtectedRoute>
            }
          />

          {/* SMS-17: Preview survey */}
          <Route
            path="/surveys/:id/preview"
            element={
              <ProtectedRoute>
                <SurveyPreview />
              </ProtectedRoute>
            }
          />

          {/* SMS-30: Results and charts */}
          <Route
            path="/surveys/:id/results"
            element={
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            }
          />

          {/* SMS-24: Public shareable survey link */}
          <Route path="/s/:slug" element={<SurveyRespond />} />
        </Routes>
      </main>
    </>
  )
}