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
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../auth/access.decorators';
import type { AuthUser } from '../auth/auth.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { canManage } from '../auth/ownership';
import { UserRole } from '../users/user.entity';
import { CreateSurveyDto } from './create-survey.dto';
import { SurveyStatus } from './survey.entity';
import { ReorderQuestionsDto } from './reorder-questions.dto';
import { SurveysService } from './surveys.service';
import { UpdateSurveyDto } from './update-survey.dto';

/**
 * Survey management is for Creators and Administrators (SMS-15). Respondents get 403;
 * creators get 403 on surveys they do not own.
 */
@ApiTags('surveys')
@ApiCookieAuth()
@Roles(UserRole.CREATOR, UserRole.ADMIN)
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  create(@Body() dto: CreateSurveyDto, @CurrentUser() user: AuthUser) {
    return this.surveysService.create(dto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.surveysService.findAllFor(user);
  }

  /**
   * Public so respondents can open a published survey without an account.
   * Drafts and closed surveys are only visible to their owner or an administrator.
   */
  @Public()
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: AuthUser,
  ) {
    const survey = await this.surveysService.findOne(id);
    if (
      survey.status === SurveyStatus.PUBLISHED ||
      canManage(survey.ownerId ?? null, user)
    ) {
      return survey;
    }
    await this.surveysService.assertOwner(id, user);
    return survey;
  }

  @Post(':id/publish')
  @HttpCode(200)
  async publish(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.surveysService.assertOwner(id, user);
    return this.surveysService.publish(id);
  }

  @Post(':id/close')
  @HttpCode(200)
  close(@Param('id', ParseIntPipe) id: number) {
    return this.surveysService.close(id);
  }

  @Put(':id/questions/order')
  async reorderQuestions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReorderQuestionsDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.surveysService.assertOwner(id, user);
    return this.surveysService.reorderQuestions(id, dto.questionIds);
  }

  @Delete(':id/questions/:questionId')
  @HttpCode(204)
  async removeQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.surveysService.assertOwner(id, user);
    return this.surveysService.removeQuestion(id, questionId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSurveyDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.surveysService.assertOwner(id, user);
    return this.surveysService.update(id, dto);
  }
}
