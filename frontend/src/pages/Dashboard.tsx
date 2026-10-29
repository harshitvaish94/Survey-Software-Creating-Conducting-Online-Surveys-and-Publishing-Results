import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { listSurveys } from '../api/surveys'

export default function Dashboard() {
  const { user } = useAuth()
  const surveys = listSurveys()

  return (
    <>
      <div className="row">
        <div>
          <h1>Dashboard</h1>
          <p>
            Signed in as <strong>{user?.email}</strong>
          </p>
        </div>
        <Link to="/surveys/new" className="btn">+ Create survey</Link>
      </div>

      {surveys.length === 0 ? (
        <section className="hero">
          <h2>No surveys yet</h2>
          <p>Create your first survey to get started.</p>
        </section>
      ) : (
        <div className="survey-list">
          {surveys.map((s) => (
            <Link key={s.id} to={`/surveys/${s.id}/edit`} className="feature card-link">
              <h2>{s.title}</h2>
              <p>
                {s.status} · {s.questions.length} question{s.questions.length === 1 ? '' : 's'}
              </p>
              <p className="hint">Click to edit</p>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}