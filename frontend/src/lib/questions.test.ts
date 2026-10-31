import { describe, expect, it } from 'vitest'
import { ratingScale, toEditorQuestion, toQuestionPayload, newEditorQuestion } from './questions'

describe('question mapping', () => {
  it('only sends options for choice types and trims them', () => {
    const q = { ...newEditorQuestion(), text: ' Hi ', type: 'dropdown' as const, options: [' A ', '', 'B'] }
    expect(toQuestionPayload(q)).toEqual({ text: 'Hi', type: 'dropdown', options: ['A', 'B'] })
  })

  it('sends the rating range only for rating questions', () => {
    const q = { ...newEditorQuestion(), text: 'Rate', type: 'rating' as const, ratingMin: 0, ratingMax: 10 }
    expect(toQuestionPayload(q)).toEqual({ text: 'Rate', type: 'rating', ratingMin: 0, ratingMax: 10 })
    expect(toQuestionPayload({ ...q, type: 'text' })).toEqual({ text: 'Rate', type: 'text' })
  })

  it('keeps the server id so edits update instead of recreate', () => {
    const q = toEditorQuestion({
      id: 7, position: 0, text: 'T', type: 'text', options: null, ratingMin: null, ratingMax: null,
    })
    expect(toQuestionPayload(q).id).toBe(7)
  })

  it('builds the rating scale', () => {
    expect(ratingScale(0, 3)).toEqual([0, 1, 2, 3])
  })
})
