import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CreateSurveyDto } from './create-survey.dto';
import { SurveysService } from './surveys.service';
import { UpdateSurveyDto } from './update-survey.dto';

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  create(@Body() dto: CreateSurveyDto) {
    return this.surveysService.create(dto);
  }

  @Get()
  findAll() {
    return this.surveysService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.surveysService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSurveyDto) {
    return this.surveysService.update(id, dto);
  }
}
