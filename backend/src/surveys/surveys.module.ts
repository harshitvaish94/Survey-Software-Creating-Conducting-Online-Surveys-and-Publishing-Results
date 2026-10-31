import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './question.entity';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';
import { SurveyResponse } from './response.entity';
import { Survey } from './survey.entity';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';

@Module({
  imports: [TypeOrmModule.forFeature([Survey, Question, SurveyResponse])],
  controllers: [SurveysController, ResponsesController],
  providers: [SurveysService, ResponsesService],
  exports: [SurveysService],
})
export class SurveysModule {}
