import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateSurveyDto } from './create-survey.dto';
import { QuestionInputDto } from './question.dto';
import { Question } from './question.entity';
import { NormalizedQuestion, normalizeQuestion } from './question-validation';
import { Survey, SurveyStatus } from './survey.entity';
import { UpdateSurveyDto } from './update-survey.dto';

interface PendingQuestion {
  id?: number;
  data: NormalizedQuestion;
}

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepository: Repository<Survey>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateSurveyDto): Promise<Survey> {
    this.assertDates(dto);
    const questions = this.prepareQuestions(dto.questions);

    const surveyId = await this.dataSource.transaction(async (manager) => {
      const surveyRepo = manager.getRepository(Survey);
      const saved = await surveyRepo.save(
        surveyRepo.create({
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          openDate: dto.openDate || null,
          closeDate: dto.closeDate || null,
          status: SurveyStatus.DRAFT,
        }),
      );
      await this.syncQuestions(manager, saved.id, questions);
      return saved.id;
    });

    return this.findOne(surveyId);
  }

  findAll(): Promise<Survey[]> {
    return this.surveyRepository.find({
      relations: { questions: true },
      order: { createdAt: 'DESC', questions: { position: 'ASC' } },
    });
  }

  async findOne(id: number): Promise<Survey> {
    const survey = await this.surveyRepository.findOne({
      where: { id },
      relations: { questions: true },
      order: { questions: { position: 'ASC' } },
    });
    if (!survey) {
      throw new NotFoundException(`Survey ${id} not found.`);
    }
    return survey;
  }

  async update(id: number, dto: UpdateSurveyDto): Promise<Survey> {
    this.assertDates(dto);
    const questions = dto.questions
      ? this.prepareQuestions(dto.questions)
      : undefined;

    await this.dataSource.transaction(async (manager) => {
      const surveyRepo = manager.getRepository(Survey);
      const survey = await surveyRepo.findOne({ where: { id } });
      if (!survey) {
        throw new NotFoundException(`Survey ${id} not found.`);
      }
      this.assertDraft(survey);

      survey.title = dto.title.trim();
      survey.description = dto.description?.trim() || null;
      survey.openDate = dto.openDate || null;
      survey.closeDate = dto.closeDate || null;
      await surveyRepo.save(survey);

      if (questions) {
        await this.syncQuestions(manager, id, questions);
      }
    });

    return this.findOne(id);
  }

  /** Deletes one question of a draft survey and closes the gap in the order. */
  async removeQuestion(surveyId: number, questionId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.loadDraft(manager, surveyId);
      const repo = manager.getRepository(Question);
      const all = await repo.find({ where: { surveyId } });
      const target = all.find((q) => q.id === questionId);
      if (!target) {
        throw new NotFoundException(
          `Question ${questionId} not found in survey ${surveyId}.`,
        );
      }
      await repo.remove(target);

      const rest = all
        .filter((q) => q.id !== questionId)
        .sort((a, b) => a.position - b.position);
      for (const [position, question] of rest.entries()) {
        if (question.position !== position) {
          question.position = position;
          await repo.save(question);
        }
      }
    });
  }

  /** Persists a new order. `questionIds` must list every question exactly once. */
  async reorderQuestions(
    surveyId: number,
    questionIds: number[],
  ): Promise<Question[]> {
    return this.dataSource.transaction(async (manager) => {
      await this.loadDraft(manager, surveyId);
      const repo = manager.getRepository(Question);
      const all = await repo.find({ where: { surveyId } });
      const known = new Set(all.map((q) => q.id));

      const sameSet =
        questionIds.length === all.length &&
        new Set(questionIds).size === questionIds.length &&
        questionIds.every((id) => known.has(id));
      if (!sameSet) {
        throw new BadRequestException(
          'questionIds must list every question of this survey exactly once.',
        );
      }

      for (const [position, id] of questionIds.entries()) {
        const question = all.find((q) => q.id === id) as Question;
        question.position = position;
        await repo.save(question);
      }
      return all.sort((a, b) => a.position - b.position);
    });
  }

  /** Moves a draft survey to Published. It needs at least one question. */
  async publish(id: number): Promise<Survey> {
    const survey = await this.findOne(id);
    if (survey.status !== SurveyStatus.DRAFT) {
      throw new ConflictException('This survey has already been published.');
    }
    if (survey.questions.length === 0) {
      throw new BadRequestException(
        'Add at least one question before publishing.',
      );
    }
    const row = await this.surveyRepository.findOne({ where: { id } });
    if (row) {
      row.status = SurveyStatus.PUBLISHED;
      await this.surveyRepository.save(row);
    }
    return this.findOne(id);
  }

  /** Questions may only change while the survey is a draft. */
  assertDraft(survey: Survey): void {
    if (survey.status !== SurveyStatus.DRAFT) {
      throw new ConflictException(
        'Questions can only be changed while the survey is a draft.',
      );
    }
  }

  private async loadDraft(
    manager: EntityManager,
    surveyId: number,
  ): Promise<Survey> {
    const survey = await manager
      .getRepository(Survey)
      .findOne({ where: { id: surveyId } });
    if (!survey) {
      throw new NotFoundException(`Survey ${surveyId} not found.`);
    }
    this.assertDraft(survey);
    return survey;
  }

  private assertDates(dto: CreateSurveyDto): void {
    if (dto.openDate && dto.closeDate && dto.closeDate < dto.openDate) {
      throw new BadRequestException(
        'Closing date cannot be earlier than opening date.',
      );
    }
  }

  private prepareQuestions(
    inputs: QuestionInputDto[] | undefined,
  ): PendingQuestion[] {
    const items = (inputs ?? []).map((input, index) => ({
      id: input.id,
      data: normalizeQuestion(input, `Question ${index + 1}`),
    }));
    const ids = items.filter((i) => i.id != null).map((i) => i.id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate question ids were supplied.');
    }
    return items;
  }

  /**
   * Makes the stored questions match `items`: updates by id, inserts new ones,
   * deletes the rest, and stores array order as `position`. All checks run
   * before any write so a bad id never leaves a half-applied change.
   */
  private async syncQuestions(
    manager: EntityManager,
    surveyId: number,
    items: PendingQuestion[],
  ): Promise<void> {
    const repo = manager.getRepository(Question);
    const existing = await repo.find({ where: { surveyId } });
    const existingIds = new Set(existing.map((q) => q.id));

    for (const item of items) {
      if (item.id != null && !existingIds.has(item.id)) {
        throw new NotFoundException(
          `Question ${item.id} does not belong to survey ${surveyId}.`,
        );
      }
    }

    const keep = new Set(items.filter((i) => i.id != null).map((i) => i.id));
    const removed = existing.filter((q) => !keep.has(q.id));
    if (removed.length > 0) {
      await repo.remove(removed);
    }

    for (const [position, item] of items.entries()) {
      const prior = existing.find((q) => q.id === item.id);
      await repo.save(
        repo.create({
          id: item.id,
          surveyId,
          position,
          ...item.data,
          mandatory: item.data.mandatory ?? prior?.mandatory ?? false,
        }),
      );
    }
  }
}
