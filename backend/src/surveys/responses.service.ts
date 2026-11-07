import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Answer } from './answer.entity';
import { validateAnswers } from './answer-validation';
import type { AnswerValue } from './answer-validation';
import { SurveyResponse } from './response.entity';
import { SubmissionGuard } from './submission-guard.entity';
import { SubmitResponseDto } from './submit-response.dto';
import { Survey, SurveyStatus } from './survey.entity';
import {
  isExpired,
  isNotYetOpen,
  persistClosed,
  todayInSurveyTimezone,
} from './survey-lifecycle';

export const DUPLICATE_SUBMISSION = 'You have already submitted this survey.';

/**
 * Who is answering, for duplicate detection (SMS-27): the logged-in user's id,
 * otherwise the anonymous browser token from the respondent cookie.
 */
export interface RespondentIdentity {
  userId: number | null;
  browserToken: string | null;
}

/** Only a hash is stored, so the guard never holds a user id or token in clear text. */
export function fingerprintFor(who: RespondentIdentity): string | null {
  const raw =
    who.userId !== null
      ? `user:${who.userId}`
      : who.browserToken
        ? `browser:${who.browserToken}`
        : null;
  return raw ? createHash('sha256').update(raw).digest('hex') : null;
}

const isUniqueViolation = (err: unknown) =>
  typeof err === 'object' &&
  err !== null &&
  (err as { code?: string }).code === '23505';

@Injectable()
export class ResponsesService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepository: Repository<Survey>,
    private readonly dataSource: DataSource,
  ) {}

  async submit(
    surveyId: number,
    dto: SubmitResponseDto,
    respondentId: number | null = null,
    browserToken: string | null = null,
  ): Promise<{ id: number; submittedAt: Date }> {
    const survey = await this.surveyRepository.findOne({
      where: { id: surveyId },
      relations: { questions: true },
    });
    if (!survey) {
      throw new NotFoundException(`Survey ${surveyId} not found.`);
    }
    const today = todayInSurveyTimezone();
    if (isExpired(survey, today)) {
      // Automatic close: persist the transition, then reject like any closed survey.
      await persistClosed(this.surveyRepository, surveyId);
      survey.status = SurveyStatus.CLOSED;
    }
    if (survey.status !== SurveyStatus.PUBLISHED) {
      throw new ConflictException('This survey is not accepting responses.');
    }
    if (isNotYetOpen(survey, today)) {
      throw new ConflictException('This survey is not open yet.');
    }

    const fingerprint = survey.allowMultipleResponses
      ? null
      : fingerprintFor({ userId: respondentId, browserToken });
    if (fingerprint && (await this.alreadySubmitted(surveyId, fingerprint))) {
      throw new ConflictException(DUPLICATE_SUBMISSION);
    }

    const { answers, errors } = validateAnswers(survey.questions, dto.answers);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    // The response and its answers are written together or not at all.
    try {
      return await this.save(surveyId, respondentId, fingerprint, answers);
    } catch (err) {
      // Two submissions racing: the unique (surveyId, fingerprint) constraint stops the second.
      if (isUniqueViolation(err))
        throw new ConflictException(DUPLICATE_SUBMISSION);
      throw err;
    }
  }

  private async alreadySubmitted(
    surveyId: number,
    fingerprint: string,
  ): Promise<boolean> {
    const guard = await this.dataSource.transaction((manager) =>
      manager
        .getRepository(SubmissionGuard)
        .findOne({ where: { surveyId, fingerprint } }),
    );
    return guard !== null;
  }

  private save(
    surveyId: number,
    respondentId: number | null,
    fingerprint: string | null,
    answers: Record<string, AnswerValue>,
  ): Promise<{ id: number; submittedAt: Date }> {
    return this.dataSource.transaction(async (manager) => {
      if (fingerprint) {
        const guardRepo = manager.getRepository(SubmissionGuard);
        await guardRepo.save(guardRepo.create({ surveyId, fingerprint }));
      }
      const responseRepo = manager.getRepository(SurveyResponse);
      const answerRepo = manager.getRepository(Answer);
      const saved = await responseRepo.save(
        responseRepo.create({ surveyId, respondentId }),
      );
      for (const [questionId, value] of Object.entries(answers)) {
        await answerRepo.save(
          answerRepo.create({
            responseId: saved.id,
            questionId: Number(questionId),
            value,
          }),
        );
      }
      return { id: saved.id, submittedAt: saved.submittedAt };
    });
  }
}
