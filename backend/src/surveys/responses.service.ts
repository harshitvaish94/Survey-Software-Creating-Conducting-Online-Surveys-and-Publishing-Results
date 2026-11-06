import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Answer } from './answer.entity';
import { validateAnswers } from './answer-validation';
import { SurveyResponse } from './response.entity';
import { SubmitResponseDto } from './submit-response.dto';
import { Survey, SurveyStatus } from './survey.entity';

@Injectable()
export class ResponsesService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepository: Repository<Survey>,
    private readonly dataSource: DataSource,
  ) {}

  async submit(
    surveyId: number,
    dto: SubmitResponseDto,
    respondentId: number | null = null,
  ): Promise<{ id: number; submittedAt: Date }> {
    const survey = await this.surveyRepository.findOne({
      where: { id: surveyId },
      relations: { questions: true },
    });
    if (!survey) {
      throw new NotFoundException(`Survey ${surveyId} not found.`);
    }
    if (survey.status !== SurveyStatus.PUBLISHED) {
      throw new ConflictException('This survey is not accepting responses.');
    }

    const { answers, errors } = validateAnswers(survey.questions, dto.answers);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    // The response and its answers are written together or not at all.
    return this.dataSource.transaction(async (manager) => {
      const responseRepo = manager.getRepository(SurveyResponse);
      const answerRepo = manager.getRepository(Answer);
      const saved = await responseRepo.save(
        responseRepo.create({ surveyId, respondentId }),
      );
      for (const [questionId, value] of Object.entries(answers)) {
        await answerRepo.save(
          answerRepo.create({
            responseId: saved.id,
            questionId: Number(questionId),
            value,
          }),
        );
      }
      return { id: saved.id, submittedAt: saved.submittedAt };
    });
  }
}
