import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import QuestionEditor from '../components/QuestionEditor'
import { ApiError } from '../api/http'
import { deleteQuestion, getSurvey, publishSurvey, reorderQuestions, updateSurvey } from '../api/surveys'
import type { SurveyStatus } from '../api/surveys'
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
  const [status, setStatus] = useState<SurveyStatus>('Draft')
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

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
        setStatus(s.status)
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
  const readOnly = status !== 'Draft'
  const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback)
  const savedIds = (list: EditorQuestion[]) => list.filter((q) => q.id != null).map((q) => q.id as number)

  /** Moves a question locally, then saves the new order of the stored questions right away. */
  async function move(i: number, d: -1 | 1) {
    if (busy || readOnly) return
    const previous = questions
    const next = [...questions]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    setQuestions(next)
    setSuccess('')
    setErrors([])

    const ids = savedIds(next)
    if (ids.length < 2 || ids.join() === savedIds(previous).join()) return
    setBusy(true)
    try {
      await reorderQuestions(surveyId, ids)
      setSuccess('Question order saved.')
    } catch (err) {
      setQuestions(previous)
      setErrors([message(err, 'Unable to save the new order.')])
    } finally {
      setBusy(false)
    }
  }

  /** Runs after the user confirms. Stored questions are deleted on the server first. */
  async function confirmDelete() {
    const target = questions.find((q) => q.uid === pendingDelete)
    setPendingDelete(null)
    if (!target) return
    setSuccess('')
    setErrors([])
    const dropLocally = () => setQuestions((list) => list.filter((q) => q.uid !== target.uid))

    if (target.id == null) {
      dropLocally()
      return
    }
    setBusy(true)
    try {
      await deleteQuestion(surveyId, target.id)
      dropLocally()
      setSuccess('Question deleted.')
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        dropLocally()
        setErrors(['That question no longer exists, so it was removed from the list.'])
      } else {
        setErrors([message(err, 'Unable to delete the question.')])
      }
    } finally {
      setBusy(false)
    }
  }

  const checks = [
    { label: 'Title added', ok: title.trim().length > 0 },
    { label: 'Every question is complete', ok: questions.every((q) => validateQuestion(q).length === 0) },
    { label: 'Dates make sense', ok: !openDate || !closeDate || closeDate >= openDate },
  ]

  async function save(): Promise<boolean> {
    setSuccess('')
    setSubmitted(true)
    const problems = validateSurveyForm({ title, openDate, closeDate, questions })
    if (problems.length > 0) {
      setErrors(problems)
      return false
    }
    setErrors([])
    setSaving(true)
    try {
      const saved = await updateSurvey(surveyId, { title, description, openDate, closeDate, questions })
      setQuestions(saved.questions.map(toEditorQuestion))
      setSuccess('Survey saved.')
      return true
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Something went wrong'])
      return false
    } finally {
      setSaving(false)
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await save()
  }

  async function onPublish() {
    if (questions.length === 0) {
      setErrors(['Add at least one question before publishing.'])
      return
    }
    if (!window.confirm('Publish this survey? Respondents can answer it and its questions can no longer be changed.')) {
      return
    }
    if (!(await save())) return
    setSaving(true)
    try {
      const published = await publishSurvey(surveyId)
      setStatus(published.status)
      setSuccess('Survey published.')
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Unable to publish the survey.'])
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
          {readOnly && (
            <p className="hint" role="status">
              This survey is {status.toLowerCase()}, so its questions can no longer be edited, reordered or deleted.
            </p>
          )}
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
                readOnly={readOnly}
                onChange={(nq) => update(i, nq)}
                onDelete={() => setPendingDelete(q.uid)}
                onMove={(d) => move(i, d)}
              />
            ))}
          </div>
          <button type="button" className="add-q" disabled={readOnly} onClick={() => setQuestions([...questions, newEditorQuestion()])}>
            + Add a question
          </button>
        </section>
      </div>

      <aside className="builder-side">
        <div className="summary">
          <h2 className="summary-title">{title.trim() || 'Untitled survey'}</h2>
          <p className="summary-desc">{description.trim() || 'No description yet.'}</p>
          <p className="summary-meta">
            {questions.length} {questions.length === 1 ? 'question' : 'questions'}, {questions.filter((q) => q.mandatory).length} required
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
          <button type="submit" className="btn" disabled={saving || busy || readOnly}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          {status === 'Draft' ? (
            <button type="button" className="btn btn-outline" disabled={saving || busy} onClick={onPublish}>
              Publish survey
            </button>
          ) : (
            <p className="summary-meta">
              Status: {status}. Respondent link: <Link to={`/s/${surveyId}`}>/s/{surveyId}</Link>
            </p>
          )}
          <Link to={`/surveys/${surveyId}/preview`} className="btn btn-outline">Preview</Link>
          <Link to="/dashboard" className="link-btn">Back to dashboard</Link>
        </div>
      </aside>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this question?"
          message="The question and its settings will be removed. This cannot be undone."
          confirmLabel="Delete question"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </form>
  )
}
