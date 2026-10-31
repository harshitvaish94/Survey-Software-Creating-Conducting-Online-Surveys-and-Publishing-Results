export type QuestionType = 'single' | 'multiple' | 'text' | 'rating' | 'dropdown'

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'single', label: 'Single choice' },
  { value: 'multiple', label: 'Multiple choice' },
  { value: 'text', label: 'Text' },
  { value: 'rating', label: 'Rating scale' },
  { value: 'dropdown', label: 'Dropdown' },
]

export const hasOptions = (t: QuestionType) => t === 'single' || t === 'multiple' || t === 'dropdown'

export const QUESTION_TEXT_MAX = 500
export const OPTION_TEXT_MAX = 200
export const RATING_DEFAULT_MIN = 1
export const RATING_DEFAULT_MAX = 5
export const RATING_ALLOWED_MIN = [0, 1]
export const RATING_ABSOLUTE_MAX = 10

/** Question as returned by the API. */
export interface ServerQuestion {
  id: number
  position: number
  text: string
  type: QuestionType
  options: string[] | null
  ratingMin: number | null
  ratingMax: number | null
}

/** Question as edited in the builder. `uid` is a client-only React key. */
export interface EditorQuestion {
  uid: string
  id?: number
  text: string
  type: QuestionType
  options: string[]
  ratingMin: number
  ratingMax: number
}

export interface QuestionPayload {
  id?: number
  text: string
  type: QuestionType
  options?: string[]
  ratingMin?: number
  ratingMax?: number
}

let uidSeq = 0
const nextUid = () => `q-${++uidSeq}`

export const newEditorQuestion = (): EditorQuestion => ({
  uid: nextUid(),
  text: '',
  type: 'single',
  options: ['Option 1', 'Option 2'],
  ratingMin: RATING_DEFAULT_MIN,
  ratingMax: RATING_DEFAULT_MAX,
})

export function toEditorQuestion(q: ServerQuestion): EditorQuestion {
  return {
    uid: nextUid(),
    id: q.id,
    text: q.text,
    type: q.type,
    options: q.options ?? (hasOptions(q.type) ? [] : ['Option 1', 'Option 2']),
    ratingMin: q.ratingMin ?? RATING_DEFAULT_MIN,
    ratingMax: q.ratingMax ?? RATING_DEFAULT_MAX,
  }
}

/** Builds the API payload; only sends the configuration that applies to the type. */
export function toQuestionPayload(q: EditorQuestion): QuestionPayload {
  const payload: QuestionPayload = { text: q.text.trim(), type: q.type }
  if (q.id != null) payload.id = q.id
  if (hasOptions(q.type)) {
    payload.options = q.options.map((o) => o.trim()).filter(Boolean)
  }
  if (q.type === 'rating') {
    payload.ratingMin = q.ratingMin
    payload.ratingMax = q.ratingMax
  }
  return payload
}

/** The numbers shown on a rating scale, e.g. [1, 2, 3, 4, 5]. */
export function ratingScale(min: number, max: number): number[] {
  const out: number[] = []
  for (let n = min; n <= max; n++) out.push(n)
  return out
}
