import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Answer } from './answer.entity';
import { Question } from './question.entity';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';
import { SurveyResponse } from './response.entity';
import { SubmissionGuard } from './submission-guard.entity';
import { Survey } from './survey.entity';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';

@Module({
  imports: [TypeOrmModule.forFeature([Survey, Question, SurveyResponse, Answer, SubmissionGuard])],
  controllers: [SurveysController, ResponsesController],
  providers: [SurveysService, ResponsesService],
  exports: [SurveysService],
})
export class SurveysModule {}
