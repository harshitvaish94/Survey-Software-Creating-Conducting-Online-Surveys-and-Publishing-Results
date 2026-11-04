import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { QuestionType } from './question.entity';
import { checkQuestion, normalizeQuestion } from './question-validation';

const base = { text: 'How was it?' };

describe('question validation', () => {
  it('accepts a single-choice question and trims its options', () => {
    const q = normalizeQuestion({
      ...base,
      type: QuestionType.SINGLE,
      options: [' Good ', 'Bad', ''],
    });
    expect(q.options).toEqual(['Good', 'Bad']);
    expect(q.ratingMin).toBeNull();
  });

  it.each([QuestionType.MULTIPLE, QuestionType.DROPDOWN])(
    'accepts %s with two options',
    (type) => {
      expect(normalizeQuestion({ ...base, type, options: ['A', 'B'] }).type).toBe(
        type,
      );
    },
  );

  it.each([QuestionType.SINGLE, QuestionType.MULTIPLE, QuestionType.DROPDOWN])(
    'rejects %s with fewer than two options',
    (type) => {
      const { errors } = checkQuestion({ ...base, type, options: ['Only'] });
      expect(errors.join()).toContain('at least two options');
    },
  );

  it('rejects duplicate options case-insensitively', () => {
    const { errors } = checkQuestion({
      ...base,
      type: QuestionType.DROPDOWN,
      options: ['Yes', 'yes'],
    });
    expect(errors.join()).toContain('unique');
  });

  it('rejects overly long option text', () => {
    const { errors } = checkQuestion({
      ...base,
      type: QuestionType.SINGLE,
      options: ['a'.repeat(201), 'b'],
    });
    expect(errors.join()).toContain('at most 200');
  });

  it('accepts a text question without options', () => {
    const q = normalizeQuestion({ ...base, type: QuestionType.TEXT });
    expect(q.options).toBeNull();
  });

  it.each([QuestionType.TEXT, QuestionType.RATING])(
    'rejects options on %s questions',
    (type) => {
      const { errors } = checkQuestion({ ...base, type, options: ['A'] });
      expect(errors.join()).toContain('cannot have options');
    },
  );

  it('defaults a rating question to 1-5', () => {
    const q = normalizeQuestion({ ...base, type: QuestionType.RATING });
    expect([q.ratingMin, q.ratingMax]).toEqual([1, 5]);
  });

  it('accepts a custom rating range', () => {
    const q = normalizeQuestion({
      ...base,
      type: QuestionType.RATING,
      ratingMin: 0,
      ratingMax: 10,
    });
    expect([q.ratingMin, q.ratingMax]).toEqual([0, 10]);
  });

  it.each([
    [2, 5, 'minimum'],
    [1, 11, 'maximum'],
    [1, 1, 'maximum'],
    [1, 2.5, 'maximum'],
  ])('rejects rating range %s-%s', (ratingMin, ratingMax, expected) => {
    const { errors } = checkQuestion({
      ...base,
      type: QuestionType.RATING,
      ratingMin,
      ratingMax,
    });
    expect(errors.join()).toContain(expected);
  });

  it('ignores stale rating values on non-rating types', () => {
    const q = normalizeQuestion({
      ...base,
      type: QuestionType.TEXT,
      ratingMin: 1,
      ratingMax: 5,
    });
    expect([q.ratingMin, q.ratingMax]).toEqual([null, null]);
  });

  it('rejects empty and too-long text', () => {
    expect(checkQuestion({ text: '  ', type: QuestionType.TEXT }).errors).toHaveLength(1);
    expect(
      checkQuestion({ text: 'x'.repeat(501), type: QuestionType.TEXT }).errors.join(),
    ).toContain('at most 500');
  });

  it('rejects an unknown type', () => {
    const { errors } = checkQuestion({ ...base, type: 'bogus' as QuestionType });
    expect(errors.join()).toContain('type must be one of');
  });

  it('throws BadRequestException with every message', () => {
    expect(() => normalizeQuestion({ text: '', type: QuestionType.SINGLE })).toThrow(
      BadRequestException,
    );
  });
});
