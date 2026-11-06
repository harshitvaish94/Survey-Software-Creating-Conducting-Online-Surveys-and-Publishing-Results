import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { Public } from '../auth/access.decorators';
import type { AuthUser } from '../auth/auth.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { ResponsesService } from './responses.service';
import { SubmitResponseDto } from './submit-response.dto';

/** Anyone may answer a published survey; a logged-in respondent is recorded on the response. */
@Public()
@Controller('surveys/:surveyId/responses')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Post()
  @HttpCode(201)
  submit(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() dto: SubmitResponseDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.responsesService.submit(surveyId, dto, user?.id ?? null);
  }
}
