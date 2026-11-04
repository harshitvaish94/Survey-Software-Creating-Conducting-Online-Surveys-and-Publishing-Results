import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QuestionInput from '../components/QuestionInput'
import type { AnswerValue } from '../components/QuestionInput'
import { getSurvey } from '../api/surveys'
import type { Survey } from '../api/surveys'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; survey: Survey }

/** Shows how respondents will see the survey. Answers here are not stored. */
export default function SurveyPreview() {
  const { id } = useParams()
  const surveyId = Number(id)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({})

  useEffect(() => {
    let cancelled = false
    getSurvey(surveyId)
      .then((survey) => !cancelled && setState({ status: 'ready', survey }))
      .catch((err) =>
        !cancelled &&
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Unable to load the survey.' }),
      )
    return () => {
      cancelled = true
    }
  }, [surveyId])

  if (state.status === 'loading') return <p role="status">Loading survey...</p>
  if (state.status === 'error') {
    return (
      <div className="auth-card">
        <h1>Survey not available</h1>
        <p className="error" role="alert">{state.message}</p>
        <p><Link to="/dashboard">Back to dashboard</Link></p>
      </div>
    )
  }

  const { survey } = state
  return (
    <section className="respond">
      <p className="chip">Preview only, answers are not saved</p>
      <h1>{survey.title}</h1>
      {survey.description && <p className="lead">{survey.description}</p>}
      {survey.questions.length === 0 && <p className="hint">This survey has no questions yet.</p>}
      <div className="q-list">
        {survey.questions.map((q) => (
          <QuestionInput
            key={q.id}
            question={q}
            value={answers[q.id] ?? null}
            onChange={(v) => setAnswers({ ...answers, [q.id]: v })}
          />
        ))}
      </div>
      <Link to={`/surveys/${survey.id}/edit`} className="btn btn-outline">Back to builder</Link>
    </section>
  )
}
