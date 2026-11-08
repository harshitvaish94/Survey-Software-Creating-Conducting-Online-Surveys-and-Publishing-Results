/**
 * TC-Srv-05 (SVY-F-008 / AC-008, Jira SMS-23): Draft -> Published -> Closed,
 * automatic close at the close date, structure locked once published.
 */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from '../testing/fake-db';
import { QuestionType } from './question.entity';
import { ResponsesService } from './responses.service';
import { SurveyStatus } from './survey.entity';
import { SurveysService } from './surveys.service';

const dto = (extra: Record<string, unknown> = {}) => ({
  title: 'Lifecycle',
  questions: [{ text: 'Comment', type: QuestionType.TEXT }],
  ...extra,
});

describe('survey lifecycle (TC-Srv-05)', () => {
  let db: FakeDb;
  let surveys: SurveysService;
  let responses: ResponsesService;

  const setToday = (iso: string) => vi.setSystemTime(new Date(`${iso}T12:00:00Z`));

  beforeEach(() => {
    delete process.env.SURVEY_TIMEZONE;
    vi.useFakeTimers({ toFake: ['Date'] });
    setToday('2026-11-05');
    db = new FakeDb();
    surveys = new SurveysService(db.surveys as any, db.dataSource as any);
    responses = new ResponsesService(db.surveys as any, db.dataSource as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('close()', () => {
    it('moves Published to Closed', async () => {
      const s = await surveys.create(dto());
      await surveys.publish(s.id);
      const closed = await surveys.close(s.id);
      expect(closed.status).toBe(SurveyStatus.CLOSED);
      expect(db.surveys.rows[0].status).toBe(SurveyStatus.CLOSED);
    });

    it('refuses to close a draft (409)', async () => {
      const s = await surveys.create(dto());
      await expect(surveys.close(s.id)).rejects.toThrow(ConflictException);
    });

    it('refuses to close an already closed survey (409)', async () => {
      const s = await surveys.create(dto());
      await surveys.publish(s.id);
      await surveys.close(s.id);
      await expect(surveys.close(s.id)).rejects.toThrow(ConflictException);
    });

    it('throws 404 for a missing survey', async () => {
      await expect(surveys.close(404)).rejects.toThrow(NotFoundException);
    });
  });

  describe('structure lock', () => {
    it('keeps the structure locked after a survey is closed (409)', async () => {
      const s = await surveys.create(dto());
      const questionId = s.questions[0].id;
      await surveys.publish(s.id);
      await surveys.close(s.id);

      await expect(surveys.update(s.id, dto() as any)).rejects.toThrow(ConflictException);
      await expect(surveys.removeQuestion(s.id, questionId)).rejects.toThrow(ConflictException);
      await expect(surveys.reorderQuestions(s.id, [questionId])).rejects.toThrow(ConflictException);
    });
  });

  describe('publish() date check', () => {
    it('refuses a close date that has already passed (400)', async () => {
      const s = await surveys.create(dto({ closeDate: '2026-11-04' }));
      await expect(surveys.publish(s.id)).rejects.toThrow(BadRequestException);
      expect(db.surveys.rows[0].status).toBe(SurveyStatus.DRAFT);
    });

    it('accepts a close date of today', async () => {
      const s = await surveys.create(dto({ closeDate: '2026-11-05' }));
      const published = await surveys.publish(s.id);
      expect(published.status).toBe(SurveyStatus.PUBLISHED);
    });
  });

  describe('automatic close', () => {
    it('closes an expired published survey when it is read', async () => {
      const s = await surveys.create(dto({ closeDate: '2026-11-10' }));
      await surveys.publish(s.id);
      setToday('2026-11-11');

      const read = await surveys.findOne(s.id);
      expect(read.status).toBe(SurveyStatus.CLOSED);
      expect(db.surveys.rows[0].status).toBe(SurveyStatus.CLOSED);
    });

    it('closes expired surveys when the list is read, leaving others alone', async () => {
      const expired = await surveys.create(dto({ closeDate: '2026-11-10' }));
      const open = await surveys.create(dto({ closeDate: '2026-12-31' }));
      const draft = await surveys.create(dto({ closeDate: '2026-11-10' }));
      await surveys.publish(expired.id);
      await surveys.publish(open.id);
      setToday('2026-11-11');

      const list = await surveys.findAll();
      const byId = new Map(list.map((x) => [x.id, x.status]));
      expect(byId.get(expired.id)).toBe(SurveyStatus.CLOSED);
      expect(byId.get(open.id)).toBe(SurveyStatus.PUBLISHED);
      expect(byId.get(draft.id)).toBe(SurveyStatus.DRAFT);
    });

    it('keeps a survey open through the whole close date (inclusive)', async () => {
      const s = await surveys.create(dto({ closeDate: '2026-11-10' }));
      await surveys.publish(s.id);
      setToday('2026-11-10');
      expect((await surveys.findOne(s.id)).status).toBe(SurveyStatus.PUBLISHED);
    });
  });

  describe('accepting responses', () => {
    it('accepts a response while Published and inside the window', async () => {
      const s = await surveys.create(dto({ openDate: '2026-11-05', closeDate: '2026-11-05' }));
      await surveys.publish(s.id);
      const result = await responses.submit(s.id, { answers: {} });
      expect(result.id).toBeDefined();
    });

    it('rejects a response to a survey closed manually (409)', async () => {
      const s = await surveys.create(dto());
      await surveys.publish(s.id);
      await surveys.close(s.id);
      await expect(responses.submit(s.id, { answers: {} })).rejects.toThrow(ConflictException);
      expect(db.responses.rows).toHaveLength(0);
    });

    it('rejects a response after the close date and persists Closed (409)', async () => {
      const s = await surveys.create(dto({ closeDate: '2026-11-10' }));
      await surveys.publish(s.id);
      setToday('2026-11-11');

      await expect(responses.submit(s.id, { answers: {} })).rejects.toThrow(ConflictException);
      expect(db.surveys.rows[0].status).toBe(SurveyStatus.CLOSED);
      expect(db.responses.rows).toHaveLength(0);
    });

    it('rejects a response before the open date (409)', async () => {
      const s = await surveys.create(dto({ openDate: '2026-11-06' }));
      await surveys.publish(s.id);
      await expect(responses.submit(s.id, { answers: {} })).rejects.toThrow(
        'This survey is not open yet.',
      );
    });

    it('accepts a response once the open date arrives', async () => {
      const s = await surveys.create(dto({ openDate: '2026-11-06' }));
      await surveys.publish(s.id);
      setToday('2026-11-06');
      await expect(responses.submit(s.id, { answers: {} })).resolves.toMatchObject({ id: expect.any(Number) });
    });
  });
});
