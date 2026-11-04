import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeDb } from '../testing/fake-db';
import { QuestionType } from './question.entity';
import { SurveysService } from './surveys.service';

describe('SurveysService: mandatory flag and publishing', () => {
  let db: FakeDb;
  let service: SurveysService;

  beforeEach(() => {
    db = new FakeDb();
    service = new SurveysService(db.surveys as any, db.dataSource as any);
  });

  it('defaults new questions to optional', async () => {
    const s = await service.create({
      title: 'S',
      questions: [{ text: 'Q', type: QuestionType.TEXT }],
    });
    expect(s.questions[0].mandatory).toBe(false);
  });

  it.each([
    [QuestionType.SINGLE, { options: ['A', 'B'] }],
    [QuestionType.MULTIPLE, { options: ['A', 'B'] }],
    [QuestionType.TEXT, {}],
    [QuestionType.RATING, {}],
    [QuestionType.DROPDOWN, { options: ['A', 'B'] }],
  ])('persists mandatory=true for %s questions', async (type, extra) => {
    const s = await service.create({
      title: 'S',
      questions: [{ text: 'Q', type, mandatory: true, ...extra }],
    });
    const reloaded = await service.findOne(s.id);
    expect(reloaded.questions[0].mandatory).toBe(true);
  });

  it('stores an explicit mandatory=false', async () => {
    const s = await service.create({
      title: 'S',
      questions: [{ text: 'Q', type: QuestionType.TEXT, mandatory: false }],
    });
    expect(s.questions[0].mandatory).toBe(false);
  });

  it('preserves the mandatory flag when an edit does not mention it', async () => {
    const s = await service.create({
      title: 'S',
      questions: [{ text: 'Q', type: QuestionType.TEXT, mandatory: true }],
    });
    const updated = await service.update(s.id, {
      title: 'S',
      questions: [{ id: s.questions[0].id, text: 'Q (edited)', type: QuestionType.TEXT }],
    });
    expect(updated.questions[0]).toMatchObject({ text: 'Q (edited)', mandatory: true });
  });

  it('changes the flag when the edit sets it', async () => {
    const s = await service.create({
      title: 'S',
      questions: [{ text: 'Q', type: QuestionType.TEXT, mandatory: true }],
    });
    const updated = await service.update(s.id, {
      title: 'S',
      questions: [{ id: s.questions[0].id, text: 'Q', type: QuestionType.TEXT, mandatory: false }],
    });
    expect(updated.questions[0].mandatory).toBe(false);
  });

  it('keeps the flag when the type changes', async () => {
    const s = await service.create({
      title: 'S',
      questions: [{ text: 'Q', type: QuestionType.TEXT, mandatory: true }],
    });
    const updated = await service.update(s.id, {
      title: 'S',
      questions: [{ id: s.questions[0].id, text: 'Q', type: QuestionType.RATING }],
    });
    expect(updated.questions[0]).toMatchObject({ type: 'rating', mandatory: true });
  });

  describe('publish', () => {
    it('moves a draft with questions to Published', async () => {
      const s = await service.create({
        title: 'S',
        questions: [{ text: 'Q', type: QuestionType.TEXT }],
      });
      const published = await service.publish(s.id);
      expect(published.status).toBe('Published');
    });

    it('requires at least one question', async () => {
      const s = await service.create({ title: 'S' });
      await expect(service.publish(s.id)).rejects.toThrow(BadRequestException);
    });

    it('cannot publish twice (409)', async () => {
      const s = await service.create({
        title: 'S',
        questions: [{ text: 'Q', type: QuestionType.TEXT }],
      });
      await service.publish(s.id);
      await expect(service.publish(s.id)).rejects.toThrow(ConflictException);
    });

    it('throws 404 for a missing survey', async () => {
      await expect(service.publish(5)).rejects.toThrow(NotFoundException);
    });

    it('locks questions after publishing (409)', async () => {
      const s = await service.create({
        title: 'S',
        questions: [{ text: 'Q', type: QuestionType.TEXT }],
      });
      await service.publish(s.id);
      await expect(
        service.update(s.id, { title: 'S', questions: [] }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
