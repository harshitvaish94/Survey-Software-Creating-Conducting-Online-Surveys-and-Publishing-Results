import { Question, QuestionType } from './question.entity';

export type AnswerValue = string | string[] | number;

type AnswerableQuestion = Pick<
  Question,
  'id' | 'text' | 'type' | 'options' | 'ratingMin' | 'ratingMax' | 'mandatory'
>;

export const TEXT_ANSWER_MAX = 5000;

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

/**
 * Checks respondent answers (keyed by question id) against the survey's
 * questions. Mandatory questions need a valid answer; optional ones may be
 * empty, but any answer that is given must still be valid.
 */
export function validateAnswers(
  questions: AnswerableQuestion[],
  raw: Record<string, unknown>,
): { answers: Record<string, AnswerValue>; errors: string[] } {
  const errors: string[] = [];
  const answers: Record<string, AnswerValue> = {};

  const known = new Set(questions.map((q) => String(q.id)));
  for (const key of Object.keys(raw)) {
    if (!known.has(key)) errors.push(`Unknown question id "${key}".`);
  }

  for (const q of questions) {
    const key = String(q.id);
    const value = raw[key];
    const label = `"${q.text}"`;

    if (isEmpty(value)) {
      if (q.mandatory) errors.push(`${label} is required.`);
      continue;
    }

    const options = q.options ?? [];
    switch (q.type) {
      case QuestionType.SINGLE:
      case QuestionType.DROPDOWN:
        if (typeof value === 'string' && options.includes(value)) {
          answers[key] = value;
        } else {
          errors.push(`${label}: choose exactly one of the listed options.`);
        }
        break;
      case QuestionType.MULTIPLE:
        if (
          Array.isArray(value) &&
          value.every((v) => typeof v === 'string' && options.includes(v)) &&
          new Set(value).size === value.length
        ) {
          answers[key] = value as string[];
        } else {
          errors.push(`${label}: choose from the listed options only.`);
        }
        break;
      case QuestionType.TEXT:
        if (typeof value !== 'string') {
          errors.push(`${label}: answer must be text.`);
        } else if (value.trim().length > TEXT_ANSWER_MAX) {
          errors.push(
            `${label}: answer must be at most ${TEXT_ANSWER_MAX} characters.`,
          );
        } else {
          answers[key] = value.trim();
        }
        break;
      case QuestionType.RATING: {
        const min = q.ratingMin ?? 1;
        const max = q.ratingMax ?? 5;
        if (
          typeof value === 'number' &&
          Number.isInteger(value) &&
          value >= min &&
          value <= max
        ) {
          answers[key] = value;
        } else {
          errors.push(
            `${label}: rating must be a whole number from ${min} to ${max}.`,
          );
        }
        break;
      }
    }
  }

  return { answers, errors };
}
