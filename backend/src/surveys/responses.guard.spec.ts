import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from '../testing/fake-db';
import { QuestionType } from './question.entity';
import {
  DUPLICATE_SUBMISSION,
  ResponsesService,
  fingerprintFor,
} from './responses.service';
import { SurveysService } from './surveys.service';

const TOKEN_A = '3f2b8c1e-9d4a-4b6f-8e2a-1c5d7f9a0b3e';
const TOKEN_B = '8a1d2c3b-4e5f-4a6b-9c7d-0e1f2a3b4c5d';

// TC-Resp-02 / AC-011: a second submission to a single-response survey is rejected.
describe('ResponsesService duplicate submissions (SMS-27)', () => {
  let db: FakeDb;
  let surveys: SurveysService;
  let responses: ResponsesService;
  let surveyId: number;
  let answers: { answers: Record<number, string> };

  async function publishedSurvey(allowMultipleResponses?: boolean) {
    const s = await surveys.create({
      title: 'Once only',
      allowMultipleResponses,
      questions: [
        {
          text: 'Pick',
          type: QuestionType.SINGLE,
          options: ['A', 'B'],
          mandatory: true,
        },
      ],
    });
    await surveys.publish(s.id);
    return s;
  }

  beforeEach(async () => {
    db = new FakeDb();
    surveys = new SurveysService(db.surveys as any, db.dataSource as any);
    responses = new ResponsesService(db.surveys as any, db.dataSource as any);
    const s = await publishedSurvey();
    surveyId = s.id;
    answers = { answers: { [s.questions[0].id]: 'A' } };
  });

  it('makes surveys single-response by default', () => {
    expect(db.surveys.rows[0].allowMultipleResponses).toBe(false);
  });

  it("rejects a logged-in respondent's second submission (409)", async () => {
    await responses.submit(surveyId, answers, 5);
    await expect(responses.submit(surveyId, answers, 5)).rejects.toThrow(
      DUPLICATE_SUBMISSION,
    );
    expect(db.responses.rows).toHaveLength(1);
    expect(db.guards.rows).toHaveLength(1);
  });

  it("rejects an anonymous browser's second submission (409)", async () => {
    await responses.submit(surveyId, answers, null, TOKEN_A);
    await expect(
      responses.submit(surveyId, answers, null, TOKEN_A),
    ).rejects.toThrow(ConflictException);
    expect(db.responses.rows).toHaveLength(1);
  });

  it('refuses the duplicate even when the second attempt has invalid answers', async () => {
    await responses.submit(surveyId, answers, 5);
    await expect(
      responses.submit(surveyId, { answers: {} }, 5),
    ).rejects.toThrow(DUPLICATE_SUBMISSION);
  });

  it('lets different people each submit once', async () => {
    await responses.submit(surveyId, answers, 5);
    await responses.submit(surveyId, answers, 6);
    await responses.submit(surveyId, answers, null, TOKEN_A);
    await responses.submit(surveyId, answers, null, TOKEN_B);
    expect(db.responses.rows).toHaveLength(4);
    expect(db.guards.rows).toHaveLength(4);
  });

  it('tracks each survey separately', async () => {
    const other = await publishedSurvey();
    await responses.submit(surveyId, answers, 5);
    await expect(
      responses.submit(
        other.id,
        { answers: { [other.questions[0].id]: 'B' } },
        5,
      ),
    ).resolves.toMatchObject({ id: expect.any(Number) });
  });

  it('stores only a hash, never the user id or token', async () => {
    await responses.submit(surveyId, answers, 5);
    await responses.submit(surveyId, answers, null, TOKEN_A);
    for (const guard of db.guards.rows) {
      expect(guard.fingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(guard.fingerprint).not.toContain(TOKEN_A);
    }
    expect(fingerprintFor({ userId: 5, browserToken: null })).not.toBe(
      fingerprintFor({ userId: null, browserToken: '5' }),
    );
  });

  it('allows repeats when the survey allows multiple responses', async () => {
    const open = await publishedSurvey(true);
    const a = { answers: { [open.questions[0].id]: 'A' } };
    await responses.submit(open.id, a, 5);
    await responses.submit(open.id, a, 5);
    expect(db.guards.rows).toHaveLength(0);
  });

  it('cannot track a request with neither a user nor a browser token', async () => {
    expect(fingerprintFor({ userId: null, browserToken: null })).toBeNull();
    await responses.submit(surveyId, answers);
    await responses.submit(surveyId, answers);
    expect(db.guards.rows).toHaveLength(0);
  });

  it('turns a racing duplicate (unique constraint) into 409 and rethrows other errors', async () => {
    const original = db.dataSource.transaction;
    let calls = 0;
    db.dataSource.transaction = vi.fn(async (cb: any) => {
      calls += 1;
      // 1st call: the "already submitted?" lookup; 2nd: the insert that loses the race.
      if (calls === 2) throw Object.assign(new Error('dup'), { code: '23505' });
      return original(cb);
    }) as any;
    await expect(responses.submit(surveyId, answers, 9)).rejects.toThrow(
      DUPLICATE_SUBMISSION,
    );

    calls = 0;
    db.dataSource.transaction = vi.fn(async (cb: any) => {
      calls += 1;
      if (calls === 2) throw new Error('db down');
      return original(cb);
    }) as any;
    await expect(responses.submit(surveyId, answers, 10)).rejects.toThrow(
      'db down',
    );
  });
});

describe('allowMultipleResponses on update', () => {
  it('only changes when the client sends it', async () => {
    const db = new FakeDb();
    const surveys = new SurveysService(db.surveys as any, db.dataSource as any);
    const s = await surveys.create({
      title: 'T',
      allowMultipleResponses: true,
    });
    await surveys.update(s.id, { title: 'T2' });
    expect(db.surveys.rows[0].allowMultipleResponses).toBe(true);
    await surveys.update(s.id, { title: 'T3', allowMultipleResponses: false });
    expect(db.surveys.rows[0].allowMultipleResponses).toBe(false);
  });
});
