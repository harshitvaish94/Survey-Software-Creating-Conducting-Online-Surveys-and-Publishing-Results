import {
  OPTION_TEXT_MAX,
  QUESTION_TEXT_MAX,
  RATING_ABSOLUTE_MAX,
  RATING_ALLOWED_MIN,
  hasOptions,
} from './questions'
import type { EditorQuestion } from './questions'

type Config = Pick<EditorQuestion, 'text' | 'type' | 'options' | 'ratingMin' | 'ratingMax'>

/** Mirrors the backend rules in question-validation.ts. Returns messages, empty when valid. */
export function validateQuestion(q: Config): string[] {
  const errors: string[] = []
  const text = q.text.trim()
  if (!text) errors.push('Question text is required.')
  else if (text.length > QUESTION_TEXT_MAX) {
    errors.push(`Question text must be at most ${QUESTION_TEXT_MAX} characters.`)
  }

  if (hasOptions(q.type)) {
    const options = q.options.map((o) => o.trim()).filter(Boolean)
    if (options.length < 2) errors.push('Add at least two options.')
    else if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
      errors.push('Options must be different from each other.')
    }
    if (options.some((o) => o.length > OPTION_TEXT_MAX)) {
      errors.push(`Each option must be at most ${OPTION_TEXT_MAX} characters.`)
    }
  }

  if (q.type === 'rating') {
    if (!RATING_ALLOWED_MIN.includes(q.ratingMin)) errors.push('Rating scale must start at 0 or 1.')
    if (
      !Number.isInteger(q.ratingMax) ||
      q.ratingMax > RATING_ABSOLUTE_MAX ||
      q.ratingMax - q.ratingMin < 1
    ) {
      errors.push(`Rating scale must end above its start and at most ${RATING_ABSOLUTE_MAX}.`)
    }
  }
  return errors
}

export interface SurveyFormValues {
  title: string
  openDate: string
  closeDate: string
  questions: EditorQuestion[]
}

/** Validates the whole builder form; question messages are prefixed with their number. */
export function validateSurveyForm(v: SurveyFormValues): string[] {
  const errors: string[] = []
  if (!v.title.trim()) errors.push('Survey title is required.')
  if (v.openDate && v.closeDate && v.closeDate < v.openDate) {
    errors.push('Closing date cannot be earlier than opening date.')
  }
  v.questions.forEach((q, i) => {
    validateQuestion(q).forEach((m) => errors.push(`Question ${i + 1}: ${m}`))
  })
  return errors
}
