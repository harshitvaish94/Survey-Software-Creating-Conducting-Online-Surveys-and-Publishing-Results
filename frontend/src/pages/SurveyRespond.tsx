import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import QuestionInput from '../components/QuestionInput'
import { getSurvey, submitResponse } from '../api/surveys'
import type { Survey } from '../api/surveys'
import { buildAnswerPayload, validateAnswers } from '../lib/answerValidation'
import type { AnswerMap } from '../lib/answerValidation'
import type { AnswerValue } from '../lib/questions'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; survey: Survey }

/** Public page where respondents answer a published survey. */
export default function SurveyRespond() {
  const { id } = useParams()
  const surveyId = Number(id)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

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
      </div>
    )
  }

  const { survey } = state
  if (survey.status !== 'Published') {
    return (
      <div className="auth-card">
        <h1>{survey.title}</h1>
        <p>This survey is not accepting responses.</p>
      </div>
    )
  }
  if (done) {
    return (
      <div className="auth-card">
        <h1>Thank you!</h1>
        <p role="status">Your response to “{survey.title}” has been recorded.</p>
      </div>
    )
  }

  const setAnswer = (qid: number, value: AnswerValue) => {
    setAnswers({ ...answers, [qid]: value })
    if (fieldErrors[qid]) setFieldErrors({ ...fieldErrors, [qid]: '' })
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError('')
    const errors = validateAnswers(survey.questions, answers)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setFormError('Please answer the required questions before submitting.')
      return
    }
    setSubmitting(true)
    try {
      await submitResponse(survey.id, buildAnswerPayload(survey.questions, answers))
      setDone(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to submit your response.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="respond form" onSubmit={onSubmit} noValidate>
      <h1>{survey.title}</h1>
      {survey.description && <p className="lead">{survey.description}</p>}
      <p className="hint">Questions marked * are required.</p>
      <div className="q-list">
        {survey.questions.map((q) => (
          <QuestionInput
            key={q.id}
            question={q}
            value={answers[q.id] ?? null}
            onChange={(v) => setAnswer(q.id, v)}
            error={fieldErrors[q.id] || undefined}
          />
        ))}
      </div>
      {formError && <p className="error" role="alert">{formError}</p>}
      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit response'}
      </button>
    </form>
  )
}
