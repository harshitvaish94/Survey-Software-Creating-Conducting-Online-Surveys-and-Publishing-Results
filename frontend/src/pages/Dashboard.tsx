import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'

export default function Dashboard() {
const { user } = useAuth()

return (
<> <h1>Dashboard</h1> <p>
Signed in as <strong>{user?.email}</strong> </p>


  <section className="hero">
    <h2>No surveys yet</h2>
    <p>Your surveys will appear here once you create one.</p>

    <div className="hero-actions">
      <Link to="/surveys/new" className="btn">
        Create Survey
      </Link>
    </div>
  </section>
</>


)
}
