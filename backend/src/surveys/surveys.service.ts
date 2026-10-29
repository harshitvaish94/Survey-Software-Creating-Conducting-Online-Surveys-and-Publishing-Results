import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSurveyDto } from './create-survey.dto';
import { Survey, SurveyStatus } from './survey.entity';

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepository: Repository<Survey>,
  ) {}

  async create(dto: CreateSurveyDto): Promise<Survey> {
    if (dto.openDate && dto.closeDate && dto.closeDate < dto.openDate) {
      throw new BadRequestException(
        'Closing date cannot be earlier than opening date.',
      );
    }

    const survey = this.surveyRepository.create({
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      openDate: dto.openDate || null,
      closeDate: dto.closeDate || null,
      status: SurveyStatus.DRAFT,
    });

    return this.surveyRepository.save(survey);
  }
}
