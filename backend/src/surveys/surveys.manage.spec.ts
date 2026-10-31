import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeDb } from '../testing/fake-db';
import { QuestionType } from './question.entity';
import { SurveysService } from './surveys.service';

describe('SurveysService: deleting and reordering draft questions', () => {
  let db: FakeDb;
  let service: SurveysService;
  let surveyId: number;
  let ids: number[];

  beforeEach(async () => {
    db = new FakeDb();
    service = new SurveysService(db.surveys as any, db.dataSource as any);
    const s = await service.create({
      title: 'S',
      questions: [
        { text: 'One', type: QuestionType.TEXT, mandatory: true },
        { text: 'Two', type: QuestionType.SINGLE, options: ['A', 'B'] },
        { text: 'Three', type: QuestionType.RATING },
      ],
    });
    surveyId = s.id;
    ids = s.questions.map((q) => q.id);
  });

  describe('removeQuestion', () => {
    it('deletes the question and compacts the remaining positions', async () => {
      await service.removeQuestion(surveyId, ids[0]);
      const s = await service.findOne(surveyId);
      expect(s.questions.map((q) => q.text)).toEqual(['Two', 'Three']);
      expect(s.questions.map((q) => q.position)).toEqual([0, 1]);
    });

    it('keeps settings of the surviving questions', async () => {
      await service.removeQuestion(surveyId, ids[2]);
      const s = await service.findOne(surveyId);
      expect(s.questions[0]).toMatchObject({ text: 'One', mandatory: true });
    });

    it('throws 404 for a question that does not exist', async () => {
      await expect(service.removeQuestion(surveyId, 999)).rejects.toThrow(NotFoundException);
      expect(db.questions.rows).toHaveLength(3);
    });

    it('throws 404 for a question of another survey', async () => {
      const other = await service.create({
        title: 'Other',
        questions: [{ text: 'X', type: QuestionType.TEXT }],
      });
      await expect(
        service.removeQuestion(surveyId, other.questions[0].id),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 404 for a missing survey', async () => {
      await expect(service.removeQuestion(404, ids[0])).rejects.toThrow(NotFoundException);
    });

    it('refuses to delete from a published survey (409)', async () => {
      await service.publish(surveyId);
      await expect(service.removeQuestion(surveyId, ids[0])).rejects.toThrow(ConflictException);
      expect(db.questions.rows).toHaveLength(3);
    });
  });

  describe('reorderQuestions', () => {
    it('persists the new order and returns it', async () => {
      const result = await service.reorderQuestions(surveyId, [ids[2], ids[0], ids[1]]);
      expect(result.map((q) => q.text)).toEqual(['Three', 'One', 'Two']);
      const reloaded = await service.findOne(surveyId);
      expect(reloaded.questions.map((q) => q.text)).toEqual(['Three', 'One', 'Two']);
      expect(reloaded.questions.map((q) => q.position)).toEqual([0, 1, 2]);
    });

    it('keeps every question setting when reordering', async () => {
      await service.reorderQuestions(surveyId, [ids[1], ids[2], ids[0]]);
      const reloaded = await service.findOne(surveyId);
      const one = reloaded.questions.find((q) => q.text === 'One');
      expect(one).toMatchObject({ mandatory: true, type: 'text' });
    });

    it.each([
      ['a missing id', (ids: number[]) => [ids[0], ids[1]]],
      ['a duplicate id', (ids: number[]) => [ids[0], ids[0], ids[1]]],
      ['an unknown id', (ids: number[]) => [ids[0], ids[1], 999]],
      ['an extra id', (ids: number[]) => [...ids, 999]],
      ['an empty list', () => []],
    ])('rejects %s (400) and changes nothing', async (_name, build) => {
      await expect(service.reorderQuestions(surveyId, build(ids))).rejects.toThrow(
        BadRequestException,
      );
      const s = await service.findOne(surveyId);
      expect(s.questions.map((q) => q.text)).toEqual(['One', 'Two', 'Three']);
    });

    it('throws 404 for a missing survey', async () => {
      await expect(service.reorderQuestions(404, ids)).rejects.toThrow(NotFoundException);
    });

    it('refuses to reorder a published survey (409)', async () => {
      await service.publish(surveyId);
      await expect(
        service.reorderQuestions(surveyId, [ids[2], ids[1], ids[0]]),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('editing is draft-only', () => {
    it('refuses to edit question text after publishing (409)', async () => {
      await service.publish(surveyId);
      await expect(
        service.update(surveyId, {
          title: 'S',
          questions: [{ id: ids[0], text: 'Changed', type: QuestionType.TEXT }],
        }),
      ).rejects.toThrow(ConflictException);
      expect(db.questions.rows.find((q) => q.id === ids[0])?.text).toBe('One');
    });
  });
});
