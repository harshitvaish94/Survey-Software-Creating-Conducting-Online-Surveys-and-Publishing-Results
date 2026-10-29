import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import QuestionEditor from '../components/QuestionEditor'
import { getSurvey, saveSurvey, updateSurvey } from '../api/surveys'
import type { Question } from '../api/surveys'

const newQuestion = (): Question => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  text: '',
  type: 'single',
  options: ['Option 1', 'Option 2'],
  mandatory: false,
})

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
    <form className="form wide" onSubmit={onSubmit}>
      <h1>{existing ? 'Edit survey' : 'Create survey'}</h1>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Description
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
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

      <h2>Questions</h2>
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
      <button type="button" className="btn btn-outline" onClick={() => setQuestions([...questions, newQuestion()])}>
        + Add question
      </button>

      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" className="btn" disabled={loading}>
        {loading ? 'Saving...' : existing ? 'Save changes' : 'Save survey'}
      </button>
    </form>
  )
}