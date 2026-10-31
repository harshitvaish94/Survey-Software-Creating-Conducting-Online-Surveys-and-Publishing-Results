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

  /** Questions may only change while the survey is a draft. */
  assertDraft(survey: Survey): void {
    if (survey.status !== SurveyStatus.DRAFT) {
      throw new ConflictException(
        'Questions can only be changed while the survey is a draft.',
      );
    }
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
      await repo.save(
        repo.create({ id: item.id, surveyId, position, ...item.data }),
      );
    }
  }
}
