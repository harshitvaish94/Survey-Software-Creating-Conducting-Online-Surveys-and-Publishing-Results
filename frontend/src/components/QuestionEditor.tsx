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

  return (
    <div className="q-card">
      <div className="row">
        <strong>Question {index + 1}</strong>
        <div className="row-actions">
          <button type="button" className="btn btn-outline btn-sm" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up">↑</button>
          <button type="button" className="btn btn-outline btn-sm" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Move down">↓</button>
          <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <label>
        Question text
        <input value={q.text} onChange={(e) => set({ text: e.target.value })} />
      </label>
      <label>
        Type
        <select value={q.type} onChange={(e) => set({ type: e.target.value as QuestionType })}>
          {QUESTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>
      {hasOptions(q.type) && (
        <label>
          Options (one per line)
          <textarea rows={4} value={q.options.join('\n')} onChange={(e) => set({ options: e.target.value.split('\n') })} />
        </label>
      )}
      {q.type === 'rating' && <p className="hint">Respondents rate from 1 to 5.</p>}
      <label className="check">
        <input type="checkbox" checked={q.mandatory} onChange={(e) => set({ mandatory: e.target.checked })} />
        Mandatory
      </label>
    </div>
  )
}