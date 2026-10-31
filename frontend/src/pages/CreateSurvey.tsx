import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import QuestionEditor from '../components/QuestionEditor'
import { getSurvey, updateSurvey } from '../api/surveys'
import { newEditorQuestion, toEditorQuestion } from '../lib/questions'
import type { EditorQuestion } from '../lib/questions'
import { validateQuestion, validateSurveyForm } from '../lib/questionValidation'

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' }

export default function CreateSurvey() {
  const { id } = useParams()
  const surveyId = Number(id)

  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [openDate, setOpenDate] = useState('')
  const [closeDate, setCloseDate] = useState('')
  const [questions, setQuestions] = useState<EditorQuestion[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    getSurvey(surveyId)
      .then((s) => {
        if (cancelled) return
        setTitle(s.title)
        setDescription(s.description ?? '')
        setOpenDate(s.openDate ?? '')
        setCloseDate(s.closeDate ?? '')
        setQuestions(s.questions.map(toEditorQuestion))
        setLoad({ status: 'ready' })
      })
      .catch((err) => {
        if (cancelled) return
        setLoad({ status: 'error', message: err instanceof Error ? err.message : 'Unable to load the survey.' })
      })
    return () => {
      cancelled = true
    }
  }, [surveyId])

  if (load.status === 'loading') return <p role="status">Loading survey...</p>
  if (load.status === 'error') {
    return (
      <div className="auth-card">
        <h1>Survey not found</h1>
        <p className="error" role="alert">{load.message}</p>
        <p><Link to="/dashboard">Back to dashboard</Link></p>
      </div>
    )
  }

  const update = (i: number, q: EditorQuestion) => setQuestions(questions.map((x, k) => (k === i ? q : x)))
  const remove = (i: number) => setQuestions(questions.filter((_, k) => k !== i))
  const move = (i: number, d: -1 | 1) => {
    const next = [...questions]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    setQuestions(next)
  }

  const checks = [
    { label: 'Title added', ok: title.trim().length > 0 },
    { label: 'Every question is complete', ok: questions.every((q) => validateQuestion(q).length === 0) },
    { label: 'Dates make sense', ok: !openDate || !closeDate || closeDate >= openDate },
  ]

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSuccess('')
    setSubmitted(true)
    const problems = validateSurveyForm({ title, openDate, closeDate, questions })
    if (problems.length > 0) {
      setErrors(problems)
      return
    }
    setErrors([])
    setSaving(true)
    try {
      const saved = await updateSurvey(surveyId, { title, description, openDate, closeDate, questions })
      setQuestions(saved.questions.map(toEditorQuestion))
      setSuccess('Survey saved.')
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Something went wrong'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form builder" onSubmit={onSubmit} noValidate>
      <div className="builder-main">
        <header>
          <h1>Edit survey</h1>
          <p className="lead">Add the basics, then build your questions. Your survey is saved as a draft.</p>
        </header>

        <section className="panel">
          <h2>The basics</h2>
          <label>
            Title
            <input placeholder="e.g. Workshop feedback" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              placeholder="Tell respondents what this survey is about"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="grid2">
            <label>
              Open date
              <input type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
            </label>
            <label>
              Close date
              <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
            </label>
          </div>
        </section>

        <section>
          <h2>Questions</h2>
          {questions.length === 0 && <p className="hint">No questions yet. Add your first one below.</p>}
          <div className="q-list">
            {questions.map((q, i) => (
              <QuestionEditor
                key={q.uid}
                q={q}
                index={i}
                total={questions.length}
                errors={submitted ? validateQuestion(q) : []}
                onChange={(nq) => update(i, nq)}
                onDelete={() => remove(i)}
                onMove={(d) => move(i, d)}
              />
            ))}
          </div>
          <button type="button" className="add-q" onClick={() => setQuestions([...questions, newEditorQuestion()])}>
            + Add a question
          </button>
        </section>
      </div>

      <aside className="builder-side">
        <div className="summary">
          <h2 className="summary-title">{title.trim() || 'Untitled survey'}</h2>
          <p className="summary-desc">{description.trim() || 'No description yet.'}</p>
          <p className="summary-meta">
            {questions.length} {questions.length === 1 ? 'question' : 'questions'}
          </p>
          <p className="summary-meta">
            {openDate || closeDate
              ? `Open ${fmt(openDate) || 'any time'} until ${fmt(closeDate) || 'no end date'}`
              : 'No dates set yet.'}
          </p>
          <ul className="checks">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? 'ok-item' : ''}>
                <span className="cbox" aria-hidden="true">{c.ok ? '✓' : ''}</span>
                {c.label}
              </li>
            ))}
          </ul>
          {errors.length > 0 && (
            <div className="error" role="alert">
              {errors.map((m) => (
                <p key={m}>{m}</p>
              ))}
            </div>
          )}
          {success && <p className="ok" role="status">{success}</p>}
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <Link to={`/surveys/${surveyId}/preview`} className="btn btn-outline">Preview</Link>
          <Link to="/dashboard" className="link-btn">Back to dashboard</Link>
        </div>
      </aside>
    </form>
  )
}
