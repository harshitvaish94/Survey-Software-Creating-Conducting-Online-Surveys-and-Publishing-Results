import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateSurvey from './pages/CreateSurvey'
import ProtectedRoute from './auth/ProtectedRoute'
import { useAuth } from './auth/context'
import SurveyCreate from './pages/SurveyCreate'

export default function App() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function onLogout() {
    signOut()
    navigate('/')
  }

  return (
    <>
      <nav className="nav">
        <span className="brand">Survey Management</span>

        <div className="links">
          <NavLink to="/" end>
            Home
          </NavLink>

          {user ? (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/surveys/new">Create survey</NavLink>
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
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register">Register</NavLink>
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

          {/* Existing survey builder: create and edit surveys */}
          <Route
            path="/surveys/:id/edit"
            element={
              <ProtectedRoute>
                <CreateSurvey key="edit" />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </>
  )
}