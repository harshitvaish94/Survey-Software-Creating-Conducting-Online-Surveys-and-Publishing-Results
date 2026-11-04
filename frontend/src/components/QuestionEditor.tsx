import { QUESTION_TYPES, RATING_ABSOLUTE_MAX, hasOptions, ratingScale } from '../lib/questions'
import type { EditorQuestion, QuestionType } from '../lib/questions'

interface Props {
  q: EditorQuestion
  index: number
  total: number
  errors?: string[]
  /** True for published surveys: every control is disabled. */
  readOnly?: boolean
  onChange: (q: EditorQuestion) => void
  onDelete: () => void
  onMove: (direction: -1 | 1) => void
}

export default function QuestionEditor({ q, index, total, errors = [], readOnly = false, onChange, onDelete, onMove }: Props) {
  const set = (patch: Partial<EditorQuestion>) => onChange({ ...q, ...patch })
  const setOption = (i: number, value: string) =>
    set({ options: q.options.map((o, k) => (k === i ? value : o)) })
  const removeOption = (i: number) => set({ options: q.options.filter((_, k) => k !== i) })
  const addOption = () => set({ options: [...q.options, `Option ${q.options.length + 1}`] })
  const changeType = (type: QuestionType) =>
    set({ type, options: hasOptions(type) && q.options.length < 2 ? ['Option 1', 'Option 2'] : q.options })
  const changeMin = (min: number) => set({ ratingMin: min, ratingMax: Math.max(q.ratingMax, min + 1) })

  const maxChoices = ratingScale(q.ratingMin + 1, RATING_ABSOLUTE_MAX)

  return (
    <fieldset className="q-card" disabled={readOnly}>
      <legend className="sr-only">Question {index + 1}</legend>
      <div className="q-head">
        <span className="q-num">{index + 1}</span>
        <input
          className="q-title"
          aria-label={`Question ${index + 1} text`}
          placeholder="Type your question"
          value={q.text}
          onChange={(e) => set({ text: e.target.value })}
        />
        {q.mandatory ? <span className="chip req-chip">Required</span> : <span className="chip opt-chip">Optional</span>}
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
              name={`type-${q.uid}`}
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
        <div className="rating-config">
          <div className="grid2">
            <label>
              Scale starts at
              <select value={q.ratingMin} onChange={(e) => changeMin(Number(e.target.value))}>
                <option value={0}>0</option>
                <option value={1}>1</option>
              </select>
            </label>
            <label>
              Scale ends at
              <select value={q.ratingMax} onChange={(e) => set({ ratingMax: Number(e.target.value) })}>
                {maxChoices.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="rating-preview" role="img" aria-label={`Rating scale from ${q.ratingMin} to ${q.ratingMax}`}>
            {ratingScale(q.ratingMin, q.ratingMax).map((n) => (
              <span key={n} className="dot">{n}</span>
            ))}
          </div>
        </div>
      )}

      {q.type === 'text' && <p className="text-preview">Respondents type their answer here.</p>}

      <div className="req-toggle" role="radiogroup" aria-label="Answer requirement">
        <label className={q.mandatory ? 'opt sm on' : 'opt sm'}>
          <input type="radio" name={`required-${q.uid}`} checked={q.mandatory} onChange={() => set({ mandatory: true })} />
          Required
        </label>
        <label className={!q.mandatory ? 'opt sm on' : 'opt sm'}>
          <input type="radio" name={`required-${q.uid}`} checked={!q.mandatory} onChange={() => set({ mandatory: false })} />
          Optional
        </label>
      </div>

      {errors.length > 0 && (
        <ul className="q-errors" role="alert">
          {errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}
