import { describe, expect, it } from 'vitest';
import { expectedResults, referenceSurvey } from '../testing/results-reference';
import { QuestionType } from '../surveys/question.entity';
import { buildResults } from './build-results';
import type { AggregateRows } from './build-results';

const ids = [11, 12, 13, 14, 15];

// The survey as the database returns it, deliberately out of position order.
const survey = {
  id: 7,
  title: referenceSurvey.title,
  questions: referenceSurvey.questions
    .map((q, i) => ({
      options: null,
      ratingMin: null,
      ratingMax: null,
      ...q,
      id: ids[i],
      position: i,
    }))
    .reverse(),
} as any;

// What the SQL aggregation returns for the reference responses, counted by hand.
const referenceRows: AggregateRows = {
  totalResponses: 5,
  answered: [
    { questionId: 11, count: 5 },
    { questionId: 12, count: 5 },
    { questionId: 13, count: 4 },
    { questionId: 14, count: 3 },
    { questionId: 15, count: 2 },
  ],
  choices: [
    { questionId: 12, option: 'Lab sessions', count: 3 },
    { questionId: 12, option: 'Group project', count: 1 },
    { questionId: 12, option: 'Lectures', count: 1 },
    { questionId: 13, option: 'Testing', count: 3 },
    { questionId: 13, option: 'DevOps', count: 2 },
    { questionId: 13, option: 'Design patterns', count: 1 },
    { questionId: 13, option: 'Agile', count: 1 },
  ],
  ratings: [
    { questionId: 11, average: 4.2, total: 5 },
    { questionId: 14, average: 3, total: 3 },
  ],
  texts: [
    { questionId: 15, value: 'More labs' },
    { questionId: 15, value: 'Great course' },
  ],
};

const empty: AggregateRows = {
  totalResponses: 0,
  answered: [],
  choices: [],
  ratings: [],
  texts: [],
};

// TC-Res-01: results match the hand-calculated reference data set.
describe('buildResults (SMS-29)', () => {
  it('matches the hand-calculated reference results', () => {
    expect(buildResults(survey, referenceRows)).toEqual(
      expectedResults(7, ids),
    );
  });

  it("lists every option in the creator's order, including options nobody picked", () => {
    const q = buildResults(survey, referenceRows).questions[1];
    expect(q.counts?.map((c) => c.label)).toEqual([
      'Lectures',
      'Lab sessions',
      'Group project',
      'Assignments',
    ]);
  });

  it('keeps percentages consistent with the counts (chart and table agree)', () => {
    for (const q of buildResults(survey, referenceRows).questions) {
      if (!q.counts) continue;
      const total = q.counts.reduce((s, c) => s + c.count, 0);
      for (const c of q.counts)
        expect(c.percent).toBeCloseTo((c.count / total) * 100, 2);
    }
  });

  it('returns zeros, not errors, when there are no responses yet', () => {
    const result = buildResults(survey, empty);
    expect(result.totalResponses).toBe(0);
    expect(result.questions[0]).toMatchObject({
      answered: 0,
      average: 0,
      totalRatings: 0,
    });
    expect(
      result.questions[1].counts?.every(
        (c) => c.count === 0 && c.percent === 0,
      ),
    ).toBe(true);
    expect(result.questions[4].textAnswers).toEqual([]);
  });

  it('keeps answers for an option that is no longer defined, after the defined ones', () => {
    const rows = {
      ...empty,
      choices: [{ questionId: 12, option: 'Old option', count: 2 }],
    };
    expect(buildResults(survey, rows).questions[1].counts?.at(-1)).toEqual({
      label: 'Old option',
      count: 2,
      percent: 100,
    });
  });

  it('drops blank text answers and rounds averages to two decimals', () => {
    const rows = {
      ...empty,
      ratings: [{ questionId: 11, average: 10 / 3, total: 3 }],
      texts: [
        { questionId: 15, value: '   ' },
        { questionId: 15, value: 'Useful' },
      ],
    };
    const result = buildResults(survey, rows);
    expect(result.questions[0].average).toBe(3.33);
    expect(result.questions[4].textAnswers).toEqual(['Useful']);
  });

  it('treats dropdown questions like single choice', () => {
    const s = {
      id: 1,
      title: 'D',
      questions: [
        {
          id: 1,
          position: 0,
          text: 'Pick',
          type: QuestionType.DROPDOWN,
          options: ['A', 'B'],
        },
      ],
    } as any;
    const rows = {
      ...empty,
      choices: [{ questionId: 1, option: 'B', count: 1 }],
    };
    expect(buildResults(s, rows).questions[0].counts).toEqual([
      { label: 'A', count: 0, percent: 0 },
      { label: 'B', count: 1, percent: 100 },
    ]);
  });

  it('handles a choice question with no options defined', () => {
    const s = {
      id: 1,
      title: 'D',
      questions: [
        {
          id: 1,
          position: 0,
          text: 'Pick',
          type: QuestionType.SINGLE,
          options: null,
        },
      ],
    } as any;
    expect(buildResults(s, empty).questions[0].counts).toEqual([]);
  });
});
