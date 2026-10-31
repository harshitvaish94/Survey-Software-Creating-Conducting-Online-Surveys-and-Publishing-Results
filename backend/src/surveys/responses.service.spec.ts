import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeDb } from '../testing/fake-db';
import { QuestionType } from './question.entity';
import { ResponsesService } from './responses.service';
import { SurveysService } from './surveys.service';

describe('ResponsesService', () => {
  let db: FakeDb;
  let surveys: SurveysService;
  let responses: ResponsesService;
  let surveyId: number;
  let ids: number[];

  beforeEach(async () => {
    db = new FakeDb();
    surveys = new SurveysService(db.surveys as any, db.dataSource as any);
    responses = new ResponsesService(db.surveys as any, db.responses as any);
    const s = await surveys.create({
      title: 'S',
      questions: [
        { text: 'Pick', type: QuestionType.SINGLE, options: ['A', 'B'], mandatory: true },
        { text: 'Comment', type: QuestionType.TEXT },
        { text: 'Rate', type: QuestionType.RATING, mandatory: true },
      ],
    });
    surveyId = s.id;
    ids = s.questions.map((q) => q.id);
  });

  it('refuses answers while the survey is still a draft (409)', async () => {
    await expect(responses.submit(surveyId, { answers: {} })).rejects.toThrow(ConflictException);
  });

  it('throws 404 for a missing survey', async () => {
    await expect(responses.submit(404, { answers: {} })).rejects.toThrow(NotFoundException);
  });

  describe('published survey', () => {
    beforeEach(async () => {
      await surveys.publish(surveyId);
    });

    it('blocks submission when a mandatory question is unanswered', async () => {
      await expect(
        responses.submit(surveyId, { answers: { [ids[0]]: 'A' } }),
      ).rejects.toThrow(BadRequestException);
      expect(db.responses.rows).toHaveLength(0);
    });

    it('lists every missing mandatory answer in the error', async () => {
      await expect(responses.submit(surveyId, { answers: {} })).rejects.toMatchObject({
        response: { message: ['"Pick" is required.', '"Rate" is required.'] },
      });
    });

    it('accepts a submission that leaves the optional question empty', async () => {
      const result = await responses.submit(surveyId, {
        answers: { [ids[0]]: 'B', [ids[2]]: 4 },
      });
      expect(result.id).toBeDefined();
      expect(db.responses.rows[0]).toMatchObject({
        surveyId,
        answers: { [ids[0]]: 'B', [ids[2]]: 4 },
      });
    });

    it('stores the optional answer when it is given (trimmed)', async () => {
      await responses.submit(surveyId, {
        answers: { [ids[0]]: 'A', [ids[1]]: ' nice ', [ids[2]]: 5 },
      });
      expect(db.responses.rows[0].answers[ids[1]]).toBe('nice');
    });

    it('rejects an invalid rating', async () => {
      await expect(
        responses.submit(surveyId, { answers: { [ids[0]]: 'A', [ids[2]]: 9 } }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
