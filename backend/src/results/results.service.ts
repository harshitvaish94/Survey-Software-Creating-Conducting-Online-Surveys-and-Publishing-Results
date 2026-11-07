import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { AuthUser } from '../auth/auth.constants';
import { SurveysService } from '../surveys/surveys.service';
import { buildResults } from './build-results';
import type { AggregateRows, SurveyResults } from './build-results';

/** Only answers that belong to responses of this survey ($1). */
const SCOPE = `
  FROM answers a
  JOIN responses r ON r.id = a."responseId"
  JOIN questions q ON q.id = a."questionId"
  WHERE r."surveyId" = $1`;

const SQL = {
  total: `SELECT COUNT(*)::int AS total FROM responses WHERE "surveyId" = $1`,
  answered: `SELECT a."questionId" AS "questionId", COUNT(DISTINCT a."responseId")::int AS count
    ${SCOPE} GROUP BY a."questionId"`,
  // Single / dropdown answers are a JSON string, multiple-choice a JSON array: count each option.
  choices: `SELECT a."questionId" AS "questionId", opt.value AS option, COUNT(*)::int AS count
    FROM answers a
    JOIN responses r ON r.id = a."responseId"
    JOIN questions q ON q.id = a."questionId"
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(a.value) = 'array' THEN a.value ELSE jsonb_build_array(a.value) END
    ) AS opt(value)
    WHERE r."surveyId" = $1 AND q.type IN ('single', 'multiple', 'dropdown')
    GROUP BY a."questionId", opt.value`,
  ratings: `SELECT a."questionId" AS "questionId",
      AVG((a.value #>> '{}')::numeric)::float8 AS average, COUNT(*)::int AS total
    ${SCOPE} AND q.type = 'rating' GROUP BY a."questionId"`,
  texts: `SELECT a."questionId" AS "questionId", a.value #>> '{}' AS value
    ${SCOPE} AND q.type = 'text' ORDER BY r."submittedAt", a.id`,
};

@Injectable()
export class ResultsService {
  constructor(
    private readonly surveys: SurveysService,
    private readonly dataSource: DataSource,
  ) {}

  /** SMS-29: consolidated results per question. Owner or administrator only (SMS-15). */
  async getResults(surveyId: number, user: AuthUser): Promise<SurveyResults> {
    await this.surveys.assertOwner(surveyId, user);
    const survey = await this.surveys.findOne(surveyId);
    return buildResults(survey, await this.aggregate(surveyId));
  }

  /** Counts, percentages' inputs and averages are computed in Postgres. */
  async aggregate(surveyId: number): Promise<AggregateRows> {
    const run = <T>(sql: string) => this.dataSource.query<T[]>(sql, [surveyId]);
    const [total, answered, choices, ratings, texts] = await Promise.all([
      run<{ total: number }>(SQL.total),
      run<AggregateRows['answered'][number]>(SQL.answered),
      run<AggregateRows['choices'][number]>(SQL.choices),
      run<AggregateRows['ratings'][number]>(SQL.ratings),
      run<AggregateRows['texts'][number]>(SQL.texts),
    ]);
    return {
      totalResponses: Number(total[0]?.total ?? 0),
      answered: answered.map((r) => ({
        questionId: Number(r.questionId),
        count: Number(r.count),
      })),
      choices: choices.map((r) => ({
        questionId: Number(r.questionId),
        option: r.option,
        count: Number(r.count),
      })),
      ratings: ratings.map((r) => ({
        questionId: Number(r.questionId),
        average: Number(r.average),
        total: Number(r.total),
      })),
      texts: texts.map((r) => ({
        questionId: Number(r.questionId),
        value: r.value,
      })),
    };
  }
}
