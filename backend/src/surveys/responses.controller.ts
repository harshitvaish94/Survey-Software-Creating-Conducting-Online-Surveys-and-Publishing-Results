import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ResponsesService } from './responses.service';
import { SubmitResponseDto } from './submit-response.dto';

@Controller('surveys/:surveyId/responses')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Post()
  @HttpCode(201)
  submit(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() dto: SubmitResponseDto,
  ) {
    return this.responsesService.submit(surveyId, dto);
  }
}
