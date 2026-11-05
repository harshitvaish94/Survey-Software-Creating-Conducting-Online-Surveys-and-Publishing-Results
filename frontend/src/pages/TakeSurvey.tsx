import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSurvey, submitResponse, type Answer, type AnswerValue, type Question } from '../api/surveys'

// Set to true once SMS-23 adds the Published status, so Draft surveys can't be answered.
const ONLY_PUBLISHED = false

function isEmpty(v: AnswerValue | undefined) {
  if (v === undefined) return true
  return Array.isArray(v) ? v.length === 0 : !v.trim()
}

export default function TakeSurvey() {
  const { id } = useParams()
  const survey = getSurvey(Number(id))
  const [values, setValues] = useState<Record<number, AnswerValue>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!survey || (ONLY_PUBLISHED && (survey.status as string) !== 'Published')) {
    return (
      <section className="hero">
        <h1>Survey not found</h1>
        <p>This survey does not exist or is not open for responses.</p>
        <Link to="/" className="btn">Back to home</Link>
      </section>
    )
  }

  const setValue = (qid: number, v: AnswerValue) => {
    setValues((prev) => ({ ...prev, [qid]: v }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[qid]
      return next
    })
  }

  const toggle = (qid: number, option: string) => {
    const current = Array.isArray(values[qid]) ? (values[qid] as string[]) : []
    setValue(qid, current.includes(option) ? current.filter((o) => o !== option) : [...current, option])
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found: Record<number, string> = {}
    for (const q of survey.questions) {
      if (q.mandatory && isEmpty(values[q.id])) found[q.id] = 'This question is required'
    }
    setErrors(found)
    setFormError('')
    const firstBad = survey.questions.find((q) => found[q.id])
    if (firstBad) {
      document.getElementById(`q-${firstBad.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const answers: Answer[] = survey.questions
      .filter((q) => !isEmpty(values[q.id]))
      .map((q) => ({ questionId: q.id, value: values[q.id] }))
    setSubmitting(true)
    try {
      await submitResponse(survey.id, answers)
      setDone(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderInput = (q: Question) => {
    const value = values[q.id]
    const options = q.options.filter((o) => o.trim())
    const describedBy = errors[q.id] ? `err-${q.id}` : undefined
    switch (q.type) {
      case 'single':
        return options.map((o) => (
          <label key={o} className="take-opt">
            <input type="radio" name={`q-${q.id}`} checked={value === o} onChange={() => setValue(q.id, o)} />
            {o}
          </label>
        ))
      case 'multiple':
        return options.map((o) => (
          <label key={o} className="take-opt">
            <input
              type="checkbox"
              checked={Array.isArray(value) && value.includes(o)}
              onChange={() => toggle(q.id, o)}
            />
            {o}
          </label>
        ))
      case 'dropdown':
        return (
          <select
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => setValue(q.id, e.target.value)}
            aria-label={q.text}
            aria-describedby={describedBy}
          >
            <option value="">Choose an option</option>
            {options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        )
      case 'rating':
        return (
          <div className="take-scale">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n}>
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={value === String(n)}
                  onChange={() => setValue(q.id, String(n))}
                />
                {n}
              </label>
            ))}
          </div>
        )
      default:
        return (
          <textarea
            rows={3}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => setValue(q.id, e.target.value)}
            aria-label={q.text}
            aria-describedby={describedBy}
            placeholder="Type your answer here"
          />
        )
    }
  }

  if (done) {
    return (
      <section className="hero take-done">
        <h1>Thank you!</h1>
        <p>Your response to “{survey.title}” has been recorded.</p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setValues({})
            setErrors({})
            setDone(false)
          }}
        >
          Submit another response
        </button>
      </section>
    )
  }

  return (
    <form className="take" onSubmit={onSubmit} noValidate>
      <header>
        <h1>{survey.title}</h1>
        {survey.description && <p>{survey.description}</p>}
        <p className="hint"><span className="req">*</span> Required</p>
      </header>
      {survey.questions.map((q, i) => (
        <fieldset key={q.id} id={`q-${q.id}`} className={`take-q${errors[q.id] ? ' has-error' : ''}`}>
          <legend>
            {i + 1}. {q.text}
            {q.mandatory && <span className="req" aria-label="required"> *</span>}
          </legend>
          {renderInput(q)}
          {errors[q.id] && (
            <p id={`err-${q.id}`} className="take-error" role="alert">{errors[q.id]}</p>
          )}
        </fieldset>
      ))}
      {formError && <p className="take-error" role="alert">{formError}</p>}
      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  )
}