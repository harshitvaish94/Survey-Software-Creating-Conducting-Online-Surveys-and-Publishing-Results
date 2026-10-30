import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey } from '../survey/survey.entity';
import { Answer } from '../response/answer.entity';
import { QuestionType } from '../survey/question.entity';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(Survey)
    private surveyRepository: Repository<Survey>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
  ) {}

  async getConsolidatedResults(surveyId: string, userId: string) {
    const survey = await this.verifySurveyAuth(surveyId, userId);

    const totalResponses = await this.answerRepository
      .createQueryBuilder('answer')
      .innerJoin('answer.response', 'response')
      .where('response.surveyId = :surveyId', { surveyId })
      .select('COUNT(DISTINCT response.id)', 'count')
      .getRawOne();

    const resultsQuestions = [];

    for (const question of survey.questions) {
      const qResult: any = {
        id: question.id,
        type: question.type,
        prompt: question.prompt,
      };

      if ([QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN].includes(question.type)) {
        const counts = await this.answerRepository
          .createQueryBuilder('answer')
          .select('option.id', 'optionId')
          .addSelect('option.label', 'label')
          .addSelect('COUNT(answer.id)', 'count')
          .innerJoin('answer.selectedOptions', 'option')
          .where('answer.questionId = :questionId', { questionId: question.id })
          .groupBy('option.id')
          .addGroupBy('option.label')
          .getRawMany();

        const totalAns = counts.reduce((sum, curr) => sum + Number(curr.count), 0);
        qResult.counts = counts.map(c => ({
          label: c.label,
          count: Number(c.count),
          percent: totalAns > 0 ? Number(((Number(c.count) / totalAns) * 100).toFixed(2)) : 0,
        }));
      } else if (question.type === QuestionType.RATING_SCALE) {
        const ratingStats = await this.answerRepository
          .createQueryBuilder('answer')
          .select('AVG(answer.rating)', 'average')
          .addSelect('COUNT(answer.id)', 'total')
          .where('answer.questionId = :questionId', { questionId: question.id })
          .getRawOne();

        qResult.average = Number(ratingStats.average) || 0;
        qResult.totalRatings = Number(ratingStats.total) || 0;
      } else if (question.type === QuestionType.TEXT) {
        const textAnswers = await this.answerRepository.find({
          where: { question: { id: question.id } },
          select: ['textValue'],
        });
        qResult.textAnswers = textAnswers.map(a => a.textValue);
      }

      resultsQuestions.push(qResult);
    }
    
    return {
      surveyId: survey.id,
      title: survey.title,
      totalResponses: Number(totalResponses?.count || 0),
      questions: resultsQuestions,
    };
  }

  async exportResultsAsCsv(surveyId: string, userId: string): Promise<string> {
    const results = await this.getConsolidatedResults(surveyId, userId);
    
    let csvContent = 'Survey Title,Question Prompt,Question Type,Answer Option / Detail,Count / Value,Percentage / Average\n';

    results.questions.forEach((q) => {
      const cleanPrompt = `"${q.prompt.replace(/"/g, '""')}"`;
      
      if (q.counts && q.counts.length > 0) {
        q.counts.forEach((c) => {
          const cleanLabel = `"${c.label.replace(/"/g, '""')}"`;
          csvContent += `"${results.title.replace(/"/g, '""')}",${cleanPrompt},${q.type},${cleanLabel},${c.count},${c.percent}%\n`;
        });
      } else if (q.type === QuestionType.RATING_SCALE || q.average !== undefined) {
        csvContent += `"${results.title.replace(/"/g, '""')}",${cleanPrompt},${q.type},Average Rating,${q.average},Total Ratings: ${q.totalRatings}\n`;
      } else if (q.textAnswers && q.textAnswers.length > 0) {
        q.textAnswers.forEach((ans) => {
          const cleanAns = `"${String(ans).replace(/"/g, '""')}"`;
          csvContent += `"${results.title.replace(/"/g, '""')}",${cleanPrompt},${q.type},${cleanAns},1,\n`;
        });
      } else {
        csvContent += `"${results.title.replace(/"/g, '""')}",${cleanPrompt},${q.type},No Responses,0,0%\n`;
      }
    });

    return csvContent;
  }

  private async verifySurveyAuth(surveyId: string, userId: string) {
    const survey = await this.surveyRepository.findOne({
      where: { id: surveyId },
      relations: ['questions', 'questions.options'],
    });
    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.creatorId !== userId) throw new ForbiddenException('Access denied to survey results');
    return survey;
  }
}