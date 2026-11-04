import { describe, expect, it } from 'vitest'
import { newEditorQuestion } from './questions'
import type { EditorQuestion } from './questions'
import { validateQuestion, validateSurveyForm } from './questionValidation'

const q = (patch: Partial<EditorQuestion>): EditorQuestion => ({ ...newEditorQuestion(), text: 'Q?', ...patch })

describe('validateQuestion', () => {
  it('accepts a complete single choice question', () => {
    expect(validateQuestion(q({ type: 'single', options: ['A', 'B'] }))).toEqual([])
  })

  it('requires text', () => {
    expect(validateQuestion(q({ text: '   ' }))).toContain('Question text is required.')
  })

  it.each(['single', 'multiple', 'dropdown'] as const)('%s needs two non-empty options', (type) => {
    expect(validateQuestion(q({ type, options: ['A', ' '] }))).toContain('Add at least two options.')
  })

  it('rejects duplicate options ignoring case', () => {
    expect(validateQuestion(q({ type: 'dropdown', options: ['Yes', 'yes'] }))).toContain(
      'Options must be different from each other.',
    )
  })

  it('does not require options for text questions', () => {
    expect(validateQuestion(q({ type: 'text', options: [] }))).toEqual([])
  })

  it('validates the rating range', () => {
    expect(validateQuestion(q({ type: 'rating', ratingMin: 1, ratingMax: 10 }))).toEqual([])
    expect(validateQuestion(q({ type: 'rating', ratingMin: 2, ratingMax: 5 }))).toHaveLength(1)
    expect(validateQuestion(q({ type: 'rating', ratingMin: 1, ratingMax: 11 }))).toHaveLength(1)
    expect(validateQuestion(q({ type: 'rating', ratingMin: 1, ratingMax: 1 }))).toHaveLength(1)
  })
})

describe('validateSurveyForm', () => {
  it('prefixes question problems with their number and checks title and dates', () => {
    const errors = validateSurveyForm({
      title: '',
      openDate: '2026-05-02',
      closeDate: '2026-05-01',
      questions: [q({ text: '' })],
    })
    expect(errors).toEqual([
      'Survey title is required.',
      'Closing date cannot be earlier than opening date.',
      'Question 1: Question text is required.',
    ])
  })

  it('allows a draft with no questions', () => {
    expect(validateSurveyForm({ title: 'T', openDate: '', closeDate: '', questions: [] })).toEqual([])
  })
})
