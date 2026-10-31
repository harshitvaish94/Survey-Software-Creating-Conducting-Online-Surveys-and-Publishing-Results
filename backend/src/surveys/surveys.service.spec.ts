import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeDb } from '../testing/fake-db';
import { QuestionInputDto } from './question.dto';
import { QuestionType } from './question.entity';
import { SurveysService } from './surveys.service';

const allFive: QuestionInputDto[] = [
  { text: 'Pick one', type: QuestionType.SINGLE, options: ['A', 'B'] },
  { text: 'Pick many', type: QuestionType.MULTIPLE, options: ['X', 'Y', 'Z'] },
  { text: 'Comments', type: QuestionType.TEXT },
  { text: 'Rate us', type: QuestionType.RATING, ratingMin: 1, ratingMax: 7 },
  { text: 'Country', type: QuestionType.DROPDOWN, options: ['IN', 'US'] },
];

describe('SurveysService', () => {
  let db: FakeDb;
  let service: SurveysService;

  beforeEach(() => {
    db = new FakeDb();
    service = new SurveysService(db.surveys as any, db.dataSource as any);
  });

  describe('create', () => {
    it('creates a draft survey with all five question types in order', async () => {
      const survey = await service.create({ title: ' Customer survey ', questions: allFive });
      expect(survey.title).toBe('Customer survey');
      expect(survey.status).toBe('Draft');
      expect(survey.questions.map((q) => q.type)).toEqual([
        'single', 'multiple', 'text', 'rating', 'dropdown',
      ]);
      expect(survey.questions.map((q) => q.position)).toEqual([0, 1, 2, 3, 4]);
      const rating = survey.questions[3];
      expect([rating.ratingMin, rating.ratingMax]).toEqual([1, 7]);
      expect(survey.questions[0].options).toEqual(['A', 'B']);
      expect(survey.questions[2].options).toBeNull();
    });

    it('still creates a survey without questions (SMS-16 behaviour)', async () => {
      const survey = await service.create({ title: 'Empty' });
      expect(survey.questions).toEqual([]);
    });

    it('rejects an invalid question and stores nothing', async () => {
      await expect(
        service.create({
          title: 'Bad',
          questions: [{ text: 'Pick', type: QuestionType.SINGLE, options: ['Only'] }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(db.surveys.rows).toHaveLength(0);
    });

    it('rejects a closing date before the opening date', async () => {
      await expect(
        service.create({ title: 'Dates', openDate: '2026-05-02', closeDate: '2026-05-01' }),
      ).rejects.toThrow('Closing date cannot be earlier');
    });
  });

  describe('read', () => {
    it('returns a survey with questions ordered by position', async () => {
      const created = await service.create({ title: 'S', questions: allFive });
      const loaded = await service.findOne(created.id);
      expect(loaded.questions.map((q) => q.text)).toEqual(allFive.map((q) => q.text));
    });

    it('throws 404 for a missing survey', async () => {
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('lists surveys newest first', async () => {
      await service.create({ title: 'First' });
      await service.create({ title: 'Second' });
      const list = await service.findAll();
      expect(list.map((s) => s.title)).toEqual(['Second', 'First']);
    });
  });

  describe('update (edit, reorder, delete)', () => {
    it('edits text, type and options of an existing question', async () => {
      const s = await service.create({ title: 'S', questions: allFive });
      const [first, ...rest] = s.questions;
      const updated = await service.update(s.id, {
        title: 'S',
        questions: [
          { id: first.id, text: 'Now a dropdown', type: QuestionType.DROPDOWN, options: ['P', 'Q'] },
          ...rest.map((q) => ({ id: q.id, text: q.text, type: q.type, options: q.options ?? undefined,
            ratingMin: q.ratingMin ?? undefined, ratingMax: q.ratingMax ?? undefined })),
        ],
      });
      expect(updated.questions[0]).toMatchObject({
        id: first.id, text: 'Now a dropdown', type: 'dropdown', options: ['P', 'Q'],
      });
      expect(updated.questions).toHaveLength(5);
    });

    it('reorders questions and keeps the order after reload', async () => {
      const s = await service.create({ title: 'S', questions: allFive });
      const reversed = [...s.questions].reverse().map((q) => ({
        id: q.id, text: q.text, type: q.type, options: q.options ?? undefined,
        ratingMin: q.ratingMin ?? undefined, ratingMax: q.ratingMax ?? undefined,
      }));
      await service.update(s.id, { title: 'S', questions: reversed });
      const reloaded = await service.findOne(s.id);
      expect(reloaded.questions.map((q) => q.text)).toEqual(
        [...allFive].reverse().map((q) => q.text),
      );
    });

    it('deletes questions that are missing from the payload', async () => {
      const s = await service.create({ title: 'S', questions: allFive });
      const keep = s.questions[0];
      const updated = await service.update(s.id, {
        title: 'S',
        questions: [{ id: keep.id, text: keep.text, type: keep.type, options: keep.options ?? undefined }],
      });
      expect(updated.questions).toHaveLength(1);
      expect(db.questions.rows).toHaveLength(1);
    });

    it('adds a new question next to existing ones', async () => {
      const s = await service.create({ title: 'S', questions: [allFive[2]] });
      const updated = await service.update(s.id, {
        title: 'S',
        questions: [
          { id: s.questions[0].id, text: 'Comments', type: QuestionType.TEXT },
          allFive[0],
        ],
      });
      expect(updated.questions.map((q) => q.position)).toEqual([0, 1]);
    });

    it('leaves questions untouched when none are supplied', async () => {
      const s = await service.create({ title: 'S', questions: allFive });
      const updated = await service.update(s.id, { title: 'Renamed' });
      expect(updated.title).toBe('Renamed');
      expect(updated.questions).toHaveLength(5);
    });

    it('rejects a question id from another survey (404) without writing', async () => {
      const a = await service.create({ title: 'A', questions: [allFive[2]] });
      const b = await service.create({ title: 'B', questions: [allFive[2]] });
      await expect(
        service.update(a.id, {
          title: 'A',
          questions: [{ id: b.questions[0].id, text: 'x', type: QuestionType.TEXT }],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(db.questions.rows).toHaveLength(2);
    });

    it('rejects duplicate question ids', async () => {
      const s = await service.create({ title: 'S', questions: [allFive[2]] });
      const id = s.questions[0].id;
      await expect(
        service.update(s.id, {
          title: 'S',
          questions: [
            { id, text: 'a', type: QuestionType.TEXT },
            { id, text: 'b', type: QuestionType.TEXT },
          ],
        }),
      ).rejects.toThrow('Duplicate');
    });

    it('rejects invalid configuration on update', async () => {
      const s = await service.create({ title: 'S' });
      await expect(
        service.update(s.id, {
          title: 'S',
          questions: [{ text: 'Rate', type: QuestionType.RATING, ratingMin: 3, ratingMax: 5 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws 404 for a missing survey', async () => {
      await expect(service.update(42, { title: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('refuses changes once the survey is no longer a draft (409)', async () => {
      const s = await service.create({ title: 'S', questions: [allFive[2]] });
      db.surveys.rows[0].status = 'Published';
      await expect(
        service.update(s.id, { title: 'S', questions: [] }),
      ).rejects.toThrow(ConflictException);
      expect(db.questions.rows).toHaveLength(1);
    });
  });
});
