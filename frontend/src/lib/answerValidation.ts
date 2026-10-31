import type { AnswerValue, RespondentQuestion } from './questions'

export type AnswerMap = Record<number, AnswerValue | undefined>

/** True when the respondent has not really answered (blank, whitespace or empty selection). */
export function isEmptyAnswer(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

/**
 * Returns an error message per question id. Mirrors the backend rules:
 * mandatory questions need a valid answer, optional ones may be empty.
 */
export function validateAnswers(
  questions: RespondentQuestion[],
  answers: AnswerMap,
): Record<number, string> {
  const errors: Record<number, string> = {}
  for (const q of questions) {
    const value = answers[q.id]
    if (isEmptyAnswer(value)) {
      if (q.mandatory) errors[q.id] = 'This question is required.'
      continue
    }
    const options = q.options ?? []
    if (q.type === 'single' || q.type === 'dropdown') {
      if (typeof value !== 'string' || !options.includes(value)) errors[q.id] = 'Choose one of the options.'
    } else if (q.type === 'multiple') {
      if (!Array.isArray(value) || value.some((v) => !options.includes(v))) {
        errors[q.id] = 'Choose from the listed options.'
      }
    } else if (q.type === 'rating') {
      const min = q.ratingMin ?? 1
      const max = q.ratingMax ?? 5
      if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
        errors[q.id] = `Choose a rating from ${min} to ${max}.`
      }
    } else if (q.type === 'text' && typeof value !== 'string') {
      errors[q.id] = 'Enter your answer as text.'
    }
  }
  return errors
}

/** Builds the API body: unanswered questions are left out, text is trimmed. */
export function buildAnswerPayload(
  questions: RespondentQuestion[],
  answers: AnswerMap,
): Record<string, string | string[] | number> {
  const payload: Record<string, string | string[] | number> = {}
  for (const q of questions) {
    const value = answers[q.id]
    if (value === undefined || value === null || isEmptyAnswer(value)) continue
    payload[String(q.id)] = typeof value === 'string' ? value.trim() : value
  }
  return payload
}
