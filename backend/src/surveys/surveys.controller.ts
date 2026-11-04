import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CreateSurveyDto } from './create-survey.dto';
import { ReorderQuestionsDto } from './reorder-questions.dto';
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

  @Post(':id/publish')
  @HttpCode(200)
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.surveysService.publish(id);
  }

  @Put(':id/questions/order')
  reorderQuestions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReorderQuestionsDto,
  ) {
    return this.surveysService.reorderQuestions(id, dto.questionIds);
  }

  @Delete(':id/questions/:questionId')
  @HttpCode(204)
  removeQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    return this.surveysService.removeQuestion(id, questionId);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSurveyDto) {
    return this.surveysService.update(id, dto);
  }
}
