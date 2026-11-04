import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { listSurveys } from '../api/surveys'

function greet(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [greeting] = useState(greet)
  const surveys = listSurveys(user?.email ?? '')
  const name = user ? user.email.split('@')[0] : ''

  return (
    <>
      <div className="row">
        <div>
          <h1>{greeting}, {name}</h1>
          <p className="lead">Here are your surveys.</p>
        </div>
        <Link to="/surveys/new" className="btn">New survey</Link>
      </div>

      {surveys.length === 0 ? (
        <section className="empty">
          <h2>Nothing here yet</h2>
          <p>Your first survey takes about two minutes. Start with a title and add questions as you go.</p>
          <Link to="/surveys/new" className="btn">Create your first survey</Link>
        </section>
      ) : (
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