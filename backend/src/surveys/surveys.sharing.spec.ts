/**
 * TC-Pub-01 (SVY-F-009 / AC-009, Jira SMS-24): a unique, unguessable shareable
 * link and QR code per published survey. Decoding the QR image is a manual
 * check (phone scan); here we verify the data the QR is generated from.
 */
import { ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeDb } from '../testing/fake-db';
import { QuestionType } from './question.entity';
import { buildPublicLink, generateSlug, qrCodeDataUrl } from './sharing';
import { SurveyStatus } from './survey.entity';
import { SurveysService } from './surveys.service';

const input = (title = 'Share me') => ({
  title,
  questions: [{ text: 'Comment', type: QuestionType.TEXT }],
});

describe('sharing helpers', () => {
  const original = process.env.PUBLIC_BASE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = original;
  });

  it('generates 12-character URL-safe slugs that do not repeat', () => {
    const slugs = new Set(Array.from({ length: 500 }, () => generateSlug()));
    expect(slugs.size).toBe(500);
    for (const slug of slugs) {
      expect(slug).toHaveLength(12);
      expect(/^[A-Za-z0-9_-]{12}$/.test(slug)).toBe(true);
    }
  });

  it('builds the link from PUBLIC_BASE_URL, ignoring trailing slashes', () => {
    process.env.PUBLIC_BASE_URL = 'https://survey.example.com//';
    expect(buildPublicLink('abc')).toBe('https://survey.example.com/s/abc');
  });

  it('falls back to the local dev URL when PUBLIC_BASE_URL is not set', () => {
    delete process.env.PUBLIC_BASE_URL;
    expect(buildPublicLink('abc')).toBe('http://localhost:5173/s/abc');
  });

  it('returns a PNG data URL for the QR code', async () => {
    const url = await qrCodeDataUrl('http://localhost:5173/s/abc');
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
  });
});

describe('survey sharing (TC-Pub-01)', () => {
  let db: FakeDb;
  let surveys: SurveysService;

  beforeEach(() => {
    process.env.PUBLIC_BASE_URL = 'http://localhost:5173';
    db = new FakeDb();
    surveys = new SurveysService(db.surveys as any, db.dataSource as any);
  });

  it('gives a draft survey no slug', async () => {
    const draft = await surveys.create(input());
    expect(draft.slug ?? null).toBeNull();
  });

  it('creates slug, link and QR code when a survey is published', async () => {
    const s = await surveys.create(input());
    const published = await surveys.publish(s.id);

    expect(published.status).toBe(SurveyStatus.PUBLISHED);
    expect(published.slug).toHaveLength(12);
    expect(published.link).toBe(`http://localhost:5173/s/${published.slug}`);
    expect(published.qrCodeUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(db.surveys.rows[0].slug).toBe(published.slug);
  });

  it('gives every published survey a different slug', async () => {
    const a = await surveys.publish((await surveys.create(input('A'))).id);
    const b = await surveys.publish((await surveys.create(input('B'))).id);
    expect(a.slug).not.toBe(b.slug);
  });

  it('keeps the slug when publish is refused a second time (409)', async () => {
    const s = await surveys.create(input());
    const first = await surveys.publish(s.id);
    await expect(surveys.publish(s.id)).rejects.toThrow(ConflictException);
    expect(db.surveys.rows[0].slug).toBe(first.slug);
  });

  it('fails cleanly if a unique slug cannot be found', async () => {
    const s = await surveys.create(input());
    const original = db.surveys.findOne.bind(db.surveys);
    db.surveys.findOne = (async (opts: any) =>
      opts?.where?.slug ? { id: 999 } : original(opts)) as any;
    await expect(surveys.publish(s.id)).rejects.toThrow(InternalServerErrorException);
    expect(db.surveys.rows[0].status).toBe(SurveyStatus.DRAFT);
  });

  describe('findBySlug (the link opens the correct survey)', () => {
    it('returns the survey that owns the slug', async () => {
      const a = await surveys.publish((await surveys.create(input('A'))).id);
      const b = await surveys.publish((await surveys.create(input('B'))).id);
      expect((await surveys.findBySlug(a.slug as string)).title).toBe('A');
      expect((await surveys.findBySlug(b.slug as string)).title).toBe('B');
    });

    it('returns 404 for an unknown slug', async () => {
      await expect(surveys.findBySlug('nope')).rejects.toThrow(NotFoundException);
    });

    it('never exposes a draft, even one that carries a slug', async () => {
      await db.seedSurvey({ status: SurveyStatus.DRAFT, slug: 'leaked-slug' });
      await expect(surveys.findBySlug('leaked-slug')).rejects.toThrow(NotFoundException);
    });

    it('still resolves a closed survey so respondents see it is closed', async () => {
      const s = await surveys.publish((await surveys.create(input())).id);
      await surveys.close(s.id);
      expect((await surveys.findBySlug(s.slug as string)).status).toBe(SurveyStatus.CLOSED);
    });
  });

  describe('getShare', () => {
    it('refuses a draft survey (409)', async () => {
      const s = await surveys.create(input());
      await expect(surveys.getShare(s.id)).rejects.toThrow(ConflictException);
    });

    it('returns the same link as publish did', async () => {
      const published = await surveys.publish((await surveys.create(input())).id);
      const share = await surveys.getShare(published.id);
      expect(share.slug).toBe(published.slug);
      expect(share.link).toBe(published.link);
    });

    it('gives a survey published before slugs existed a slug, once', async () => {
      const legacy = await db.seedSurvey({ status: SurveyStatus.PUBLISHED });
      const first = await surveys.getShare(legacy.id);
      const second = await surveys.getShare(legacy.id);
      expect(first.slug).toHaveLength(12);
      expect(second.slug).toBe(first.slug);
      expect(db.surveys.rows[0].slug).toBe(first.slug);
    });

    it('returns 404 for a missing survey', async () => {
      await expect(surveys.getShare(404)).rejects.toThrow(NotFoundException);
    });
  });
});
