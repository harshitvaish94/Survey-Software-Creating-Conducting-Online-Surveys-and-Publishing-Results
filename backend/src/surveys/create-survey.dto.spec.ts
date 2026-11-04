import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateSurveyDto } from './create-survey.dto';

const check = (body: unknown) => validate(plainToInstance(CreateSurveyDto, body));

const valid = [
  { text: 'Pick one', type: 'single', options: ['A', 'B'] },
  { text: 'Pick many', type: 'multiple', options: ['A', 'B'] },
  { text: 'Comment', type: 'text' },
  { text: 'Rate', type: 'rating', ratingMin: 1, ratingMax: 5 },
  { text: 'Country', type: 'dropdown', options: ['A', 'B'] },
];

describe('CreateSurveyDto question validation', () => {
  it('accepts a survey with all five question types', async () => {
    expect(await check({ title: 'S', questions: valid })).toHaveLength(0);
  });

  it('accepts a survey without questions', async () => {
    expect(await check({ title: 'S' })).toHaveLength(0);
  });

  it('requires a title', async () => {
    expect((await check({ questions: [] })).map((e) => e.property)).toContain('title');
  });

  it.each([
    ['an unknown type', { text: 'Q', type: 'matrix' }],
    ['missing text', { type: 'text' }],
    ['empty text', { text: '', type: 'text' }],
    ['text over 500 characters', { text: 'x'.repeat(501), type: 'text' }],
    ['non-array options', { text: 'Q', type: 'single', options: 'A,B' }],
    ['non-string options', { text: 'Q', type: 'single', options: [1, 2] }],
    ['a fractional rating range', { text: 'Q', type: 'rating', ratingMin: 1.5, ratingMax: 5 }],
    ['a non-numeric rating range', { text: 'Q', type: 'rating', ratingMin: '1', ratingMax: '5' }],
  ])('rejects a question with %s', async (_name, question) => {
    const errors = await check({ title: 'S', questions: [question] });
    expect(errors.map((e) => e.property)).toContain('questions');
  });

  it('rejects more than 100 questions', async () => {
    const many = Array.from({ length: 101 }, () => ({ text: 'Q', type: 'text' }));
    expect((await check({ title: 'S', questions: many })).map((e) => e.property)).toContain('questions');
  });
});
