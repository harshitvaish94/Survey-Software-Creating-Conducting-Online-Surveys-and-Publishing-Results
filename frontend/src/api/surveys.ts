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

interface SurveyPayload {
  title: string
  description: string
  openDate?: string
  closeDate?: string
  questions: QuestionPayload[]
}

function toPayload(input: SurveyInput): SurveyPayload {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    openDate: input.openDate || undefined,
    closeDate: input.closeDate || undefined,
    questions: input.questions.map(toQuestionPayload),
  }
}

export const listSurveys = () => request<Survey[]>('/surveys')

export const getSurvey = (id: number) => request<Survey>(`/surveys/${id}`)

export const publishSurvey = (id: number) =>
  request<Survey>(`/surveys/${id}/publish`, { method: 'POST' })

export const submitResponse = (id: number, answers: Record<string, unknown>) =>
  request<{ id: number }>(`/surveys/${id}/responses`, { method: 'POST', body: JSON.stringify({ answers }) })

export const updateSurvey = (id: number, input: SurveyInput) =>
  request<Survey>(`/surveys/${id}`, { method: 'PUT', body: JSON.stringify(toPayload(input)) })
