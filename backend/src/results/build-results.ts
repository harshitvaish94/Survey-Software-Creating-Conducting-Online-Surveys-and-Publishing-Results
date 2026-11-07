import { QuestionType } from '../surveys/question.entity';
import type { Question } from '../surveys/question.entity';
import type { Survey } from '../surveys/survey.entity';

/** Raw numbers from the SQL aggregation (see ResultsService.aggregate). */
export interface AggregateRows {
  totalResponses: number;
  /** How many responses answered each question. */
  answered: { questionId: number; count: number }[];
  /** One row per (question, chosen option). Multiple-choice answers count once per option picked. */
  choices: { questionId: number; option: string; count: number }[];
  ratings: { questionId: number; average: number; total: number }[];
  texts: { questionId: number; value: string }[];
}

export interface ChoiceCount {
  label: string;
  count: number;
  /** Share of all selections for this question, 0–100, two decimals. */
  percent: number;
}

export interface QuestionResult {
  id: number;
  type: QuestionType;
  text: string;
  /** Responses that answered this question (optional questions can be skipped). */
  answered: number;
  counts?: ChoiceCount[];
  average?: number;
  totalRatings?: number;
  textAnswers?: string[];
}

export interface SurveyResults {
  surveyId: number;
  title: string;
  totalResponses: number;
  questions: QuestionResult[];
}

const CHOICE_TYPES = new Set([
  QuestionType.SINGLE,
  QuestionType.MULTIPLE,
  QuestionType.DROPDOWN,
]);

const round2 = (n: number) => Math.round(n * 100) / 100;

function choiceCounts(
  question: Question,
  rows: AggregateRows['choices'],
): ChoiceCount[] {
  const byOption = new Map<string, number>();
  for (const row of rows) {
    if (row.questionId === question.id) byOption.set(row.option, row.count);
  }
  // Every defined option is listed, in the creator's order, even with zero votes.
  const labels = [...(question.options ?? [])];
  for (const option of byOption.keys()) {
    if (!labels.includes(option)) labels.push(option);
  }
  const counts = labels.map((label) => ({
    label,
    count: byOption.get(label) ?? 0,
  }));
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  return counts.map((c) => ({
    ...c,
    percent: total > 0 ? round2((c.count / total) * 100) : 0,
  }));
}

/**
 * SMS-29: turns the aggregated rows into per-question results, in the survey's
 * question order. Kept free of database code so it can be checked against a
 * hand-calculated reference data set (TC-Res-01).
 */
export function buildResults(
  survey: Survey,
  rows: AggregateRows,
): SurveyResults {
  const answered = new Map(rows.answered.map((r) => [r.questionId, r.count]));
  const questions = [...survey.questions]
    .sort((a, b) => a.position - b.position)
    .map((question): QuestionResult => {
      const base = {
        id: question.id,
        type: question.type,
        text: question.text,
        answered: answered.get(question.id) ?? 0,
      };
      if (CHOICE_TYPES.has(question.type)) {
        return { ...base, counts: choiceCounts(question, rows.choices) };
      }
      if (question.type === QuestionType.RATING) {
        const rating = rows.ratings.find((r) => r.questionId === question.id);
        return {
          ...base,
          average: rating ? round2(rating.average) : 0,
          totalRatings: rating?.total ?? 0,
        };
      }
      return {
        ...base,
        textAnswers: rows.texts
          .filter((t) => t.questionId === question.id && t.value.trim() !== '')
          .map((t) => t.value),
      };
    });

  return {
    surveyId: survey.id,
    title: survey.title,
    totalResponses: rows.totalResponses,
    questions,
  };
}
