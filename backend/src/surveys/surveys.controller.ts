import { Body, Controller, Post } from '@nestjs/common';
import { CreateSurveyDto } from './create-survey.dto';
import { SurveysService } from './surveys.service';

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  create(@Body() dto: CreateSurveyDto) {
    return this.surveysService.create(dto);
  }
}
