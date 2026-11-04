import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { listSurveys } from '../api/surveys'
import type { Survey } from '../api/surveys'

function greet(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; surveys: Survey[] }

export default function Dashboard() {
  const { user } = useAuth()
  const [greeting] = useState(greet)
  const surveys = listSurveys(user?.email ?? '')
  const name = user ? user.email.split('@')[0] : ''

  useEffect(() => {
    let cancelled = false
    listSurveys()
      .then((surveys) => !cancelled && setState({ status: 'ready', surveys }))
      .catch((err) =>
        !cancelled &&
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Unable to load surveys.' }),
      )
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <div className="row">
        <div>
          <h1>{greeting}, {name}</h1>
          <p className="lead">Here are your surveys.</p>
        </div>

        <Link to="/surveys/new" className="btn">
          + Create survey
        </Link>
      </div>

      {state.status === 'loading' && <p role="status">Loading surveys...</p>}
      {state.status === 'error' && <p className="error" role="alert">{state.message}</p>}

      {state.status === 'ready' && state.surveys.length === 0 && (
        <section className="empty">
          <h2>Nothing here yet</h2>
          <p>
            Your first survey takes about two minutes.
            Start with a title and add questions as you go.
          </p>
          <Link to="/surveys/new" className="btn">
            Create your first survey
          </Link>
        </section>
      )}

      {state.status === 'ready' && state.surveys.length > 0 && (
        <div className="survey-list">
          {surveys.map((s) => (
            <div key={s.id} className="survey-card">
              <span className="chip">{s.status}</span>
              <h2>{s.title}</h2>
              <p>{s.questions.length} {s.questions.length === 1 ? 'question' : 'questions'}</p>
              <div className="card-actions">
                <Link to={`/surveys/${s.id}/edit`} className="edit-hint">Edit survey</Link>
                <Link to={`/s/${s.id}`} className="edit-hint">Take survey</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
