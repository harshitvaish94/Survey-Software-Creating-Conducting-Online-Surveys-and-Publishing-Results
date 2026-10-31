import { describe, expect, it } from 'vitest';
import { validateAnswers } from './answer-validation';
import { QuestionType } from './question.entity';

const question = (id: number, type: QuestionType, mandatory: boolean, extra = {}) => ({
  id,
  text: `Q${id}`,
  type,
  mandatory,
  options: null as string[] | null,
  ratingMin: null as number | null,
  ratingMax: null as number | null,
  ...extra,
});

const single = (m: boolean) => question(1, QuestionType.SINGLE, m, { options: ['A', 'B'] });
const multiple = (m: boolean) => question(2, QuestionType.MULTIPLE, m, { options: ['X', 'Y', 'Z'] });
const text = (m: boolean) => question(3, QuestionType.TEXT, m);
const rating = (m: boolean) => question(4, QuestionType.RATING, m, { ratingMin: 1, ratingMax: 5 });
const dropdown = (m: boolean) => question(5, QuestionType.DROPDOWN, m, { options: ['IN', 'US'] });

describe('validateAnswers: mandatory questions', () => {
  it.each([
    ['single', single(true)],
    ['multiple', multiple(true)],
    ['text', text(true)],
    ['rating', rating(true)],
    ['dropdown', dropdown(true)],
  ])('mandatory %s question rejects a missing answer', (_name, q) => {
    expect(validateAnswers([q], {}).errors).toEqual([`"Q${q.id}" is required.`]);
  });

  it('treats empty string, whitespace, null and [] as unanswered', () => {
    const qs = [single(true), multiple(true), text(true), dropdown(true)];
    const { errors } = validateAnswers(qs, { 1: '', 2: [], 3: '   ', 5: null });
    expect(errors).toHaveLength(4);
  });

  it('mandatory single choice needs exactly one valid option', () => {
    expect(validateAnswers([single(true)], { 1: 'A' }).errors).toEqual([]);
    expect(validateAnswers([single(true)], { 1: ['A'] }).errors).toHaveLength(1);
    expect(validateAnswers([single(true)], { 1: 'C' }).errors).toHaveLength(1);
  });

  it('mandatory multiple choice needs at least one valid option', () => {
    expect(validateAnswers([multiple(true)], { 2: ['X'] }).errors).toEqual([]);
    expect(validateAnswers([multiple(true)], { 2: ['X', 'Z'] }).errors).toEqual([]);
    expect(validateAnswers([multiple(true)], { 2: ['X', 'Q'] }).errors).toHaveLength(1);
    expect(validateAnswers([multiple(true)], { 2: ['X', 'X'] }).errors).toHaveLength(1);
    expect(validateAnswers([multiple(true)], { 2: 'X' }).errors).toHaveLength(1);
  });

  it('mandatory text needs non-empty text and is trimmed', () => {
    const { answers, errors } = validateAnswers([text(true)], { 3: '  hello  ' });
    expect(errors).toEqual([]);
    expect(answers[3]).toBe('hello');
  });

  it('mandatory rating needs a whole number inside the range', () => {
    expect(validateAnswers([rating(true)], { 4: 3 }).errors).toEqual([]);
    for (const bad of [0, 6, 2.5, '3']) {
      expect(validateAnswers([rating(true)], { 4: bad }).errors).toHaveLength(1);
    }
  });

  it('rating honours a custom 0-10 range', () => {
    const q = question(4, QuestionType.RATING, true, { ratingMin: 0, ratingMax: 10 });
    expect(validateAnswers([q], { 4: 0 }).errors).toEqual([]);
    expect(validateAnswers([q], { 4: 10 }).errors).toEqual([]);
    expect(validateAnswers([q], { 4: 11 }).errors).toHaveLength(1);
  });

  it('mandatory dropdown needs a listed option', () => {
    expect(validateAnswers([dropdown(true)], { 5: 'US' }).errors).toEqual([]);
    expect(validateAnswers([dropdown(true)], { 5: 'FR' }).errors).toHaveLength(1);
  });
});

describe('validateAnswers: optional questions', () => {
  it('allows every optional question to stay empty', () => {
    const qs = [single(false), multiple(false), text(false), rating(false), dropdown(false)];
    const { answers, errors } = validateAnswers(qs, {});
    expect(errors).toEqual([]);
    expect(answers).toEqual({});
  });

  it('still rejects an invalid answer to an optional question', () => {
    expect(validateAnswers([rating(false)], { 4: 99 }).errors).toHaveLength(1);
    expect(validateAnswers([single(false)], { 1: 'Nope' }).errors).toHaveLength(1);
  });
});

describe('validateAnswers: misc', () => {
  it('rejects unknown question ids', () => {
    expect(validateAnswers([text(false)], { 99: 'x' }).errors).toEqual(['Unknown question id "99".']);
  });

  it('rejects non-string text and over-long text', () => {
    expect(validateAnswers([text(false)], { 3: 5 }).errors).toHaveLength(1);
    expect(validateAnswers([text(false)], { 3: 'a'.repeat(5001) }).errors).toHaveLength(1);
  });

  it('reports every problem at once', () => {
    const { errors } = validateAnswers([single(true), text(true)], {});
    expect(errors).toHaveLength(2);
  });
});
