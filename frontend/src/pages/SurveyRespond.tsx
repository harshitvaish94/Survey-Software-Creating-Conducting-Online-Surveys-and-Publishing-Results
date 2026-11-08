import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import Captcha from '../components/Captcha'
import type { CaptchaHandle } from '../components/Captcha'
import { CAPTCHA_SITE_KEY } from '../lib/captcha'
import QuestionInput from '../components/QuestionInput'
import { getSurveyBySlug, submitResponse } from '../api/surveys'
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
  const [captchaToken, setCaptchaToken] = useState('')
  const captcha = useRef<CaptchaHandle>(null)
  const { slug = '' } = useParams()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    getSurveyBySlug(slug)
      .then((survey) => !cancelled && setState({ status: 'ready', survey }))
      .catch((err) =>
        !cancelled &&
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Unable to load the survey.' }),
      )
    return () => {
      cancelled = true
    }
  }, [slug])

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
    if (CAPTCHA_SITE_KEY && !captchaToken) {
      setFormError('Please complete the CAPTCHA.')
      return
    }
    setSubmitting(true)
    try {
      const payload = buildAnswerPayload(survey.questions, answers)
      await (captchaToken
        ? submitResponse(survey.id, payload, captchaToken)
        : submitResponse(survey.id, payload))
      setDone(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to submit your response.')
      captcha.current?.reset()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="respond form" onSubmit={onSubmit} noValidate>
      <h1>{survey.title}</h1>
      {survey.description && <p className="lead">{survey.description}</p>}
      <p className="hint">Questions marked * are required.</p>
      <p className="hint">
        Responses are anonymous: your name and email are not collected or stored with your answers. Please avoid
        putting personal details in free-text answers.
      </p>
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
      <Captcha ref={captcha} onToken={setCaptchaToken} />
      {formError && <p className="error" role="alert">{formError}</p>}
      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit response'}
      </button>
    </form>
  )
}
