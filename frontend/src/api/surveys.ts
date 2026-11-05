import { request } from './http'
import { toQuestionPayload } from '../lib/questions'
import type { EditorQuestion, QuestionPayload, ServerQuestion } from '../lib/questions'

export type SurveyStatus = 'Draft' | 'Published' | 'Closed'

export interface Survey {
  id: number
  title: string
  description: string | null
  openDate: string | null
  closeDate: string | null
  status: SurveyStatus
  createdAt: string
  updatedAt: string
  questions: ServerQuestion[]
}

export interface SurveyInput {
  title: string
  description: string
  openDate: string
  closeDate: string
  questions: EditorQuestion[]
}

export interface Survey extends SurveyInput {
  id: number
  status: 'Draft'
  ownerEmail?: string
}

const KEY = 'sms_surveys'
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const same = (a?: string, b?: string) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()

// Pass the logged-in user's email to get only their surveys.
// With no argument it returns all surveys (used internally and by the public respondent page).
export function listSurveys(ownerEmail?: string): Survey[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Survey[]
    return ownerEmail === undefined ? all : all.filter((s) => same(s.ownerEmail, ownerEmail))
  } catch {
    return []
  }
}

export const listSurveys = () => request<Survey[]>('/surveys')

export const getSurvey = (id: number) => request<Survey>(`/surveys/${id}`)

export const publishSurvey = (id: number) =>
  request<Survey>(`/surveys/${id}/publish`, { method: 'POST' })

export async function saveSurvey(input: SurveyInput, ownerEmail: string): Promise<Survey> {
  await delay(300)
  validate(input)
  const saved: Survey = { ...input, id: Date.now(), status: 'Draft', ownerEmail }
  persist([...listSurveys(), saved])
  return saved
}

export async function updateSurvey(id: number, input: SurveyInput, ownerEmail: string): Promise<Survey> {
  await delay(300)
  validate(input)
  const all = listSurveys()
  const current = all.find((s) => s.id === id)
  if (!current) throw new Error('Survey not found')
  if (!same(current.ownerEmail, ownerEmail)) throw new Error('You can only edit your own surveys')
  const updated: Survey = { ...input, id, status: current.status, ownerEmail: current.ownerEmail }
  persist(all.map((s) => (s.id === id ? updated : s)))
  return updated
}

// ---- SMS-26: respondent answers (localStorage for now, real API later) ----
export type AnswerValue = string | string[]

export interface Answer {
  questionId: number
  value: AnswerValue
}

export interface SurveyResponse {
  id: number
  surveyId: number
  submittedAt: string
  answers: Answer[]
}

const RESPONSES_KEY = 'sms_responses'

export function listResponses(surveyId?: number): SurveyResponse[] {
  try {
    const all = JSON.parse(localStorage.getItem(RESPONSES_KEY) ?? '[]') as SurveyResponse[]
    return surveyId === undefined ? all : all.filter((r) => r.surveyId === surveyId)
  } catch {
    return []
  }
}

// Mock API: replace with the real POST when the backend responses endpoint is ready.
export async function submitResponse(surveyId: number, answers: Answer[]): Promise<SurveyResponse> {
  await delay(300)
  const survey = getSurvey(surveyId)
  if (!survey) throw new Error('Survey not found')
  for (const q of survey.questions) {
    if (!q.mandatory) continue
    const a = answers.find((x) => x.questionId === q.id)
    const empty = !a || (Array.isArray(a.value) ? a.value.length === 0 : !a.value.trim())
    if (empty) throw new Error(`Please answer: ${q.text}`)
  }
  const saved: SurveyResponse = {
    id: Date.now(),
    surveyId,
    submittedAt: new Date().toISOString(),
    answers,
  }
  try {
    localStorage.setItem(RESPONSES_KEY, JSON.stringify([...listResponses(), saved]))
  } catch {
    /* ignore */
  }
  return saved
}
