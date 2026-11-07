/**
 * TC-Res-01 reference data set. Five responses to a five-question survey, with
 * every expected value worked out by hand (see the comments next to each number).
 */
import { QuestionType } from '../surveys/question.entity';

export const referenceSurvey = {
  title: 'Course Feedback',
  questions: [
    {
      text: 'Overall rating',
      type: QuestionType.RATING,
      ratingMin: 1,
      ratingMax: 5,
      mandatory: true,
    },
    {
      text: 'Most useful part',
      type: QuestionType.SINGLE,
      options: ['Lectures', 'Lab sessions', 'Group project', 'Assignments'],
      mandatory: true,
    },
    {
      text: 'Topics to spend more time on',
      type: QuestionType.MULTIPLE,
      options: [
        'Requirements',
        'Design patterns',
        'Testing',
        'Agile',
        'DevOps',
      ],
      mandatory: false,
    },
    {
      text: 'Clarity of explanations',
      type: QuestionType.RATING,
      ratingMin: 1,
      ratingMax: 5,
      mandatory: false,
    },
    { text: 'One thing to change', type: QuestionType.TEXT, mandatory: false },
  ],
};

/** Answers by question index (0–4); a missing index means the question was skipped. */
export const referenceResponses: Record<number, string | string[] | number>[] =
  [
    { 0: 5, 1: 'Lab sessions', 2: ['Testing', 'DevOps'], 3: 4, 4: 'More labs' },
    { 0: 4, 1: 'Lab sessions', 2: ['Testing'], 3: 2 },
    { 0: 4, 1: 'Group project' },
    {
      0: 3,
      1: 'Lectures',
      2: ['Design patterns', 'Testing', 'Agile'],
      4: 'Great course',
    },
    { 0: 5, 1: 'Lab sessions', 2: ['DevOps'], 3: 3 },
  ];

/** Hand-calculated results; `ids` maps question index to the real question id. */
export function expectedResults(surveyId: number, ids: number[]) {
  return {
    surveyId,
    title: 'Course Feedback',
    totalResponses: 5,
    questions: [
      // (5 + 4 + 4 + 3 + 5) / 5 = 21 / 5 = 4.2
      {
        id: ids[0],
        type: 'rating',
        text: 'Overall rating',
        answered: 5,
        average: 4.2,
        totalRatings: 5,
      },
      {
        id: ids[1],
        type: 'single',
        text: 'Most useful part',
        answered: 5,
        // 1, 3, 1, 0 of 5 answers → 20 %, 60 %, 20 %, 0 %
        counts: [
          { label: 'Lectures', count: 1, percent: 20 },
          { label: 'Lab sessions', count: 3, percent: 60 },
          { label: 'Group project', count: 1, percent: 20 },
          { label: 'Assignments', count: 0, percent: 0 },
        ],
      },
      {
        id: ids[2],
        type: 'multiple',
        text: 'Topics to spend more time on',
        answered: 4,
        // 7 selections in total: 0/7, 1/7 = 14.29 %, 3/7 = 42.86 %, 1/7 = 14.29 %, 2/7 = 28.57 %
        counts: [
          { label: 'Requirements', count: 0, percent: 0 },
          { label: 'Design patterns', count: 1, percent: 14.29 },
          { label: 'Testing', count: 3, percent: 42.86 },
          { label: 'Agile', count: 1, percent: 14.29 },
          { label: 'DevOps', count: 2, percent: 28.57 },
        ],
      },
      // (4 + 2 + 3) / 3 = 3
      {
        id: ids[3],
        type: 'rating',
        text: 'Clarity of explanations',
        answered: 3,
        average: 3,
        totalRatings: 3,
      },
      {
        id: ids[4],
        type: 'text',
        text: 'One thing to change',
        answered: 2,
        textAnswers: ['More labs', 'Great course'],
      },
    ],
  };
}
