import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validateAnswers } from './answer-validation';
import { SurveyResponse } from './response.entity';
import { SubmitResponseDto } from './submit-response.dto';
import { Survey, SurveyStatus } from './survey.entity';

@Injectable()
export class ResponsesService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepository: Repository<Survey>,
    @InjectRepository(SurveyResponse)
    private readonly responseRepository: Repository<SurveyResponse>,
  ) {}

  async submit(
    surveyId: number,
    dto: SubmitResponseDto,
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

    const saved = await this.responseRepository.save(
      this.responseRepository.create({ surveyId, answers }),
    );
    return { id: saved.id, submittedAt: saved.submittedAt };
  }
}
