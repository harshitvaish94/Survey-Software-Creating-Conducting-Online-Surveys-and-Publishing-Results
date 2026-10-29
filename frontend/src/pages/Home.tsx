import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'

export default function Home() {
  const { user } = useAuth()

  return (
    <>
      <section className="hero">
        <h1>Create, share and analyse surveys</h1>
        <p>Build surveys with different question types, share them with a link or QR code, and see the results as charts.</p>
        <div className="hero-actions">
          {user ? (
            <Link to="/dashboard" className="btn">Go to dashboard</Link>
          ) : (
            <>
              <Link to="/register" className="btn">Get started</Link>
              <Link to="/login" className="btn btn-outline">Log in</Link>
            </>
          )}
        </div>
      </section>
      <section className="features">
        <div className="feature">
          <h2>Build</h2>
          <p>Five question types, mandatory or optional, with open and close dates.</p>
        </div>
        <div className="feature">
          <h2>Share</h2>
          <p>Every published survey gets its own link and QR code.</p>
        </div>
        <div className="feature">
          <h2>Analyse</h2>
          <p>Results per question with charts, plus CSV and PDF export.</p>
        </div>
      </section>
    </>
  )
}