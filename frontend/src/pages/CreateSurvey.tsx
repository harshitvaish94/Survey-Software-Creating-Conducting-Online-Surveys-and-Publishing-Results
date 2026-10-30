import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import QuestionEditor from '../components/QuestionEditor'
import { getSurvey, hasOptions, saveSurvey, updateSurvey } from '../api/surveys'
import type { Question } from '../api/surveys'

const newQuestion = (): Question => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  text: '',
  type: 'single',
  options: ['Option 1', 'Option 2'],
  mandatory: false,
})

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

export default function CreateSurvey() {
  const { id } = useParams()
  const existing = id ? getSurvey(Number(id)) : undefined

  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [openDate, setOpenDate] = useState(existing?.openDate ?? '')
  const [closeDate, setCloseDate] = useState(existing?.closeDate ?? '')
  const [questions, setQuestions] = useState<Question[]>(existing?.questions ?? [newQuestion()])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  if (id && !existing) {
    return (
      <div className="auth-card">
        <h1>Survey not found</h1>
        <p><Link to="/dashboard">Back to dashboard</Link></p>
      </div>
    )
  }

  const update = (i: number, q: Question) => setQuestions(questions.map((x, k) => (k === i ? q : x)))
  const remove = (i: number) => setQuestions(questions.filter((_, k) => k !== i))
  const move = (i: number, d: -1 | 1) => {
    const next = [...questions]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    setQuestions(next)
  }

  const mandatoryCount = questions.filter((q) => q.mandatory).length
  const checks = [
    { label: 'Title added', ok: title.trim().length > 0 },
    { label: 'Every question has text', ok: questions.length > 0 && questions.every((q) => q.text.trim()) },
    {
      label: 'Choice questions have two options',
      ok: questions.every((q) => !hasOptions(q.type) || q.options.filter((o) => o.trim()).length >= 2),
    },
    { label: 'Dates make sense', ok: !openDate || !closeDate || closeDate >= openDate },
  ]

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const input = { title, description, openDate, closeDate, questions }
      if (existing) {
        await updateSurvey(existing.id, input)
      } else {
        await saveSurvey(input)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form builder" onSubmit={onSubmit}>
      <div className="builder-main">
        <header>
          <h1>{existing ? 'Edit survey' : 'Create a survey'}</h1>
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
          <div className="q-list">
            {questions.map((q, i) => (
              <QuestionEditor
                key={q.id}
                q={q}
                index={i}
                total={questions.length}
                onChange={(nq) => update(i, nq)}
                onDelete={() => remove(i)}
                onMove={(d) => move(i, d)}
              />
            ))}
          </div>
          <button type="button" className="add-q" onClick={() => setQuestions([...questions, newQuestion()])}>
            + Add a question
          </button>
        </section>
      </div>

      <aside className="builder-side">
        <div className="summary">
          <h2 className="summary-title">{title.trim() || 'Untitled survey'}</h2>
          <p className="summary-desc">{description.trim() || 'No description yet.'}</p>
          <p className="summary-meta">
            {questions.length} {questions.length === 1 ? 'question' : 'questions'}, {mandatoryCount} mandatory
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
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Saving...' : existing ? 'Save changes' : 'Save survey'}
          </button>
        </div>
      </aside>
    </form>
  )
}