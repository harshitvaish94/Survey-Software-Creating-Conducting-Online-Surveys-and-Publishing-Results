import { describe, expect, it } from 'vitest'
import { buildAnswerPayload, isEmptyAnswer, validateAnswers } from './answerValidation'
import type { RespondentQuestion } from './questions'

const q = (patch: Partial<RespondentQuestion> & Pick<RespondentQuestion, 'id' | 'type'>): RespondentQuestion => ({
  text: `Q${patch.id}`, options: null, ratingMin: null, ratingMax: null, mandatory: false, ...patch,
})

const single = (mandatory: boolean) => q({ id: 1, type: 'single', options: ['A', 'B'], mandatory })
const multiple = (mandatory: boolean) => q({ id: 2, type: 'multiple', options: ['X', 'Y'], mandatory })
const text = (mandatory: boolean) => q({ id: 3, type: 'text', mandatory })
const rating = (mandatory: boolean) => q({ id: 4, type: 'rating', ratingMin: 1, ratingMax: 5, mandatory })
const dropdown = (mandatory: boolean) => q({ id: 5, type: 'dropdown', options: ['IN', 'US'], mandatory })

describe('validateAnswers (frontend)', () => {
  it.each([single, multiple, text, rating, dropdown])('mandatory question %#: blank is rejected', (make) => {
    const question = make(true)
    expect(validateAnswers([question], {})[question.id]).toBe('This question is required.')
  })

  it.each([single, multiple, text, rating, dropdown])('optional question %#: blank is allowed', (make) => {
    expect(validateAnswers([make(false)], {})).toEqual({})
  })

  it('treats whitespace text and empty selections as blank', () => {
    const errors = validateAnswers([text(true), multiple(true), dropdown(true)], { 3: '  ', 2: [], 5: null })
    expect(Object.keys(errors)).toHaveLength(3)
  })

  it('accepts valid answers for every type', () => {
    const qs = [single(true), multiple(true), text(true), rating(true), dropdown(true)]
    expect(validateAnswers(qs, { 1: 'A', 2: ['X', 'Y'], 3: 'hi', 4: 5, 5: 'US' })).toEqual({})
  })

  it('rejects answers outside the options or rating range, even when optional', () => {
    expect(validateAnswers([single(false)], { 1: 'Z' })[1]).toBeTruthy()
    expect(validateAnswers([multiple(false)], { 2: ['Z'] })[2]).toBeTruthy()
    expect(validateAnswers([rating(false)], { 4: 6 })[4]).toBeTruthy()
    expect(validateAnswers([rating(false)], { 4: 0 })[4]).toBeTruthy()
  })

  it('uses the configured rating range', () => {
    const r = q({ id: 4, type: 'rating', ratingMin: 0, ratingMax: 10, mandatory: true })
    expect(validateAnswers([r], { 4: 0 })).toEqual({})
    expect(validateAnswers([r], { 4: 10 })).toEqual({})
    expect(validateAnswers([r], { 4: 11 })[4]).toBeTruthy()
  })
})

describe('answer helpers', () => {
  it('detects empty answers', () => {
    expect(isEmptyAnswer(undefined)).toBe(true)
    expect(isEmptyAnswer(' ')).toBe(true)
    expect(isEmptyAnswer([])).toBe(true)
    expect(isEmptyAnswer(0)).toBe(false)
  })

  it('builds a payload without unanswered questions and with trimmed text', () => {
    const qs = [single(false), text(false), rating(false)]
    expect(buildAnswerPayload(qs, { 1: null, 3: ' hi ', 4: 0 })).toEqual({ '3': 'hi', '4': 0 })
  })
})
