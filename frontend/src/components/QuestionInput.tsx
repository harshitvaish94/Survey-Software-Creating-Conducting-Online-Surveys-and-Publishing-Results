import type { ReactNode } from 'react'
import { ratingScale } from '../lib/questions'
import type { QuestionType } from '../lib/questions'

export type AnswerValue = string | string[] | number | null

export interface RespondentQuestion {
  id: number
  text: string
  type: QuestionType
  options: string[] | null
  ratingMin: number | null
  ratingMax: number | null
}

interface Props {
  question: RespondentQuestion
  value: AnswerValue
  onChange: (value: AnswerValue) => void
  error?: string
}

/** Renders the right input for a question type. Used by the preview and respondent pages. */
export default function QuestionInput({ question, value, onChange, error }: Props) {
  const options = question.options ?? []
  const name = `answer-${question.id}`
  const errorId = `${name}-error`
  const describedBy = error ? errorId : undefined

  let body: ReactNode
  switch (question.type) {
    case 'single':
      body = (
        <div className="options">
          {options.map((o) => (
            <label key={o} className={value === o ? 'opt on' : 'opt'}>
              <input type="radio" name={name} checked={value === o} onChange={() => onChange(o)} />
              {o}
            </label>
          ))}
        </div>
      )
      break
    case 'multiple': {
      const selected = Array.isArray(value) ? value : []
      body = (
        <div className="options">
          {options.map((o) => {
            const on = selected.includes(o)
            return (
              <label key={o} className={on ? 'opt on' : 'opt'}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onChange(on ? selected.filter((s) => s !== o) : [...selected, o])}
                />
                {o}
              </label>
            )
          })}
        </div>
      )
      break
    }
    case 'dropdown':
      body = (
        <select
          aria-label={question.text}
          aria-describedby={describedBy}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">Select an option</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )
      break
    case 'text':
      body = (
        <textarea
          aria-label={question.text}
          aria-describedby={describedBy}
          rows={3}
          maxLength={5000}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
      break
    case 'rating': {
      const min = question.ratingMin ?? 1
      const max = question.ratingMax ?? 5
      body = (
        <>
          <div className="options" role="radiogroup" aria-label={`Rating from ${min} to ${max}`}>
            {ratingScale(min, max).map((n) => (
              <label key={n} className={value === n ? 'opt on' : 'opt'}>
                <input type="radio" name={name} checked={value === n} onChange={() => onChange(n)} />
                {n}
              </label>
            ))}
          </div>
          <div className="rating-ends">
            <span>{min} = lowest</span>
            <span>{max} = highest</span>
          </div>
        </>
      )
      break
    }
  }

  return (
    <fieldset className="resp-q">
      <legend>{question.text}</legend>
      {body}
      {error && (
        <p id={errorId} className="error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
