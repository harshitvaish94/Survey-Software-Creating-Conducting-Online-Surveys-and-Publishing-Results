import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateSurvey from './pages/CreateSurvey'
import ProtectedRoute from './auth/ProtectedRoute'
import { useAuth } from './auth/context'
import SurveyCreate from './pages/SurveyCreate'
import SurveyPreview from './pages/SurveyPreview'

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

  function onLogout() {
    signOut()
    navigate('/')
  }

  return (
    <>
      <nav className="nav" aria-label="Main">
        <NavLink to="/" end className="brand">
          <Mark />
          Survey Management
        </NavLink>

        <div className="links">
          {user ? (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/surveys/new">New survey</NavLink>
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

      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

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

          {/* SMS-17: Preview how respondents see a survey */}
          <Route
            path="/surveys/:id/preview"
            element={
              <ProtectedRoute>
                <SurveyPreview />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </>
  )
}