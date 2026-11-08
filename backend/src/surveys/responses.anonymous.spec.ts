/**
 * TC-Resp-03 (SVY-F-012 / AC-012, Jira SMS-28): anonymous responses store and
 * export no user identifier or email.
 */
import { getMetadataArgsStorage } from 'typeorm';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeDb } from '../testing/fake-db';
import { QuestionType } from './question.entity';
import { RESPONSE_FIELDS, toAnonymousResponse } from './response-privacy';
import { SurveyResponse } from './response.entity';
import { ResponsesService } from './responses.service';
import { SurveysService } from './surveys.service';

const IDENTITY_FIELDS = [
  'userId', 'user', 'respondentId', 'email', 'name', 'ip', 'ipAddress', 'userAgent', 'sessionId', 'token',
];

describe('anonymous responses (TC-Resp-03)', () => {
  let db: FakeDb;
  let surveys: SurveysService;
  let responses: ResponsesService;
  let surveyId: number;
  let questionId: number;

  beforeEach(async () => {
    db = new FakeDb();
    surveys = new SurveysService(db.surveys as any, db.dataSource as any);
    responses = new ResponsesService(db.surveys as any, db.dataSource as any);
    const s = await surveys.create({
      title: 'Anonymous',
      questions: [{ text: 'Comment', type: QuestionType.TEXT }],
    });
    surveyId = s.id;
    questionId = s.questions[0].id;
    await surveys.publish(surveyId);
  });

  it('stores only the whitelisted fields', async () => {
  await responses.submit(surveyId, {
    answers: { [questionId]: 'hello' },
  });

  const stored = db.responses.rows[0];

  expect(
    Object.keys(stored).every((key) =>
      (RESPONSE_FIELDS as readonly string[]).includes(key),
    ),
  ).toBe(true);

  expect(stored).toMatchObject({ surveyId });

  const storedAnswer = db.answers.rows.find(
    (answer) => answer.responseId === stored.id,
  );

  expect(storedAnswer).toMatchObject({
    questionId,
    value: 'hello',
  });

  for (const field of IDENTITY_FIELDS) {
    expect(field in stored).toBe(false);
  }
});

  it('ignores identity fields smuggled into the request body', async () => {
    const hostile = {
      answers: { [questionId]: 'hello' },
      email: 'person@example.com',
      userId: 42,
      ip: '10.0.0.1',
    } as any;
    await responses.submit(surveyId, hostile);

    const stored = db.responses.rows[0];
    for (const field of IDENTITY_FIELDS) {
      expect(field in stored).toBe(false);
    }
    expect(JSON.stringify(stored)).not.toContain('person@example.com');
  });

  it('returns only the response id and time to the respondent', async () => {
    const result = await responses.submit(surveyId, { answers: {} });
    expect(Object.keys(result).sort()).toEqual(['id', 'submittedAt']);
  });

  it('keeps the entity free of identity columns', () => {
  const storage = getMetadataArgsStorage();

  const columns = storage.columns
    .filter((c) => c.target === SurveyResponse)
    .map((c) => c.propertyName)
    .sort();

  expect(columns).toEqual(['id', 'submittedAt', 'surveyId']);

  const relations = storage.relations
    .filter((r) => r.target === SurveyResponse)
    .map((r) => r.propertyName)
    .sort();

  expect(relations).toEqual(['answers', 'survey']);
});

  describe('toAnonymousResponse (used by exports)', () => {
    it('keeps the whitelisted fields', () => {
      const row = { id: 1, surveyId: 2, answers: { 3: 'x' }, submittedAt: new Date(0) };
      expect(toAnonymousResponse(row)).toEqual(row);
    });

    it('drops anything else, whatever it is called', () => {
      const out = toAnonymousResponse({
        id: 1, surveyId: 2, answers: {}, submittedAt: null,
        email: 'a@b.c', userId: 9, ip: '1.2.3.4', survey: { title: 'T' },
      });
      expect(Object.keys(out).sort()).toEqual([...RESPONSE_FIELDS].sort());
      expect(JSON.stringify(out)).not.toContain('a@b.c');
    });
  });
});
