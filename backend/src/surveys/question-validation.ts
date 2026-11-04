import { BadRequestException } from '@nestjs/common';
import { QuestionType } from './question.entity';

export const QUESTION_TEXT_MAX = 500;
export const OPTION_TEXT_MAX = 200;
export const RATING_DEFAULT_MIN = 1;
export const RATING_DEFAULT_MAX = 5;
export const RATING_ALLOWED_MIN = [0, 1];
export const RATING_ABSOLUTE_MAX = 10;

const OPTION_TYPES: QuestionType[] = [
  QuestionType.SINGLE,
  QuestionType.MULTIPLE,
  QuestionType.DROPDOWN,
];

export function hasOptions(type: QuestionType): boolean {
  return OPTION_TYPES.includes(type);
}

export interface QuestionConfigInput {
  text?: string | null;
  type?: QuestionType | null;
  options?: string[] | null;
  ratingMin?: number | null;
  ratingMax?: number | null;
  mandatory?: boolean | null;
}

export interface NormalizedQuestion {
  text: string;
  type: QuestionType;
  options: string[] | null;
  ratingMin: number | null;
  ratingMax: number | null;
  /** undefined means "not supplied": keep the stored value, or false for new questions. */
  mandatory?: boolean;
}

/** Returns validation messages (empty when valid) and the cleaned question. */
export function checkQuestion(
  input: QuestionConfigInput,
  label = 'Question',
): { errors: string[]; value: NormalizedQuestion } {
  const errors: string[] = [];
  const text = (input.text ?? '').trim();
  if (!text) {
    errors.push(`${label}: text is required.`);
  } else if (text.length > QUESTION_TEXT_MAX) {
    errors.push(
      `${label}: text must be at most ${QUESTION_TEXT_MAX} characters.`,
    );
  }

  const type = input.type as QuestionType;
  if (!Object.values(QuestionType).includes(type)) {
    errors.push(
      `${label}: type must be one of ${Object.values(QuestionType).join(', ')}.`,
    );
    return {
      errors,
      value: {
        text,
        type,
        options: null,
        ratingMin: null,
        ratingMax: null,
        mandatory: input.mandatory ?? undefined,
      },
    };
  }

  const provided = (input.options ?? []).map((o) =>
    typeof o === 'string' ? o.trim() : '',
  );
  let options: string[] | null = null;
  if (hasOptions(type)) {
    options = provided.filter(Boolean);
    const unique = new Set(options.map((o) => o.toLowerCase()));
    if (options.length < 2) {
      errors.push(`${label}: at least two options are required.`);
    } else if (unique.size !== options.length) {
      errors.push(`${label}: options must be unique.`);
    }
    if (options.some((o) => o.length > OPTION_TEXT_MAX)) {
      errors.push(
        `${label}: each option must be at most ${OPTION_TEXT_MAX} characters.`,
      );
    }
  } else if (provided.some(Boolean)) {
    errors.push(`${label}: ${type} questions cannot have options.`);
  }

  let ratingMin: number | null = null;
  let ratingMax: number | null = null;
  if (type === QuestionType.RATING) {
    ratingMin = input.ratingMin ?? RATING_DEFAULT_MIN;
    ratingMax = input.ratingMax ?? RATING_DEFAULT_MAX;
    if (!Number.isInteger(ratingMin) || !RATING_ALLOWED_MIN.includes(ratingMin)) {
      errors.push(`${label}: rating minimum must be 0 or 1.`);
    }
    if (
      !Number.isInteger(ratingMax) ||
      ratingMax > RATING_ABSOLUTE_MAX ||
      ratingMax - ratingMin < 1
    ) {
      errors.push(
        `${label}: rating maximum must be a whole number above the minimum and at most ${RATING_ABSOLUTE_MAX}.`,
      );
    }
  }

  return {
    errors,
    value: {
      text,
      type,
      options,
      ratingMin,
      ratingMax,
      mandatory: input.mandatory ?? undefined,
    },
  };
}

/** Validates and normalizes a question, throwing 400 with all messages. */
export function normalizeQuestion(
  input: QuestionConfigInput,
  label = 'Question',
): NormalizedQuestion {
  const { errors, value } = checkQuestion(input, label);
  if (errors.length > 0) {
    throw new BadRequestException(errors);
  }
  return value;
}
