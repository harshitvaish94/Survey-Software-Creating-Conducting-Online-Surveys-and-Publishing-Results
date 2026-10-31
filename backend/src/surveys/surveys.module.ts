import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './question.entity';
import { Survey } from './survey.entity';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';

@Module({
  imports: [TypeOrmModule.forFeature([Survey, Question])],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
