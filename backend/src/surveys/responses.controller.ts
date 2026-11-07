import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { sessionCookieOptions } from '../auth/auth.constants';
import { Public } from '../auth/access.decorators';
import type { AuthUser } from '../auth/auth.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { ResponsesService } from './responses.service';
import { SubmitResponseDto } from './submit-response.dto';

/** Long-lived, HTTP-only random id for anonymous respondents (SMS-27 duplicate check). */
export const RESPONDENT_COOKIE = 'sms_respondent';
const RESPONDENT_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reuses the browser's respondent token, or issues a new one. */
export function respondentToken(req: Request, res: Response): string {
  const existing = (req.cookies as Record<string, string> | undefined)?.[
    RESPONDENT_COOKIE
  ];
  if (existing && UUID.test(existing)) return existing;
  const token = randomUUID();
  res.cookie(RESPONDENT_COOKIE, token, {
    ...sessionCookieOptions(),
    maxAge: RESPONDENT_COOKIE_MAX_AGE,
  });
  return token;
}

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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.responsesService.submit(
      surveyId,
      dto,
      user?.id ?? null,
      user ? null : respondentToken(req, res),
    );
  }
}
