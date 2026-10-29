export type QuestionType = 'single' | 'multiple' | 'text' | 'rating' | 'dropdown'

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'single', label: 'Single choice' },
  { value: 'multiple', label: 'Multiple choice' },
  { value: 'text', label: 'Text' },
  { value: 'rating', label: 'Rating scale (1 to 5)' },
  { value: 'dropdown', label: 'Dropdown' },
]

export const hasOptions = (t: QuestionType) => t === 'single' || t === 'multiple' || t === 'dropdown'

export interface Question {
  id: number
  text: string
  type: QuestionType
  options: string[]
  mandatory: boolean
}

export interface SurveyInput {
  title: string
  description: string
  openDate: string
  closeDate: string
  questions: Question[]
}

export interface Survey extends SurveyInput {
  id: number
  status: 'Draft'
}

const KEY = 'sms_surveys'
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function listSurveys(): Survey[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Survey[]
  } catch {
    return []
  }
}

export function getSurvey(id: number): Survey | undefined {
  return listSurveys().find((s) => s.id === id)
}

function persist(all: Survey[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

function validate(input: SurveyInput) {
  if (!input.title.trim()) throw new Error('Title is required')
  if (input.openDate && input.closeDate && input.closeDate < input.openDate) {
    throw new Error('Close date cannot be earlier than open date')
  }
  if (input.questions.length === 0) throw new Error('Add at least one question')
  for (const [i, q] of input.questions.entries()) {
    if (!q.text.trim()) throw new Error(`Question ${i + 1} needs text`)
    if (hasOptions(q.type) && q.options.filter((o) => o.trim()).length < 2) {
      throw new Error(`Question ${i + 1} needs at least two options`)
    }
  }
}

// Mock API: replace with the real backend calls when SMS-16/17/19 are ready.
export async function saveSurvey(input: SurveyInput): Promise<Survey> {
  await delay(300)
  validate(input)
  const saved: Survey = { ...input, id: Date.now(), status: 'Draft' }
  persist([...listSurveys(), saved])
  return saved
}

export async function updateSurvey(id: number, input: SurveyInput): Promise<Survey> {
  await delay(300)
  validate(input)
  const all = listSurveys()
  const current = all.find((s) => s.id === id)
  if (!current) throw new Error('Survey not found')
  const updated: Survey = { ...input, id, status: current.status }
  persist(all.map((s) => (s.id === id ? updated : s)))
  return updated
}