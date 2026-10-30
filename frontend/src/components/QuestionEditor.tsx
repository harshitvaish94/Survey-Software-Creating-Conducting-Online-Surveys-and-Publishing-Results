import { QUESTION_TYPES, hasOptions } from '../api/surveys'
import type { Question, QuestionType } from '../api/surveys'

interface Props {
  q: Question
  index: number
  total: number
  onChange: (q: Question) => void
  onDelete: () => void
  onMove: (direction: -1 | 1) => void
}

export default function QuestionEditor({ q, index, total, onChange, onDelete, onMove }: Props) {
  const set = (patch: Partial<Question>) => onChange({ ...q, ...patch })
  const setOption = (i: number, value: string) =>
    set({ options: q.options.map((o, k) => (k === i ? value : o)) })
  const removeOption = (i: number) => set({ options: q.options.filter((_, k) => k !== i) })
  const addOption = () => set({ options: [...q.options, `Option ${q.options.length + 1}`] })
  const changeType = (type: QuestionType) =>
    set({ type, options: hasOptions(type) && q.options.length < 2 ? ['Option 1', 'Option 2'] : q.options })

  return (
    <div className="q-card">
      <div className="q-head">
        <span className="q-num">{index + 1}</span>
        <input
          className="q-title"
          aria-label={`Question ${index + 1} text`}
          placeholder="Type your question"
          value={q.text}
          onChange={(e) => set({ text: e.target.value })}
        />
        <div className="row-actions">
          <button type="button" className="icon-btn" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up">↑</button>
          <button type="button" className="icon-btn" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Move down">↓</button>
          <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div className="types" role="radiogroup" aria-label="Question type">
        {QUESTION_TYPES.map((t) => (
          <label key={t.value} className={q.type === t.value ? 'opt sm on' : 'opt sm'}>
            <input
              type="radio"
              name={`type-${q.id}`}
              checked={q.type === t.value}
              onChange={() => changeType(t.value)}
            />
            {t.label}
          </label>
        ))}
      </div>

      {hasOptions(q.type) && (
        <div className="opts">
          {q.options.map((o, i) => (
            <div className="opt-row" key={i}>
              <span className="bullet" data-kind={q.type} aria-hidden="true" />
              <input aria-label={`Option ${i + 1}`} value={o} onChange={(e) => setOption(i, e.target.value)} />
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove option ${i + 1}`}
                disabled={q.options.length <= 2}
                onClick={() => removeOption(i)}
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" className="link-btn start" onClick={addOption}>+ Add option</button>
        </div>
      )}

      {q.type === 'rating' && (
        <div className="rating-preview" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className="dot">{n}</span>
          ))}
        </div>
      )}

      {q.type === 'text' && <p className="text-preview">Respondents type their answer here.</p>}

      <label className="toggle">
        <input type="checkbox" role="switch" checked={q.mandatory} onChange={(e) => set({ mandatory: e.target.checked })} />
        <span className="track" aria-hidden="true" />
        Mandatory
      </label>
    </div>
  )
}