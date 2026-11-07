import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from '../testing/fake-db';
import {
  isExpired,
  isNotYetOpen,
  persistClosed,
  todayInSurveyTimezone,
} from './survey-lifecycle';
import { SurveyStatus } from './survey.entity';

describe('survey-lifecycle helpers', () => {
  const original = process.env.SURVEY_TIMEZONE;
  afterEach(() => {
    if (original === undefined) delete process.env.SURVEY_TIMEZONE;
    else process.env.SURVEY_TIMEZONE = original;
  });

  describe('todayInSurveyTimezone', () => {
    const lateUtc = new Date('2026-11-05T23:30:00Z');

    it('defaults to the UTC date', () => {
      delete process.env.SURVEY_TIMEZONE;
      expect(todayInSurveyTimezone(lateUtc)).toBe('2026-11-05');
    });

    it('uses SURVEY_TIMEZONE when it is set', () => {
      process.env.SURVEY_TIMEZONE = 'Asia/Kolkata';
      expect(todayInSurveyTimezone(lateUtc)).toBe('2026-11-06');
    });

    it('falls back to UTC for an invalid time zone', () => {
      process.env.SURVEY_TIMEZONE = 'Not/AZone';
      expect(todayInSurveyTimezone(lateUtc)).toBe('2026-11-05');
    });
  });

  describe('isExpired', () => {
    const published = SurveyStatus.PUBLISHED;
    it('is true for a published survey after its close date', () => {
      expect(isExpired({ status: published, closeDate: '2026-11-04' }, '2026-11-05')).toBe(true);
    });
    it('is false on the close date itself (inclusive)', () => {
      expect(isExpired({ status: published, closeDate: '2026-11-05' }, '2026-11-05')).toBe(false);
    });
    it('is false without a close date', () => {
      expect(isExpired({ status: published, closeDate: null }, '2026-11-05')).toBe(false);
    });
    it('is false for Draft and Closed surveys', () => {
      expect(isExpired({ status: SurveyStatus.DRAFT, closeDate: '2020-01-01' }, '2026-11-05')).toBe(false);
      expect(isExpired({ status: SurveyStatus.CLOSED, closeDate: '2020-01-01' }, '2026-11-05')).toBe(false);
    });
    it('uses the current date when none is given', () => {
      expect(isExpired({ status: published, closeDate: '2000-01-01' })).toBe(true);
    });
  });

  describe('isNotYetOpen', () => {
    it('is true before the open date', () => {
      expect(isNotYetOpen({ openDate: '2026-11-06' }, '2026-11-05')).toBe(true);
    });
    it('is false on the open date (inclusive) and without one', () => {
      expect(isNotYetOpen({ openDate: '2026-11-05' }, '2026-11-05')).toBe(false);
      expect(isNotYetOpen({ openDate: null }, '2026-11-05')).toBe(false);
    });
    it('uses the current date when none is given', () => {
      expect(isNotYetOpen({ openDate: '2999-01-01' })).toBe(true);
    });
  });

  describe('persistClosed', () => {
    let db: FakeDb;
    beforeEach(() => {
      db = new FakeDb();
    });

    it('closes a published survey', async () => {
      const row = await db.seedSurvey({ status: SurveyStatus.PUBLISHED });
      await persistClosed(db.surveys as any, row.id);
      expect(db.surveys.rows[0].status).toBe(SurveyStatus.CLOSED);
    });

    it('leaves a draft untouched', async () => {
      const row = await db.seedSurvey({ status: SurveyStatus.DRAFT });
      await persistClosed(db.surveys as any, row.id);
      expect(db.surveys.rows[0].status).toBe(SurveyStatus.DRAFT);
    });

    it('ignores a missing survey', async () => {
      await expect(persistClosed(db.surveys as any, 99)).resolves.toBeUndefined();
    });
  });
});
